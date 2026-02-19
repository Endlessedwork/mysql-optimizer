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

  /**
   * Get the target database name for filtering queries.
   * Returns the configured database, or null if not set (scan all).
   */
  private get targetDatabase(): string | null {
    return this.config.database || null;
  }

  /**
   * Get the configured database name (public accessor for execution).
   */
  getDatabaseName(): string | undefined {
    return this.config.database || undefined;
  }

  /**
   * Build WHERE clause for information_schema queries.
   * If database is configured, filter to that specific database only.
   * Otherwise, exclude system schemas.
   */
  private schemaFilter(schemaColumn: string): { where: string; params: string[] } {
    if (this.targetDatabase) {
      return {
        where: `${schemaColumn} = ?`,
        params: [this.targetDatabase]
      };
    }
    return {
      where: `${schemaColumn} NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')`,
      params: []
    };
  }

  async connect() {
    this.logger.info(`Connecting to MySQL at ${this.config.host}:${this.config.port}`);

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
    const command = query.trim().split(/\s+/)[0].toUpperCase();
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
   * Execute a DDL statement (safe DDL types only).
   * Separate from executeQuery to enforce stricter validation.
   */
  async executeDDL(sql: string): Promise<any[]> {
    if (!this.connection) {
      throw new Error('Database connection not established');
    }

    // Allow safe DDL statements only
    const normalized = sql.trim().toUpperCase();
    const allowedPrefixes = [
      'ALTER TABLE',
      'CREATE INDEX',
      'DROP INDEX',
      'OPTIMIZE TABLE',
      'ANALYZE TABLE'
    ];

    const isAllowed = allowedPrefixes.some(prefix => normalized.startsWith(prefix));
    if (!isAllowed) {
      throw new Error(`DDL type not allowed in executeDDL. Got: ${normalized.split(' ').slice(0, 3).join(' ')}. Allowed: ${allowedPrefixes.join(', ')}`);
    }

    try {
      this.logger.info(`Executing DDL: ${sql}`);
      const [rows] = await this.connection.execute(sql);
      this.logger.info('DDL executed successfully');
      return rows as any[];
    } catch (error) {
      this.logger.error('Error executing DDL', error);
      throw error;
    }
  }

  async getTableInfo(): Promise<any[]> {
    const filter = this.schemaFilter('TABLE_SCHEMA');
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
      WHERE ${filter.where}
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;

    return await this.executeQuery(query, filter.params);
  }

  async getColumnInfo(): Promise<any[]> {
    const filter = this.schemaFilter('TABLE_SCHEMA');
    const query = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE ${filter.where}
      ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
    `;

    return await this.executeQuery(query, filter.params);
  }

  async getIndexInfo(): Promise<any[]> {
    const filter = this.schemaFilter('TABLE_SCHEMA');
    const query = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        INDEX_NAME,
        COLUMN_NAME,
        SEQ_IN_INDEX,
        NON_UNIQUE,
        INDEX_TYPE,
        COMMENT
      FROM information_schema.STATISTICS
      WHERE ${filter.where}
      ORDER BY TABLE_SCHEMA, TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `;

    return await this.executeQuery(query, filter.params);
  }

  async getQueryDigest(): Promise<any[]> {
    const filter = this.schemaFilter('SCHEMA_NAME');
    const query = `
      SELECT
        DIGEST,
        DIGEST_TEXT,
        SCHEMA_NAME,
        COUNT_STAR,
        SUM_TIMER_WAIT,
        AVG_TIMER_WAIT,
        MIN_TIMER_WAIT,
        MAX_TIMER_WAIT,
        SUM_ROWS_EXAMINED,
        CASE WHEN COUNT_STAR > 0 THEN SUM_ROWS_EXAMINED / COUNT_STAR ELSE 0 END AS AVG_ROWS_EXAMINED,
        SUM_ROWS_SENT,
        CASE WHEN COUNT_STAR > 0 THEN SUM_ROWS_SENT / COUNT_STAR ELSE 0 END AS AVG_ROWS_SENT
      FROM performance_schema.events_statements_summary_by_digest
      WHERE DIGEST_TEXT IS NOT NULL
        AND ${filter.where}
      ORDER BY COUNT_STAR DESC
      LIMIT 1000
    `;

    return await this.executeQuery(query, filter.params);
  }

  async getExplainPlans(topN: number): Promise<any[]> {
    const filter = this.schemaFilter('SCHEMA_NAME');
    const limitValue = Math.max(1, Math.min(topN, 1000));
    const query = `
      SELECT
        DIGEST_TEXT,
        QUERY_SAMPLE_TEXT,
        SCHEMA_NAME,
        SUM_ROWS_EXAMINED AS TOTAL_ROWS_EXAMINED,
        CASE WHEN COUNT_STAR > 0 THEN SUM_ROWS_EXAMINED / COUNT_STAR ELSE 0 END AS AVG_ROWS_EXAMINED,
        COUNT_STAR
      FROM performance_schema.events_statements_summary_by_digest
      WHERE DIGEST_TEXT IS NOT NULL
        AND ${filter.where}
      ORDER BY COUNT_STAR DESC
      LIMIT ${limitValue}
    `;

    const results = await this.executeQuery(query, filter.params);

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
    const filter = this.schemaFilter('TABLE_SCHEMA');
    const routineFilter = this.schemaFilter('ROUTINE_SCHEMA');
    const triggerFilter = this.schemaFilter('TRIGGER_SCHEMA');
    const eventFilter = this.schemaFilter('EVENT_SCHEMA');

    const views = await this.executeQuery(`
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        VIEW_DEFINITION
      FROM information_schema.VIEWS
      WHERE ${filter.where}
    `, filter.params);

    const procedures = await this.executeQuery(`
      SELECT
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION
      FROM information_schema.ROUTINES
      WHERE ${routineFilter.where}
    `, routineFilter.params);

    const functions = await this.executeQuery(`
      SELECT
        ROUTINE_SCHEMA,
        ROUTINE_NAME,
        ROUTINE_TYPE,
        ROUTINE_DEFINITION
      FROM information_schema.ROUTINES
      WHERE ${routineFilter.where}
        AND ROUTINE_TYPE = 'FUNCTION'
    `, routineFilter.params);

    const triggers = await this.executeQuery(`
      SELECT
        TRIGGER_SCHEMA,
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_STATEMENT
      FROM information_schema.TRIGGERS
      WHERE ${triggerFilter.where}
    `, triggerFilter.params);

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
      WHERE ${eventFilter.where}
    `, eventFilter.params);

    return {
      views,
      procedures,
      functions,
      triggers,
      events
    };
  }

  /**
   * Get detailed table statistics including row counts, sizes, and fragmentation
   */
  async getTableStatistics(): Promise<any[]> {
    const filter = this.schemaFilter('TABLE_SCHEMA');
    const query = `
      SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        ENGINE,
        ROW_FORMAT,
        TABLE_ROWS,
        AVG_ROW_LENGTH,
        DATA_LENGTH,
        MAX_DATA_LENGTH,
        INDEX_LENGTH,
        DATA_FREE,
        AUTO_INCREMENT,
        CREATE_TIME,
        UPDATE_TIME,
        TABLE_COLLATION,
        -- Calculated fields
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_size_mb,
        ROUND(DATA_FREE / 1024 / 1024, 2) AS fragmented_mb,
        CASE WHEN DATA_LENGTH > 0 THEN ROUND(DATA_FREE / DATA_LENGTH * 100, 2) ELSE 0 END AS fragmentation_pct
      FROM information_schema.TABLES
      WHERE ${filter.where}
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `;

    return await this.executeQuery(query, filter.params);
  }

  /**
   * Get index usage statistics from performance_schema
   */
  async getIndexUsageStats(): Promise<any[]> {
    try {
      const filter = this.schemaFilter('OBJECT_SCHEMA');
      const query = `
        SELECT
          OBJECT_SCHEMA,
          OBJECT_NAME,
          INDEX_NAME,
          COUNT_FETCH AS read_count,
          COUNT_INSERT AS insert_count,
          COUNT_UPDATE AS update_count,
          COUNT_DELETE AS delete_count,
          (COUNT_FETCH + COUNT_INSERT + COUNT_UPDATE + COUNT_DELETE) AS total_operations
        FROM performance_schema.table_io_waits_summary_by_index_usage
        WHERE ${filter.where}
          AND INDEX_NAME IS NOT NULL
        ORDER BY total_operations DESC
      `;
      return await this.executeQuery(query, filter.params);
    } catch (error) {
      this.logger.warn('Failed to get index usage stats (performance_schema may be disabled)', error);
      return [];
    }
  }

  /**
   * Get index cardinality and detailed index information
   */
  async getIndexCardinality(): Promise<any[]> {
    const filter = this.schemaFilter('s.TABLE_SCHEMA');
    const query = `
      SELECT
        s.TABLE_SCHEMA,
        s.TABLE_NAME,
        s.INDEX_NAME,
        s.NON_UNIQUE,
        s.SEQ_IN_INDEX,
        s.COLUMN_NAME,
        s.CARDINALITY,
        s.SUB_PART,
        s.NULLABLE,
        s.INDEX_TYPE,
        t.TABLE_ROWS,
        CASE
          WHEN t.TABLE_ROWS > 0 AND s.CARDINALITY > 0
          THEN ROUND(s.CARDINALITY / t.TABLE_ROWS * 100, 2)
          ELSE 0
        END AS selectivity_pct
      FROM information_schema.STATISTICS s
      JOIN information_schema.TABLES t ON s.TABLE_SCHEMA = t.TABLE_SCHEMA AND s.TABLE_NAME = t.TABLE_NAME
      WHERE ${filter.where}
      ORDER BY s.TABLE_SCHEMA, s.TABLE_NAME, s.INDEX_NAME, s.SEQ_IN_INDEX
    `;

    return await this.executeQuery(query, filter.params);
  }

  /**
   * Get slow query analysis from performance_schema
   */
  async getSlowQueryAnalysis(): Promise<any[]> {
    try {
      const filter = this.schemaFilter('SCHEMA_NAME');
      const query = `
        SELECT
          DIGEST,
          DIGEST_TEXT,
          COUNT_STAR AS execution_count,
          ROUND(SUM_TIMER_WAIT / 1000000000000, 4) AS total_time_sec,
          ROUND(AVG_TIMER_WAIT / 1000000000000, 4) AS avg_time_sec,
          ROUND(MAX_TIMER_WAIT / 1000000000000, 4) AS max_time_sec,
          SUM_ROWS_EXAMINED AS total_rows_examined,
          ROUND(SUM_ROWS_EXAMINED / GREATEST(COUNT_STAR, 1), 0) AS avg_rows_examined,
          SUM_ROWS_SENT AS total_rows_sent,
          ROUND(SUM_ROWS_SENT / GREATEST(COUNT_STAR, 1), 0) AS avg_rows_sent,
          SUM_ROWS_AFFECTED AS total_rows_affected,
          SUM_CREATED_TMP_DISK_TABLES AS tmp_disk_tables,
          SUM_CREATED_TMP_TABLES AS tmp_tables,
          SUM_SELECT_FULL_JOIN AS full_joins,
          SUM_SELECT_SCAN AS full_scans,
          SUM_SORT_ROWS AS sort_rows,
          SUM_NO_INDEX_USED AS no_index_used,
          SUM_NO_GOOD_INDEX_USED AS no_good_index_used,
          FIRST_SEEN,
          LAST_SEEN,
          -- Efficiency score (lower is worse)
          CASE
            WHEN SUM_ROWS_SENT > 0
            THEN ROUND(SUM_ROWS_EXAMINED / SUM_ROWS_SENT, 2)
            ELSE 0
          END AS rows_examined_ratio
        FROM performance_schema.events_statements_summary_by_digest
        WHERE DIGEST_TEXT IS NOT NULL
          AND ${filter.where}
        ORDER BY total_time_sec DESC
        LIMIT 100
      `;
      return await this.executeQuery(query, filter.params);
    } catch (error) {
      this.logger.warn('Failed to get slow query analysis', error);
      return [];
    }
  }

  /**
   * Detect missing indexes by analyzing query patterns
   */
  async detectMissingIndexes(): Promise<any[]> {
    try {
      const filter = this.schemaFilter('SCHEMA_NAME');
      const query = `
        SELECT
          DIGEST_TEXT,
          COUNT_STAR AS execution_count,
          SUM_NO_INDEX_USED AS no_index_count,
          SUM_NO_GOOD_INDEX_USED AS bad_index_count,
          SUM_ROWS_EXAMINED AS total_rows_examined,
          SUM_ROWS_SENT AS total_rows_sent,
          ROUND(SUM_TIMER_WAIT / 1000000000000, 4) AS total_time_sec
        FROM performance_schema.events_statements_summary_by_digest
        WHERE (SUM_NO_INDEX_USED > 0 OR SUM_NO_GOOD_INDEX_USED > 0)
          AND DIGEST_TEXT IS NOT NULL
          AND ${filter.where}
        ORDER BY total_time_sec DESC
        LIMIT 50
      `;
      return await this.executeQuery(query, filter.params);
    } catch (error) {
      this.logger.warn('Failed to detect missing indexes', error);
      return [];
    }
  }

  /**
   * Get foreign key information
   */
  async getForeignKeys(): Promise<any[]> {
    const filter = this.schemaFilter('CONSTRAINT_SCHEMA');
    const query = `
      SELECT
        CONSTRAINT_SCHEMA,
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_SCHEMA,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME IS NOT NULL
        AND ${filter.where}
      ORDER BY CONSTRAINT_SCHEMA, TABLE_NAME, CONSTRAINT_NAME
    `;

    return await this.executeQuery(query, filter.params);
  }

  /**
   * Get lock and wait statistics
   */
  async getLockStats(): Promise<any> {
    try {
      const filter = this.schemaFilter('OBJECT_SCHEMA');
      const tableWaits = await this.executeQuery(`
        SELECT
          OBJECT_SCHEMA,
          OBJECT_NAME,
          COUNT_STAR AS wait_count,
          ROUND(SUM_TIMER_WAIT / 1000000000000, 4) AS total_wait_sec,
          ROUND(AVG_TIMER_WAIT / 1000000000000, 6) AS avg_wait_sec
        FROM performance_schema.table_lock_waits_summary_by_table
        WHERE ${filter.where}
        ORDER BY total_wait_sec DESC
        LIMIT 20
      `, filter.params);

      return { tableWaits };
    } catch (error) {
      this.logger.warn('Failed to get lock stats', error);
      return { tableWaits: [] };
    }
  }
}
