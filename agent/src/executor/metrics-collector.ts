import { MysqlConnector } from '../mysql-connector';
import { Config } from '../config';
import { Logger } from '../logger';
import { BaselineMetrics, AfterMetrics, QueryMetrics } from '../types';

export class MetricsCollector {
  private connector: MysqlConnector;
  private logger: Logger;

  constructor() {
    const config = new Config();
    this.logger = new Logger();
    this.connector = new MysqlConnector(config, this.logger);
  }

  async collectBaselineMetrics(
    tableName: string,
    queryDigests: string[]
  ): Promise<BaselineMetrics> {
    try {
      await this.connector.connect();
      
      const queryMetrics = await this.getQueryMetricsForDigests(queryDigests);
      
      await this.connector.disconnect();
      
      return {
        timestamp: new Date().toISOString(),
        table_name: tableName,
        query_metrics: queryMetrics
      };
    } catch (error) {
      this.logger.error('Error collecting baseline metrics', error);
      try {
        await this.connector.disconnect();
      } catch {}
      throw error;
    }
  }

  async collectAfterMetrics(
    tableName: string,
    queryDigests: string[],
    windowMinutes: 5 | 30
  ): Promise<AfterMetrics> {
    try {
      await this.connector.connect();
      
      const queryMetrics = await this.getQueryMetricsForDigests(queryDigests);
      
      await this.connector.disconnect();
      
      return {
        timestamp: new Date().toISOString(),
        table_name: tableName,
        query_metrics: queryMetrics,
        window_minutes: windowMinutes
      };
    } catch (error) {
      this.logger.error('Error collecting after metrics', error);
      try {
        await this.connector.disconnect();
      } catch {}
      throw error;
    }
  }

  private async getQueryMetricsForDigests(digests: string[]): Promise<QueryMetrics[]> {
    if (digests.length === 0) {
      return [];
    }

    const placeholders = digests.map(() => '?').join(',');
    const query = `
      SELECT
        DIGEST as digest,
        DIGEST_TEXT as digest_text,
        COUNT_STAR as count_star,
        ROUND(AVG_TIMER_WAIT / 1000000000, 2) as avg_latency_ms,
        SUM_ROWS_EXAMINED as rows_examined,
        SUM(CASE WHEN ROWS_EXAMINED > ROWS_SENT * 100 THEN 1 ELSE 0 END) as full_scan_count,
        COUNT_STAR as sample_count
      FROM performance_schema.events_statements_summary_by_digest
      WHERE DIGEST IN (${placeholders})
    `;
    
    const results = await this.connector.executeQuery(query, digests);
    
    return results.map((row: any) => ({
      digest: row.digest,
      digest_text: row.digest_text,
      count_star: row.count_star || 0,
      avg_latency_ms: row.avg_latency_ms || 0,
      rows_examined: row.rows_examined || 0,
      full_scan_count: row.full_scan_count || 0,
      sample_count: row.sample_count || 0
    }));
  }
}