import { ExecutionRun, ExecutionStatus, AuditLogEntry, VerificationResult } from '../types';
import { Logger } from '../logger';
import { Config } from '../config';

export class ExecutionLogger {
  private logger: Logger;
  private saasApiBaseUrl: string;

  constructor() {
    this.logger = new Logger();
    const config = new Config();
    this.saasApiBaseUrl = config.apiUrl;
  }

  async logStatusChange(
    executionRun: ExecutionRun,
    oldStatus: ExecutionStatus,
    newStatus: ExecutionStatus,
    details: Record<string, any> = {}
  ): Promise<void> {
    this.logger.info(`Status change: ${oldStatus} -> ${newStatus}`, {
      execution_run_id: executionRun.id,
      old_status: oldStatus,
      new_status: newStatus,
      ...details
    });

    // Audit ผ่าน SaaS API
    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'status_change',
      old_status: oldStatus,
      new_status: newStatus,
      details,
      timestamp: new Date()
    });
  }

  async logExecutionStart(executionRun: ExecutionRun): Promise<void> {
    await this.logStatusChange(executionRun, 'scheduled', 'running', {
      action: executionRun.action,
      table_name: executionRun.table_name,
      index_name: executionRun.index_name
    });
  }

  async logBaselineMetricsCollected(executionRun: ExecutionRun, metrics: any): Promise<void> {
    this.logger.info('Baseline metrics collected', {
      execution_run_id: executionRun.id,
      metrics_count: metrics.query_metrics?.length || 0
    });

    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'baseline_metrics_collected',
      details: { metrics_count: metrics.query_metrics?.length || 0 },
      timestamp: new Date()
    });
  }

  async logIndexAdded(executionRun: ExecutionRun, indexName: string, sql: string): Promise<void> {
    this.logger.info('Index added successfully', {
      execution_run_id: executionRun.id,
      table_name: executionRun.table_name,
      index_name: indexName
    });

    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'index_added',
      details: {
        table_name: executionRun.table_name,
        index_name: indexName,
        sql
      },
      timestamp: new Date()
    });
  }

  async logAfterMetricsCollected(executionRun: ExecutionRun, metrics: any): Promise<void> {
    this.logger.info('After metrics collected', {
      execution_run_id: executionRun.id,
      metrics_count: metrics.query_metrics?.length || 0,
      window_minutes: metrics.window_minutes
    });

    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'after_metrics_collected',
      details: {
        metrics_count: metrics.query_metrics?.length || 0,
        window_minutes: metrics.window_minutes
      },
      timestamp: new Date()
    });
  }

  async logVerificationResult(executionRun: ExecutionRun, result: VerificationResult): Promise<void> {
    this.logger.info('Verification completed', {
      execution_run_id: executionRun.id,
      status: result.status,
      message: result.message
    });

    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'verification_completed',
      details: {
        status: result.status,
        message: result.message,
        metrics_comparison: result.metrics_comparison,
        sample_count: result.sample_count
      },
      timestamp: new Date()
    });
  }

  async logRollback(executionRun: ExecutionRun, reason: string): Promise<void> {
    await this.logStatusChange(executionRun, 'running', 'rolled_back', {
      reason,
      table_name: executionRun.table_name,
      index_name: executionRun.index_name
    });
  }

  async logExecutionCompleted(executionRun: ExecutionRun): Promise<void> {
    await this.logStatusChange(executionRun, 'running', 'completed', {
      action: executionRun.action,
      table_name: executionRun.table_name,
      index_name: executionRun.index_name
    });
  }

  async logExecutionFailed(
    executionRun: ExecutionRun,
    error: any,
    failReason: string
  ): Promise<void> {
    this.logger.error('Execution failed', {
      execution_run_id: executionRun.id,
      action: executionRun.action,
      error: error?.message || error,
      fail_reason: failReason,
      stack: error?.stack
    });

    await this.logStatusChange(executionRun, 'running', 'failed', {
      error: error?.message || String(error),
      fail_reason: failReason
    });
  }

  async logScopeViolation(executionRun: ExecutionRun): Promise<void> {
    this.logger.error('Scope violation: action not allowed', {
      execution_run_id: executionRun.id,
      action: executionRun.action
    });

    await this.logStatusChange(executionRun, 'scheduled', 'failed', {
      fail_reason: 'out_of_scope',
      action: executionRun.action
    });
  }

  async logClaimFailed(executionRun: ExecutionRun, reason: string): Promise<void> {
    this.logger.error('Failed to claim execution', {
      execution_run_id: executionRun.id,
      reason
    });

    await this.sendAuditLog({
      execution_run_id: executionRun.id,
      action: 'claim_failed',
      details: { reason },
      timestamp: new Date()
    });
  }

  private async sendAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      const response = await fetch(`${this.saasApiBaseUrl}/api/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        this.logger.error(`Failed to send audit log: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error sending audit log to SaaS API', error);
    }
  }
}