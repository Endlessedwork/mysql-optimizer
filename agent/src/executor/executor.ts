import { ExecutionRun, VerificationResult } from '../types';
import { KillSwitchChecker } from './kill-switch-checker';
import { MetricsCollector } from './metrics-collector';
import { IndexExecutor } from './index-executor';
import { VerificationService } from './verification-service';
import { ExecutionLogger } from './execution-logger';
import { Config } from '../config';
import { Logger } from '../logger';
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';
import { authHeaders } from '../utils/api-client';

export class Executor {
  private killSwitchChecker: KillSwitchChecker;
  private metricsCollector: MetricsCollector;
  private indexExecutor: IndexExecutor;
  private verificationService: VerificationService;
  private executionLogger: ExecutionLogger;
  private saasApiBaseUrl: string;
  private logger: Logger;

  constructor() {
    this.killSwitchChecker = new KillSwitchChecker();
    this.metricsCollector = new MetricsCollector();
    this.indexExecutor = new IndexExecutor();
    this.verificationService = new VerificationService();
    this.executionLogger = new ExecutionLogger();
    const config = new Config();
    this.saasApiBaseUrl = config.apiUrl;
    this.logger = new Logger();
  }

  async execute(executionRun: ExecutionRun): Promise<void> {
    try {
      // 1. Scope Validation - reject action ที่ไม่ใช่ ADD_INDEX
      if (executionRun.action !== 'ADD_INDEX') {
        await this.executionLogger.logScopeViolation(executionRun);
        await this.updateExecutionStatus(executionRun.id, 'failed', 'out_of_scope');
        throw new Error(`Action '${executionRun.action}' is out of scope. Only ADD_INDEX is supported.`);
      }

      // Validate all identifiers in the execution run
      try {
        validateIdentifier(executionRun.table_name);
        validateIdentifier(executionRun.index_name);
        validateIdentifiers(executionRun.columns);
      } catch (validationError) {
        await this.executionLogger.logExecutionFailed(executionRun, validationError, 'validation_error');
        await this.updateExecutionStatus(executionRun.id, 'failed', 'validation_error');
        throw new Error(`Input validation failed: ${(validationError as Error).message}`);
      }

      // Validate execution ID format (UUID)
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(executionRun.id)) {
        throw new Error(`Invalid execution ID format: ${executionRun.id}`);
      }

      // 2. Atomic Job Claim - ต้อง claim ก่อนทำงาน
      const claimed = await this.claimExecution(executionRun.id);
      if (!claimed) {
        await this.executionLogger.logClaimFailed(executionRun, 'Claim rejected or API error');
        throw new Error('Failed to claim execution. Aborting.');
      }

      // 3. Log execution start
      await this.executionLogger.logExecutionStart(executionRun);

      // 4. Check kill switch before execution
      if (await this.killSwitchChecker.isKillSwitchActive(executionRun.connection_id)) {
        await this.executionLogger.logExecutionFailed(executionRun, new Error('Kill switch is active'), 'kill_switch');
        await this.updateExecutionStatus(executionRun.id, 'failed', 'kill_switch');
        throw new Error('Kill switch is active, execution cancelled');
      }

      // 5. Collect baseline metrics - เฉพาะ table และ query ที่เกี่ยวข้อง
      const baselineMetrics = await this.metricsCollector.collectBaselineMetrics(
        executionRun.table_name,
        executionRun.query_digests
      );
      await this.executionLogger.logBaselineMetricsCollected(executionRun, baselineMetrics);

      // 6. Execute ADD INDEX
      const indexResult = await this.indexExecutor.executeAddIndex(executionRun);
      await this.executionLogger.logIndexAdded(executionRun, indexResult.index_name, indexResult.executed_sql);

      // 7. Check kill switch after execution
      if (await this.killSwitchChecker.isKillSwitchActive(executionRun.connection_id)) {
        await this.verificationService.rollback(executionRun, 'Kill switch activated during execution');
        await this.executionLogger.logRollback(executionRun, 'Kill switch activated');
        await this.updateExecutionStatus(executionRun.id, 'rolled_back', 'kill_switch');
        throw new Error('Kill switch became active during execution, rolled back');
      }

      // 8. Wait for metrics window and collect after metrics
      // ในสถานการณ์จริงควรรอ 5 นาทีก่อนเก็บ after metrics
      await this.wait(5 * 60 * 1000); // 5 minutes
      
      const afterMetrics = await this.metricsCollector.collectAfterMetrics(
        executionRun.table_name,
        executionRun.query_digests,
        5 // 5 minute window
      );
      await this.executionLogger.logAfterMetricsCollected(executionRun, afterMetrics);

      // 9. Verify execution
      const verificationResult = await this.verificationService.verify(
        executionRun,
        baselineMetrics,
        afterMetrics
      );
      await this.executionLogger.logVerificationResult(executionRun, verificationResult);

      // 10. Handle verification result
      await this.handleVerificationResult(executionRun, verificationResult);
      
    } catch (error) {
      const err = error as Error;
      // ถ้า error ไม่ได้ถูก handle ไว้แล้ว ให้ log และ update status
      if (!err.message?.includes('out of scope') &&
          !err.message?.includes('Failed to claim') &&
          !err.message?.includes('Kill switch') &&
          !err.message?.includes('Input validation failed')) {
        await this.executionLogger.logExecutionFailed(executionRun, error, 'execution_error');
        await this.updateExecutionStatus(executionRun.id, 'failed', 'execution_error');
      }
      throw error;
    }
  }

  private async handleVerificationResult(
    executionRun: ExecutionRun,
    result: VerificationResult
  ): Promise<void> {
    switch (result.status) {
      case 'success':
        await this.executionLogger.logExecutionCompleted(executionRun);
        await this.updateExecutionStatus(executionRun.id, 'completed');
        break;

      case 'inconclusive':
        // ห้าม auto-rollback เมื่อ inconclusive
        this.logger.warn('Verification inconclusive - no auto-rollback will be performed', {
          execution_run_id: executionRun.id,
          message: result.message,
          sample_count: result.sample_count
        });
        await this.executionLogger.logExecutionCompleted(executionRun);
        await this.updateExecutionStatus(executionRun.id, 'completed', undefined, result.message);
        break;

      case 'failed':
        // Auto-rollback เมื่อ verification failed
        await this.verificationService.rollback(executionRun, result.message);
        await this.executionLogger.logRollback(executionRun, result.message);
        await this.updateExecutionStatus(executionRun.id, 'rolled_back', 'verification_failed');
        throw new Error(`Verification failed: ${result.message}`);
    }
  }

  private async claimExecution(executionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.saasApiBaseUrl}/api/executions/${executionId}/claim`,
        {
          method: 'POST',
          headers: authHeaders(),
          signal: AbortSignal.timeout(5000)
        }
      );

      if (response.status === 409) {
        // Conflict - already claimed by another executor
        this.logger.warn('Execution already claimed by another executor', { executionId });
        return false;
      }

      if (!response.ok) {
        this.logger.error(`Claim API returned status ${response.status}`);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error('Error claiming execution', error);
      return false;
    }
  }

  private async updateExecutionStatus(
    executionId: string,
    status: string,
    failReason?: string,
    message?: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.saasApiBaseUrl}/api/executions/${executionId}/status`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({
            status,
            fail_reason: failReason,
            message
          })
        }
      );

      if (!response.ok) {
        this.logger.error(`Failed to update execution status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error updating execution status', error);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}