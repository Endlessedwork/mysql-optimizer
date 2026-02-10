import { Config } from './config';
import { Logger } from './logger';
import { MysqlConnector } from './mysql-connector';
import { Executor } from './executor/executor';
import { ExecutionRun } from './types';
import * as apiClient from './utils/api-client';

export class ExecutionPoller {
  private config: Config;
  private logger: Logger;
  private mysqlConnector: MysqlConnector;
  private executor: Executor;
  private agentId: string;
  private isRunning: boolean = false;
  private pollIntervalMs: number;

  constructor() {
    this.config = new Config();
    this.logger = new Logger();
    this.mysqlConnector = new MysqlConnector(this.config, this.logger);
    this.executor = new Executor();
    this.agentId = process.env.AGENT_ID || `agent-${Date.now()}`;
    this.pollIntervalMs = parseInt(process.env.POLL_INTERVAL_MS || '30000', 10); // Default 30 seconds
  }

  async start(): Promise<void> {
    this.logger.info('Starting Execution Poller');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.pollAndExecute();
      } catch (error) {
        this.logger.error('Error in poll cycle', error);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }

    this.logger.info('Execution Poller stopped');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Execution Poller');
    this.isRunning = false;
  }

  private async pollAndExecute(): Promise<void> {
    // 1. Check kill switch first
    try {
      const killSwitchStatus = await apiClient.getKillSwitchStatus();
      if (killSwitchStatus.global) {
        this.logger.info('Global kill switch is active, skipping execution poll');
        return;
      }
    } catch (error) {
      this.logger.warn('Failed to check kill switch, skipping this cycle for safety', error);
      return;
    }

    // 2. Get scheduled executions
    let scheduledExecutions: apiClient.ScheduledExecution[] = [];
    try {
      scheduledExecutions = await apiClient.getScheduledExecutions();
    } catch (error) {
      this.logger.error('Failed to get scheduled executions', error);
      return;
    }

    if (scheduledExecutions.length === 0) {
      this.logger.debug('No scheduled executions found');
      return;
    }

    this.logger.info(`Found ${scheduledExecutions.length} scheduled executions`);

    // 3. Try to claim and execute each one
    for (const scheduled of scheduledExecutions) {
      try {
        await this.processExecution(scheduled);
      } catch (error) {
        this.logger.error(`Failed to process execution ${scheduled.id}`, error);
      }
    }
  }

  private async processExecution(scheduled: apiClient.ScheduledExecution): Promise<void> {
    const { id: executionId } = scheduled;

    this.logger.info(`Processing execution ${executionId}`);

    // 1. Try to claim the execution
    let claimResult;
    try {
      claimResult = await apiClient.claimExecution(executionId, this.agentId);
    } catch (error) {
      // 409 Conflict means already claimed by another agent
      if (error instanceof Error && error.message.includes('409')) {
        this.logger.info(`Execution ${executionId} already claimed by another agent`);
        return;
      }
      throw error;
    }

    this.logger.info(`Successfully claimed execution ${executionId}`);

    // 2. Get full execution details with recommendations
    let executionDetail: apiClient.ExecutionDetail;
    try {
      executionDetail = await apiClient.getExecutionDetail(executionId);
      this.logger.info(`Fetched execution detail with ${executionDetail.recommendations?.length || 0} recommendations`);
    } catch (error) {
      this.logger.error('Failed to fetch execution detail', error);
      await apiClient.updateExecutionStatus(executionId, 'failed', 'Failed to fetch recommendation details');
      return;
    }

    // 3. Process each recommendation
    try {
      await this.mysqlConnector.connect();

      for (const rec of executionDetail.recommendations || []) {
        await this.executeRecommendation(executionId, rec);
      }

      // Mark as completed
      await apiClient.updateExecutionStatus(executionId, 'completed');
      this.logger.info(`Execution ${executionId} completed successfully`);

      await this.mysqlConnector.disconnect();

    } catch (error) {
      // Update status to failed
      try {
        await apiClient.updateExecutionStatus(executionId, 'failed', String(error));
      } catch (updateError) {
        this.logger.error('Failed to update execution status to failed', updateError);
      }

      // Make sure to disconnect on error
      try {
        await this.mysqlConnector.disconnect();
      } catch (disconnectError) {
        this.logger.warn('Failed to disconnect MySQL on error', disconnectError);
      }

      throw error;
    }
  }

  private async executeRecommendation(executionId: string, rec: any): Promise<void> {
    this.logger.info(`Executing recommendation: ${rec.title || rec.type}`, {
      type: rec.type,
      table: rec.table_name,
      severity: rec.severity
    });

    // Find the DDL to execute from fix_options
    const fixOptions = rec.fix_options || [];
    const primaryFix = fixOptions[0]; // Use first fix option

    if (!primaryFix?.implementation) {
      this.logger.warn(`No DDL found for recommendation: ${rec.title}`);
      return;
    }

    const ddl = primaryFix.implementation;
    this.logger.info(`Executing DDL: ${ddl}`);

    // Safety check - only execute supported DDL types
    const normalizedDdl = ddl.trim().toUpperCase();
    const allowedPrefixes = ['CREATE INDEX', 'ALTER TABLE', 'OPTIMIZE TABLE', 'ANALYZE TABLE'];
    const isAllowed = allowedPrefixes.some(prefix => normalizedDdl.startsWith(prefix));

    if (!isAllowed) {
      this.logger.warn(`DDL not in allowed list, skipping: ${ddl.substring(0, 50)}...`);
      return;
    }

    try {
      // Execute the DDL
      await this.mysqlConnector.executeDDL(ddl);
      this.logger.info(`Successfully executed DDL for ${rec.table_name}`);

      // Record metrics
      await apiClient.submitVerificationMetrics(executionId, {
        recommendation_type: rec.type,
        table_name: rec.table_name,
        ddl_executed: ddl,
        executed_at: new Date().toISOString()
      }, {
        success: true,
        completed_at: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`Failed to execute DDL: ${ddl}`, error);
      
      // Try rollback if available
      if (primaryFix.rollback) {
        try {
          this.logger.info(`Attempting rollback: ${primaryFix.rollback}`);
          await this.mysqlConnector.executeDDL(primaryFix.rollback);
          this.logger.info('Rollback successful');
        } catch (rollbackError) {
          this.logger.error('Rollback failed', rollbackError);
        }
      }

      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
