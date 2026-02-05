import { MysqlConnector } from '../mysql-connector';
import { Config } from '../config';
import { Logger } from '../logger';
import { ExecutionRun } from '../types';
import { validateIdentifier, validateIdentifiers } from '../utils/sql-validator';

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
    // Validate all identifiers BEFORE building SQL
    const tableName = validateIdentifier(executionRun.table_name);
    const indexName = validateIdentifier(executionRun.index_name);
    const columns = validateIdentifiers(executionRun.columns);

    const columnList = columns.map(c => `\`${c}\``).join(', ');

    const sql = `ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnList}) ALGORITHM=INPLACE, LOCK=NONE`;

    try {
      await this.connector.connect();

      this.logger.info(`Executing ADD INDEX on table: ${tableName}, index: ${indexName}`);

      await this.connector.executeDDL(sql);
      
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