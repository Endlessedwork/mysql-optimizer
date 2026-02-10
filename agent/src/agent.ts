import { Config } from './config';
import { Logger } from './logger';
import { Telemetry } from './telemetry';
import { MysqlConnector } from './mysql-connector';
import { QueryAnalyzer } from './query-analyzer';
import { ImpactAnalyzer } from './impact-analyzer';
import { RecommendationPackGenerator } from './recommendation-pack-generator';
import * as apiClient from './utils/api-client';

export class Agent {
  private config: Config;
  private logger: Logger;
  private telemetry: Telemetry;
  private mysqlConnector: MysqlConnector;
  private connectionProfileId: string;
  private agentId: string;

  constructor() {
    this.config = new Config();
    this.logger = new Logger();
    this.telemetry = new Telemetry();
    this.mysqlConnector = new MysqlConnector(this.config, this.logger);
    this.connectionProfileId = process.env.CONNECTION_PROFILE_ID || '';
    this.agentId = process.env.AGENT_ID || `agent-${Date.now()}`;
  }

  async run() {
    this.logger.info('Starting MySQL Production Optimizer Agent');
    
    try {
      // Check kill switch before starting
      const killSwitch = await this.checkKillSwitch();
      if (killSwitch) {
        this.logger.warn('Kill switch is active. Agent will not execute.');
        return;
      }

      await this.connect();
      await this.scan();
      await this.disconnect();
      this.logger.info('Agent scan completed successfully');
    } catch (error) {
      this.logger.error('Agent execution failed', error);
      throw error;
    }
  }

  private async checkKillSwitch(): Promise<boolean> {
    try {
      const status = await apiClient.getKillSwitchStatus();
      return status.global;
    } catch (error) {
      this.logger.warn('Failed to check kill switch status, proceeding with caution', error);
      return false;
    }
  }

  private async connect() {
    this.logger.info('Connecting to MySQL database');
    await this.mysqlConnector.connect();
  }

  private async scan() {
    this.logger.info('Starting database scan');
    
    // Use pending scan run from UI if any, else create new run
    let scanRunId: string | null = null;
    
    try {
      if (this.connectionProfileId) {
        const pending = await apiClient.getScanRuns({
          connectionProfileId: this.connectionProfileId,
          status: 'pending',
        });
        if (pending.length > 0) {
          scanRunId = pending[0].id;
          await apiClient.updateScanRunStatus(scanRunId, 'running');
          this.logger.info(`Using requested scan run: ${scanRunId}`);
        } else {
          const scanRun = await apiClient.createScanRun(this.connectionProfileId);
          scanRunId = scanRun.id;
          await apiClient.updateScanRunStatus(scanRunId, 'running');
          this.logger.info(`Scan run created: ${scanRunId}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to create/claim scan run in API, continuing offline', error);
    }

    try {
      // 1. Collect schema information
      this.logger.info('Collecting schema information...');
      const tables = await this.mysqlConnector.getTableInfo();
      const columns = await this.mysqlConnector.getColumnInfo();
      const indexes = await this.mysqlConnector.getIndexInfo();
      const schemaObjects = await this.mysqlConnector.getSchemaObjects();
      
      this.logger.info(`Found ${tables.length} tables, ${columns.length} columns, ${indexes.length} indexes`);

      // 1.5 Collect advanced statistics (ใหม่)
      this.logger.info('Collecting advanced statistics...');
      const tableStats = await this.mysqlConnector.getTableStatistics();
      const indexUsage = await this.mysqlConnector.getIndexUsageStats();
      const indexCardinality = await this.mysqlConnector.getIndexCardinality();
      const slowQueries = await this.mysqlConnector.getSlowQueryAnalysis();
      const missingIndexes = await this.mysqlConnector.detectMissingIndexes();
      const foreignKeys = await this.mysqlConnector.getForeignKeys();
      const lockStats = await this.mysqlConnector.getLockStats();
      
      this.logger.info(`Advanced stats: ${tableStats.length} table stats, ${indexUsage.length} index usage records, ${slowQueries.length} slow queries`);
      
      // 2. Submit schema snapshot to API
      if (scanRunId) {
        try {
          await apiClient.submitSchemaSnapshot(scanRunId, {
            tables,
            columns,
            indexes,
            views: schemaObjects.views || [],
            procedures: schemaObjects.procedures || [],
            functions: schemaObjects.functions || [],
            triggers: schemaObjects.triggers || [],
            events: schemaObjects.events || [],
            // Include advanced stats
            tableStats,
            indexUsage,
            indexCardinality,
            foreignKeys,
            lockStats,
          });
          this.logger.info('Schema snapshot submitted to API');
        } catch (error) {
          this.logger.warn('Failed to submit schema snapshot', error);
        }
      }

      // 3. Collect query digests
      this.logger.info('Collecting query digests...');
      const queryDigests = await this.mysqlConnector.getQueryDigest();
      this.logger.info(`Found ${queryDigests.length} query digests`);
      
      // Submit query digests to API
      if (scanRunId && queryDigests.length > 0) {
        try {
          const formattedDigests = queryDigests.map(d => ({
            digest: d.DIGEST,
            digestText: d.DIGEST_TEXT,
            countStar: d.COUNT_STAR,
            sumTimerWait: d.SUM_TIMER_WAIT,
            avgTimerWait: d.AVG_TIMER_WAIT,
            sumRowsExamined: d.SUM_ROWS_EXAMINED,
            avgRowsExamined: d.AVG_ROWS_EXAMINED,
            sumRowsSent: d.SUM_ROWS_SENT,
            avgRowsSent: d.AVG_ROWS_SENT,
          }));
          await apiClient.submitQueryDigests(scanRunId, formattedDigests);
          this.logger.info('Query digests submitted to API');
        } catch (error) {
          this.logger.warn('Failed to submit query digests', error);
        }
      }

      // 4. Get EXPLAIN plans for top queries
      this.logger.info(`Analyzing top ${this.config.topNQueries} queries...`);
      const explainPlans = await this.mysqlConnector.getExplainPlans(this.config.topNQueries);
      this.logger.info(`Generated ${explainPlans.length} EXPLAIN plans`);

      // 5. Analyze queries with advanced statistics (อัปเดต)
      this.logger.info('Analyzing queries for optimization opportunities...');
      const queryAnalyzer = new QueryAnalyzer(queryDigests, explainPlans, tables, {
        tableStats,
        indexUsage,
        indexCardinality,
        slowQueries,
        missingIndexes,
      });
      const findings = queryAnalyzer.analyze();
      this.logger.info(`Found ${findings.length} potential optimization opportunities`);

      // 6. Analyze impact
      this.logger.info('Analyzing impact of potential changes...');
      const impactAnalyzer = new ImpactAnalyzer(tables, queryDigests, schemaObjects);
      const impactReport = impactAnalyzer.generateImpactReport();

      // 7. Generate recommendation pack
      this.logger.info('Generating recommendation pack...');
      const packGenerator = new RecommendationPackGenerator(findings, impactReport, tables);
      const recommendationPack = packGenerator.generatePack();
      this.logger.info(`Generated ${recommendationPack.recommendations.length} recommendations`);

      // 8. Submit recommendations to API
      if (scanRunId && recommendationPack.recommendations.length > 0) {
        try {
          await apiClient.submitRecommendations(scanRunId, recommendationPack.recommendations);
          this.logger.info('Recommendations submitted to API');
        } catch (error) {
          this.logger.warn('Failed to submit recommendations', error);
        }
      }

      // 9. Mark scan as completed
      if (scanRunId) {
        await apiClient.updateScanRunStatus(scanRunId, 'completed');
        this.logger.info('Scan run marked as completed');
      }

      // Log summary
      this.logger.info('=== Scan Summary ===');
      this.logger.info(`Tables: ${tables.length}`);
      this.logger.info(`Query Digests: ${queryDigests.length}`);
      this.logger.info(`Findings: ${findings.length}`);
      this.logger.info(`Recommendations: ${recommendationPack.recommendations.length}`);
      this.logger.info(`  - High severity: ${recommendationPack.metadata.summary.high_severity}`);
      this.logger.info(`  - Medium severity: ${recommendationPack.metadata.summary.medium_severity}`);
      this.logger.info(`  - Low severity: ${recommendationPack.metadata.summary.low_severity}`);

    } catch (error) {
      // Mark scan as failed in API
      if (scanRunId) {
        try {
          await apiClient.updateScanRunStatus(scanRunId, 'failed', String(error));
        } catch (apiError) {
          this.logger.warn('Failed to update scan run status', apiError);
        }
      }
      throw error;
    }
  }

  private async disconnect() {
    this.logger.info('Disconnecting from MySQL database');
    await this.mysqlConnector.disconnect();
  }
}