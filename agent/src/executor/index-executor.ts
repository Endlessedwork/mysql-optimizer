import { MysqlConnector } from '../mysql-connector';
import { Config } from '../config';
import { Logger } from '../logger';
import { ExecutionRun } from '../types';

export interface IndexExecutionResult {
  success: boolean;
  index_name: string;
  table_name: string;
  executed_sql: string;
}

export class IndexExecutor {
  private connector: MysqlConnector;
  private logger: Logger;

  constructor() {
    const config = new Config();
    this.logger = new Logger();
    this.connector = new MysqlConnector(config, this.logger);
  }

  async executeAddIndex(executionRun: ExecutionRun): Promise<IndexExecutionResult> {
    const tableName = executionRun.table_name;
    const indexName = executionRun.index_name;
    const columns = executionRun.columns.join(', ');
    
    const sql = `
      ALTER TABLE \`${tableName}\`
      ADD INDEX \`${indexName}\` (${columns})
      ALGORITHM=INPLACE, LOCK=NONE
    `.trim();

    try {
      await this.connector.connect();
      
      this.logger.info(`Executing ADD INDEX statement: ${sql}`);
      
      await this.connector.executeQuery(sql);
      
      this.logger.info(`Successfully added index ${indexName} to table ${tableName}`);
      
      await this.connector.disconnect();
      
      return {
        success: true,
        index_name: indexName,
        table_name: tableName,
        executed_sql: sql
      };
      
    } catch (error) {
      this.logger.error('Error executing ADD INDEX', error);
      try {
        await this.connector.disconnect();
      } catch {}
      
      throw error;
    }
  }
}