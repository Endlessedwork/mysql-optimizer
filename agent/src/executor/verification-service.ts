import { ExecutionRun, BaselineMetrics, AfterMetrics, VerificationResult, RollbackRecord } from '../types';
import { MysqlConnector } from '../mysql-connector';
import { Config } from '../config';
import { Logger } from '../logger';

export class VerificationService {
  private connector: MysqlConnector;
  private logger: Logger;
  private saasApiBaseUrl: string;

  // Thresholds สำหรับ verification
  private readonly LATENCY_DEGRADATION_THRESHOLD = 0.10; // 10%
  private readonly ROWS_EXAMINED_DEGRADATION_THRESHOLD = 0.20; // 20%
  private readonly MIN_SAMPLE_COUNT = 10;

  constructor() {
    const config = new Config();
    this.logger = new Logger();
    this.connector = new MysqlConnector(config, this.logger);
    this.saasApiBaseUrl = config.apiUrl;
  }

  async verify(
    executionRun: ExecutionRun,
    baselineMetrics: BaselineMetrics,
    afterMetrics: AfterMetrics
  ): Promise<VerificationResult> {
    try {
      await this.connector.connect();
      
      // ตรวจสอบว่า index ถูกสร้างจริงหรือไม่
      const indexExists = await this.checkIndexExists(
        executionRun.table_name,
        executionRun.index_name
      );
      
      if (!indexExists) {
        await this.connector.disconnect();
        return {
          status: 'failed',
          message: `Index ${executionRun.index_name} does not exist in table ${executionRun.table_name}`
        };
      }

      // คำนวณ total sample count
      const totalSampleCount = afterMetrics.query_metrics.reduce(
        (sum, m) => sum + m.sample_count, 0
      );

      // ถ้า sample count ต่ำเกินไป → inconclusive
      if (totalSampleCount < this.MIN_SAMPLE_COUNT) {
        await this.connector.disconnect();
        return {
          status: 'inconclusive',
          message: `Insufficient samples: ${totalSampleCount} < ${this.MIN_SAMPLE_COUNT}. Cannot determine impact.`,
          sample_count: totalSampleCount
        };
      }

      // เปรียบเทียบ metrics
      const comparison = this.compareMetrics(baselineMetrics, afterMetrics);

      await this.connector.disconnect();

      // ตรวจสอบ thresholds
      if (comparison.full_scan_increased) {
        return {
          status: 'failed',
          message: 'Full scan count increased after index addition',
          metrics_comparison: comparison,
          sample_count: totalSampleCount
        };
      }

      if (comparison.avg_latency_change_percent > this.LATENCY_DEGRADATION_THRESHOLD * 100) {
        return {
          status: 'failed',
          message: `Latency degraded by ${comparison.avg_latency_change_percent.toFixed(1)}% which exceeds threshold of ${this.LATENCY_DEGRADATION_THRESHOLD * 100}%`,
          metrics_comparison: comparison,
          sample_count: totalSampleCount
        };
      }

      if (comparison.rows_examined_change_percent > this.ROWS_EXAMINED_DEGRADATION_THRESHOLD * 100) {
        return {
          status: 'failed',
          message: `Rows examined increased by ${comparison.rows_examined_change_percent.toFixed(1)}% which exceeds threshold of ${this.ROWS_EXAMINED_DEGRADATION_THRESHOLD * 100}%`,
          metrics_comparison: comparison,
          sample_count: totalSampleCount
        };
      }

      return {
        status: 'success',
        message: `Index verification passed. Latency change: ${comparison.avg_latency_change_percent.toFixed(1)}%, Rows examined change: ${comparison.rows_examined_change_percent.toFixed(1)}%`,
        metrics_comparison: comparison,
        sample_count: totalSampleCount
      };
      
    } catch (error) {
      this.logger.error('Error during verification', error);
      try {
        await this.connector.disconnect();
      } catch {}
      
      return {
        status: 'failed',
        message: `Verification error: ${error.message}`
      };
    }
  }

  private compareMetrics(
    baseline: BaselineMetrics,
    after: AfterMetrics
  ): { avg_latency_change_percent: number; rows_examined_change_percent: number; full_scan_increased: boolean } {
    let baselineLatencySum = 0;
    let afterLatencySum = 0;
    let baselineRowsSum = 0;
    let afterRowsSum = 0;
    let baselineFullScans = 0;
    let afterFullScans = 0;

    // Aggregate baseline metrics
    for (const m of baseline.query_metrics) {
      baselineLatencySum += m.avg_latency_ms * m.count_star;
      baselineRowsSum += m.rows_examined;
      baselineFullScans += m.full_scan_count;
    }

    // Aggregate after metrics
    for (const m of after.query_metrics) {
      afterLatencySum += m.avg_latency_ms * m.count_star;
      afterRowsSum += m.rows_examined;
      afterFullScans += m.full_scan_count;
    }

    // Calculate percentage changes - positive = degradation
    const latencyChange = baselineLatencySum > 0
      ? ((afterLatencySum - baselineLatencySum) / baselineLatencySum) * 100
      : 0;
    
    const rowsChange = baselineRowsSum > 0
      ? ((afterRowsSum - baselineRowsSum) / baselineRowsSum) * 100
      : 0;

    return {
      avg_latency_change_percent: latencyChange,
      rows_examined_change_percent: rowsChange,
      full_scan_increased: afterFullScans > baselineFullScans
    };
  }

  async rollback(
    executionRun: ExecutionRun,
    triggerReason: string
  ): Promise<void> {
    try {
      await this.connector.connect();
      
      const rollbackSql = `ALTER TABLE \`${executionRun.table_name}\` DROP INDEX \`${executionRun.index_name}\``;
      
      this.logger.info(`Executing rollback: ${rollbackSql}`);
      
      // Execute DROP INDEX
      await this.connector.executeQuery(rollbackSql);
      
      this.logger.info(`Successfully rolled back index ${executionRun.index_name}`);
      
      await this.connector.disconnect();

      // บันทึก rollback record ผ่าน SaaS API
      await this.recordRollback({
        execution_run_id: executionRun.id,
        rollback_type: 'auto',
        trigger_reason: triggerReason,
        rollback_sql: rollbackSql,
        status: 'completed',
        created_at: new Date()
      });
      
    } catch (error) {
      this.logger.error('Error during rollback', error);
      try {
        await this.connector.disconnect();
      } catch {}
      
      // บันทึก failed rollback
      try {
        await this.recordRollback({
          execution_run_id: executionRun.id,
          rollback_type: 'auto',
          trigger_reason: triggerReason,
          rollback_sql: `ALTER TABLE \`${executionRun.table_name}\` DROP INDEX \`${executionRun.index_name}\``,
          status: 'failed',
          created_at: new Date()
        });
      } catch {}
      
      throw error;
    }
  }

  private async recordRollback(record: RollbackRecord): Promise<void> {
    try {
      const response = await fetch(`${this.saasApiBaseUrl}/api/rollbacks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        this.logger.error(`Failed to record rollback: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error recording rollback to SaaS API', error);
    }
  }

  private async checkIndexExists(tableName: string, indexName: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
    `;
    
    try {
      const results = await this.connector.executeQuery(query, [tableName, indexName]);
      return results[0]?.count > 0;
    } catch (error) {
      this.logger.error('Error checking index existence', error);
      return false;
    }
  }
}