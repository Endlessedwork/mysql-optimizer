import mysql, { Connection } from 'mysql2/promise';
import { Config } from './config';
import { Logger } from './logger';

export class MysqlConnector {
  private config: Config;
  private logger: Logger;
  private connection: Connection | null = null;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async connect() {
    this.logger.info('Connecting to MySQL database');
    
    try {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        // Add timeout settings
        connectTimeout: this.config.maxExecutionTime,
      });
      
      this.logger.info('Successfully connected to MySQL database');
    } catch (error) {
      this.logger.error('Failed to connect to MySQL database', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.logger.info('Disconnected from MySQL database');
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }

    // Safety check: only allow specific commands
    const command = query.trim().split(' ')[0].toUpperCase();
    if (!this.config.allowedCommands.includes(command)) {
      throw new Error(`Command not allowed: ${command}`);
    }

    try {
      const [rows] = await this.connection.execute(query, params);
      return rows as any[];
    } catch (error) {
      this.logger.error(`Error executing query (first 50 chars): ${query.substring(0, 50)}...`, error);
      throw error;
    }
  }

  /**
   * Execute a DDL statement (ALTER TABLE only).
   * Separate from executeQuery to enforce stricter validation.
   */
  async executeDDL(sql: string): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }

    // Only allow ALTER TABLE statements
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith('ALTER TABLE')) {
      throw new Error(`Only ALTER TABLE statements allowed in executeDDL. Got: ${normalized.split(' ').slice(0, 3).join(' ')}`);
    }

    try {
      const [rows] = await this.connection.execute(sql);
      return rows as any[];
    } catch (error) {
      this.logger.error('Error executing DDL', error);
      throw error;
    }
  }

  async getTableInfo(): Promise<any[]> {
    const query = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE,
        ENGINE,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    
    return await this.executeQuery(query);
  }

  async getColumnInfo(): Promise<any[]> {
    const query = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `;
    
    return await this.executeQuery(query);
  }

  async getIndexInfo(): Promise<any[]> {
    const query = `
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        SEQ_IN_INDEX,
        INDEX_TYPE,
        COMMENT
      FROM information_schema.STATISTICS 
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
      ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `;
    
    return await this.executeQuery(query);
  }

  async getQueryDigest(): Promise<any[]> {
    const query = `
      SELECT 
        DIGEST,
        DIGEST_TEXT,
        COUNT_STAR,
        SUM_TIMER_WAIT,
        AVG_TIMER_WAIT,
        MIN_TIMER_WAIT,
        MAX_TIMER_WAIT,
        SUM_ROWS_EXAMINED,
        AVG_ROWS_EXAMINED,
        SUM_ROWS_SENT,
        AVG_ROWS_SENT
      FROM performance_schema.events_statements_summary_by_digest 
      ORDER BY COUNT_STAR DESC
      LIMIT 1000
    `;
    
    return await this.executeQuery(query);
  }

  async getExplainPlans(topN: number): Promise<any[]> {
    const query = `
      SELECT 
        DIGEST_TEXT,
        QUERY_SAMPLE_TEXT,
        FORMAT_BYTES(SUM_ROWS_EXAMINED) AS TOTAL_ROWS_EXAMINED,
        FORMAT_BYTES(AVG_ROWS_EXAMINED) AS AVG_ROWS_EXAMINED,
        COUNT_STAR
      FROM performance_schema.events_statements_summary_by_digest 
      ORDER BY COUNT_STAR DESC
      LIMIT ?
    `;
    
    const results = await this.executeQuery(query, [topN]);
    
    // For each query, get the EXPLAIN plan
    const explainPlans = [];
    for (const row of results) {
      try {
        // Only EXPLAIN SELECT queries - skip non-SELECT digests
        const digestText = (row.DIGEST_TEXT || '').trim();
        if (!digestText.toUpperCase().startsWith('SELECT')) {
          this.logger.info(`Skipping EXPLAIN for non-SELECT query`);
          continue;
        }
        const explainQuery = `EXPLAIN FORMAT=JSON ${digestText}`;
        const explainResult = await this.executeQuery(explainQuery);
        explainPlans.push({
          digest_text: digestText,
          explain_plan: explainResult
        });
      } catch (error) {
        this.logger.warn(`Failed to get EXPLAIN plan for query`, error);
      }
    }
    
    return explainPlans;
  }

  async getSchemaObjects(): Promise<any> {
    const views = await this.executeQuery(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        VIEW_DEFINITION
      FROM information_schema.VIEWS 
      WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);
    
    const procedures = await this.executeQuery(`
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);
    
    const functions = await this.executeQuery(`
      SELECT 
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION
      FROM information_schema.ROUTINES 
      WHERE ROUTINE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
        AND ROUTINE_TYPE = 'FUNCTION'
    `);
    
    const triggers = await this.executeQuery(`
      SELECT 
        TRIGGER_SCHEMA,
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_STATEMENT
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);
    
    const events = await this.executeQuery(`
      SELECT 
        EVENT_SCHEMA,
        EVENT_NAME,
        STATUS,
        EVENT_TYPE,
        EXECUTE_AT,
        INTERVAL_VALUE,
        INTERVAL_FIELD,
        ON_COMPLETION,
        DEFINER,
        EVENT_BODY
      FROM information_schema.EVENTS 
      WHERE EVENT_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
    `);
    
    return {
      views,
      procedures,
      functions,
      triggers,
      events
    };
  }
}