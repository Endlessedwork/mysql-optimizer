import { Logger } from './logger';
import { MysqlConnector } from './mysql-connector';
import { Config } from './config';
import { QueryAnalyzer } from './query-analyzer';
import { ImpactAnalyzer } from './impact-analyzer';
import { RecommendationPackGenerator } from './recommendation-pack-generator';
import * as apiClient from './utils/api-client';

/**
 * ScanPoller polls the API for pending scan runs and processes them.
 * This allows the UI to request scans and the agent to pick them up.
 */
export class ScanPoller {
  private logger: Logger;
  private running: boolean = false;
  private pollIntervalMs: number;

  constructor() {
    this.logger = new Logger();
    this.pollIntervalMs = parseInt(process.env.SCAN_POLL_INTERVAL_MS || '10000', 10); // Default: 10 seconds
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('Starting Scan Poller');

    while (this.running) {
      try {
        await this.pollAndProcess();
      } catch (error) {
        this.logger.error('Scan Poller error', error);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Scan Poller');
    this.running = false;
  }

  private async pollAndProcess(): Promise<void> {
    // Check kill switch first
    try {
      const killSwitch = await apiClient.getKillSwitchStatus();
      if (killSwitch.global) {
        this.logger.warn('Global kill switch is active, skipping scan poll');
        return;
      }
    } catch (error) {
      this.logger.warn('Failed to check kill switch, proceeding with caution', error);
    }

    // Get all pending scan runs
    let pendingScans: apiClient.ScanRun[];
    try {
      pendingScans = await apiClient.getScanRuns({ status: 'pending' });
    } catch (error) {
      this.logger.warn('Failed to fetch pending scans', error);
      return;
    }

    if (pendingScans.length === 0) {
      return; // Nothing to do
    }

    this.logger.info(`Found ${pendingScans.length} pending scan(s)`);

    // Process each pending scan
    for (const scan of pendingScans) {
      if (!this.running) break;

      try {
        await this.processScan(scan);
      } catch (error) {
        this.logger.error(`Failed to process scan ${scan.id}`, error);
        // Mark as failed
        try {
          await apiClient.updateScanRunStatus(scan.id, 'failed', String(error));
        } catch (e) {
          this.logger.warn('Failed to update scan status to failed', e);
        }
      }
    }
  }

  private async processScan(scan: apiClient.ScanRun): Promise<void> {
    this.logger.info(`Processing scan ${scan.id} for connection ${scan.connectionProfileId}`);

    // Mark as running
    await apiClient.updateScanRunStatus(scan.id, 'running');

    // Get connection credentials
    let credentials: apiClient.ConnectionCredentials;
    try {
      credentials = await apiClient.getConnectionCredentials(scan.connectionProfileId);
    } catch (error) {
      throw new Error(`Failed to get connection credentials: ${error}`);
    }

    // Create config with dynamic credentials
    const config = new Config();
    config.mysqlHost = credentials.host;
    config.mysqlPort = credentials.port;
    config.mysqlUser = credentials.username;
    config.mysqlPassword = credentials.password;
    config.mysqlDatabase = credentials.databaseName || '';

    // Create MySQL connector with dynamic config
    const mysqlConnector = new MysqlConnector(config, this.logger);

    try {
      // Connect
      this.logger.info(`Connecting to MySQL at ${credentials.host}:${credentials.port}`);
      await mysqlConnector.connect();

      // Run the scan
      await this.runScan(scan.id, mysqlConnector, config);

      // Mark as completed
      await apiClient.updateScanRunStatus(scan.id, 'completed');
      this.logger.info(`Scan ${scan.id} completed successfully`);

    } finally {
      // Always disconnect
      try {
        await mysqlConnector.disconnect();
      } catch (e) {
        this.logger.warn('Failed to disconnect from MySQL', e);
      }
    }
  }

  private async runScan(scanRunId: string, mysqlConnector: MysqlConnector, config: Config): Promise<void> {
    // 1. Collect schema information
    this.logger.info('Collecting schema information...');
    const tables = await mysqlConnector.getTableInfo();
    const columns = await mysqlConnector.getColumnInfo();
    const indexes = await mysqlConnector.getIndexInfo();
    const schemaObjects = await mysqlConnector.getSchemaObjects();

    this.logger.info(`Found ${tables.length} tables, ${columns.length} columns, ${indexes.length} indexes`);

    // 2. Collect advanced statistics
    this.logger.info('Collecting advanced statistics...');
    const tableStats = await mysqlConnector.getTableStatistics();
    const indexUsage = await mysqlConnector.getIndexUsageStats();
    const indexCardinality = await mysqlConnector.getIndexCardinality();
    const slowQueries = await mysqlConnector.getSlowQueryAnalysis();
    const missingIndexes = await mysqlConnector.detectMissingIndexes();
    const foreignKeys = await mysqlConnector.getForeignKeys();
    const lockStats = await mysqlConnector.getLockStats();

    this.logger.info(`Advanced stats: ${tableStats.length} table stats, ${indexUsage.length} index usage records`);

    // 3. Submit schema snapshot to API
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
        tableStats,
        indexUsage,
        indexCardinality,
        foreignKeys,
        lockStats,
      });
      this.logger.info('Schema snapshot submitted');
    } catch (error) {
      this.logger.warn('Failed to submit schema snapshot', error);
    }

    // 4. Collect query digests
    this.logger.info('Collecting query digests...');
    const queryDigests = await mysqlConnector.getQueryDigest();
    this.logger.info(`Found ${queryDigests.length} query digests`);

    // Submit query digests to API
    if (queryDigests.length > 0) {
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
        this.logger.info('Query digests submitted');
      } catch (error) {
        this.logger.warn('Failed to submit query digests', error);
      }
    }

    // 5. Get EXPLAIN plans for top queries
    this.logger.info(`Analyzing top ${config.topNQueries} queries...`);
    const explainPlans = await mysqlConnector.getExplainPlans(config.topNQueries);
    this.logger.info(`Generated ${explainPlans.length} EXPLAIN plans`);

    // 6. Analyze queries
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

    // 7. Analyze impact
    this.logger.info('Analyzing impact of potential changes...');
    const impactAnalyzer = new ImpactAnalyzer(tables, queryDigests, schemaObjects);
    const impactReport = impactAnalyzer.generateImpactReport();

    // 8. Generate recommendation pack
    this.logger.info('Generating recommendation pack...');
    const packGenerator = new RecommendationPackGenerator(findings, impactReport, tables);
    const recommendationPack = packGenerator.generatePack();
    this.logger.info(`Generated ${recommendationPack.recommendations.length} recommendations`);

    // 9. Submit recommendations to API
    if (recommendationPack.recommendations.length > 0) {
      try {
        await apiClient.submitRecommendations(scanRunId, recommendationPack.recommendations);
        this.logger.info('Recommendations submitted');
      } catch (error) {
        this.logger.warn('Failed to submit recommendations', error);
      }
    }

    // Log summary
    this.logger.info('=== Scan Summary ===');
    this.logger.info(`Tables: ${tables.length}`);
    this.logger.info(`Query Digests: ${queryDigests.length}`);
    this.logger.info(`Findings: ${findings.length}`);
    this.logger.info(`Recommendations: ${recommendationPack.recommendations.length}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
