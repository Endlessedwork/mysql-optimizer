import { Database } from '../database';

export interface ScanRun {
  id: string;
  tenantId: string;
  connectionProfileId: string;
  connectionName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScanRunInput {
  tenantId: string;
  connectionProfileId: string;
}

/** Initial status when creating: 'pending' = requested from UI (agent will pick up), 'running' = agent creates itself */
export type CreateScanRunStatus = 'pending' | 'running';

export interface SchemaSnapshot {
  id: string;
  scanRunId: string;
  tables: any;
  columns: any;
  indexes: any;
  views: any;
  procedures: any;
  functions: any;
  triggers: any;
  events: any;
  foreignKeys: any;
  tableStats: any;
  indexUsage: any;
  indexCardinality: any;
  lockStats: any;
  createdAt: string;
}

export interface QueryDigest {
  id: string;
  scanRunId: string;
  digest: string;
  digestText: string;
  countStar: number;
  sumTimerWait: number;
  avgTimerWait: number;
  minTimerWait: number;
  maxTimerWait: number;
  sumRowsExamined: number;
  avgRowsExamined: number;
  sumRowsSent: number;
  avgRowsSent: number;
  createdAt: string;
}

export interface QueryDigestInput {
  digest: string;
  digestText: string;
  countStar: number;
  sumTimerWait: number;
  avgTimerWait: number;
  minTimerWait: number;
  maxTimerWait: number;
  sumRowsExamined: number;
  avgRowsExamined: number;
  sumRowsSent: number;
  avgRowsSent: number;
}

function mapScanRunRow(row: any): ScanRun {
  return {
    id: row.id,
    tenantId: row.tenantId,
    connectionProfileId: row.connectionProfileId,
    connectionName: row.connectionName,
    status: row.status,
    startedAt: row.startedAt?.toISOString() || row.startedAt,
    completedAt: row.completedAt?.toISOString() || row.completedAt,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
}

export const getScanRuns = async (filters: {
  tenantId?: string;
  connectionProfileId?: string;
  status?: string;
}): Promise<ScanRun[]> => {
  let query = `
    SELECT sr.id, sr.tenant_id as "tenantId", sr.connection_profile_id as "connectionProfileId",
      cp.name as "connectionName",
      sr.status, sr.started_at as "startedAt", sr.completed_at as "completedAt",
      sr.error_message as "errorMessage", sr.created_at as "createdAt", sr.updated_at as "updatedAt"
    FROM scan_runs sr
    LEFT JOIN connection_profiles cp ON cp.id = sr.connection_profile_id
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (filters.tenantId) {
    conditions.push(`sr.tenant_id = $${paramIndex++}`);
    params.push(filters.tenantId);
  }
  if (filters.connectionProfileId) {
    conditions.push(`sr.connection_profile_id = $${paramIndex++}`);
    params.push(filters.connectionProfileId);
  }
  if (filters.status) {
    conditions.push(`sr.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY sr.created_at DESC';

  const result = await Database.query<any>(query, params);
  return result.rows.map(mapScanRunRow);
};

export const getScanRunById = async (id: string): Promise<ScanRun | null> => {
  const result = await Database.query<any>(
    `SELECT id, tenant_id as "tenantId", connection_profile_id as "connectionProfileId",
      status, started_at as "startedAt", completed_at as "completedAt",
      error_message as "errorMessage", created_at as "createdAt", updated_at as "updatedAt"
    FROM scan_runs WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapScanRunRow(result.rows[0]);
};

export const createScanRun = async (
  input: CreateScanRunInput,
  initialStatus: CreateScanRunStatus = 'running'
): Promise<ScanRun> => {
  const startedAt = initialStatus === 'running' ? 'NOW()' : 'NULL';
  const result = await Database.query<any>(
    `INSERT INTO scan_runs (tenant_id, connection_profile_id, status, started_at)
    VALUES ($1, $2, $3, ${startedAt})
    RETURNING id, tenant_id as "tenantId", connection_profile_id as "connectionProfileId",
      status, started_at as "startedAt", completed_at as "completedAt",
      error_message as "errorMessage", created_at as "createdAt", updated_at as "updatedAt"`,
    [input.tenantId, input.connectionProfileId, initialStatus]
  );
  
  return mapScanRunRow(result.rows[0]);
};

export const updateScanRunStatus = async (
  id: string, 
  status: 'pending' | 'running' | 'completed' | 'failed',
  errorMessage?: string
): Promise<ScanRun | null> => {
  let query = `
    UPDATE scan_runs 
    SET status = $1, updated_at = NOW()
  `;
  const params: any[] = [status];
  let paramIndex = 2;
  
  if (status === 'completed' || status === 'failed') {
    query += `, completed_at = NOW()`;
  }
  
  if (errorMessage !== undefined) {
    query += `, error_message = $${paramIndex++}`;
    params.push(errorMessage);
  }
  
  query += ` WHERE id = $${paramIndex}
    RETURNING id, tenant_id as "tenantId", connection_profile_id as "connectionProfileId",
      status, started_at as "startedAt", completed_at as "completedAt",
      error_message as "errorMessage", created_at as "createdAt", updated_at as "updatedAt"`;
  params.push(id);
  
  const result = await Database.query<any>(query, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapScanRunRow(result.rows[0]);
};

export const createSchemaSnapshot = async (
  scanRunId: string,
  data: {
    tables?: any;
    columns?: any;
    indexes?: any;
    views?: any;
    procedures?: any;
    functions?: any;
    triggers?: any;
    events?: any;
    foreignKeys?: any;
    tableStats?: any;
    indexUsage?: any;
    indexCardinality?: any;
    lockStats?: any;
  }
): Promise<SchemaSnapshot> => {
  const result = await Database.query<any>(
    `INSERT INTO schema_snapshots (scan_run_id, tables, columns, indexes, views, procedures, functions, triggers, events, foreign_keys, table_stats, index_usage, index_cardinality, lock_stats)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id, scan_run_id as "scanRunId", tables, columns, indexes, views, procedures, functions, triggers, events,
      foreign_keys as "foreignKeys", table_stats as "tableStats", index_usage as "indexUsage",
      index_cardinality as "indexCardinality", lock_stats as "lockStats", created_at as "createdAt"`,
    [
      scanRunId,
      JSON.stringify(data.tables || []),
      JSON.stringify(data.columns || []),
      JSON.stringify(data.indexes || []),
      JSON.stringify(data.views || []),
      JSON.stringify(data.procedures || []),
      JSON.stringify(data.functions || []),
      JSON.stringify(data.triggers || []),
      JSON.stringify(data.events || []),
      JSON.stringify(data.foreignKeys || []),
      JSON.stringify(data.tableStats || []),
      JSON.stringify(data.indexUsage || []),
      JSON.stringify(data.indexCardinality || []),
      JSON.stringify(data.lockStats || [])
    ]
  );

  return mapSchemaSnapshotRow(result.rows[0]);
};

const SCHEMA_SNAPSHOT_COLUMNS = `
  id, scan_run_id as "scanRunId", tables, columns, indexes, views, procedures, functions, triggers, events,
  foreign_keys as "foreignKeys", table_stats as "tableStats", index_usage as "indexUsage",
  index_cardinality as "indexCardinality", lock_stats as "lockStats", created_at as "createdAt"
`;

function mapSchemaSnapshotRow(row: any): SchemaSnapshot {
  return {
    id: row.id,
    scanRunId: row.scanRunId,
    tables: row.tables,
    columns: row.columns,
    indexes: row.indexes,
    views: row.views,
    procedures: row.procedures,
    functions: row.functions,
    triggers: row.triggers,
    events: row.events,
    foreignKeys: row.foreignKeys || [],
    tableStats: row.tableStats || [],
    indexUsage: row.indexUsage || [],
    indexCardinality: row.indexCardinality || [],
    lockStats: row.lockStats || [],
    createdAt: row.createdAt?.toISOString() || row.createdAt
  };
}

export const getSchemaSnapshotByScanRunId = async (scanRunId: string): Promise<SchemaSnapshot | null> => {
  const result = await Database.query<any>(
    `SELECT ${SCHEMA_SNAPSHOT_COLUMNS} FROM schema_snapshots WHERE scan_run_id = $1`,
    [scanRunId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapSchemaSnapshotRow(result.rows[0]);
};

const SCHEMA_SNAPSHOT_JOIN_COLUMNS = `
  ss.id, ss.scan_run_id as "scanRunId", ss.tables, ss.columns, ss.indexes, ss.views,
  ss.procedures, ss.functions, ss.triggers, ss.events,
  ss.foreign_keys as "foreignKeys", ss.table_stats as "tableStats", ss.index_usage as "indexUsage",
  ss.index_cardinality as "indexCardinality", ss.lock_stats as "lockStats", ss.created_at as "createdAt"
`;

/** Get latest completed schema snapshot for a connection */
export const getLatestSchemaByConnectionId = async (connectionId: string): Promise<(SchemaSnapshot & { scanRunCreatedAt: string }) | null> => {
  const result = await Database.query<any>(
    `SELECT ${SCHEMA_SNAPSHOT_JOIN_COLUMNS}, sr.created_at as "scanRunCreatedAt"
    FROM schema_snapshots ss
    JOIN scan_runs sr ON sr.id = ss.scan_run_id
    WHERE sr.connection_profile_id = $1 AND sr.status = 'completed'
    ORDER BY sr.completed_at DESC NULLS LAST
    LIMIT 1`,
    [connectionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    ...mapSchemaSnapshotRow(row),
    scanRunCreatedAt: row.scanRunCreatedAt?.toISOString() || row.scanRunCreatedAt
  };
};

/** Get all schema snapshots for a connection (for diff history) */
export const getSchemaSnapshotsByConnectionId = async (connectionId: string, limit = 10): Promise<Array<SchemaSnapshot & { scanRunCreatedAt: string }>> => {
  const result = await Database.query<any>(
    `SELECT ${SCHEMA_SNAPSHOT_JOIN_COLUMNS}, sr.created_at as "scanRunCreatedAt"
    FROM schema_snapshots ss
    JOIN scan_runs sr ON sr.id = ss.scan_run_id
    WHERE sr.connection_profile_id = $1 AND sr.status = 'completed'
    ORDER BY sr.completed_at DESC NULLS LAST
    LIMIT $2`,
    [connectionId, limit]
  );

  return result.rows.map((row: any) => ({
    ...mapSchemaSnapshotRow(row),
    scanRunCreatedAt: row.scanRunCreatedAt?.toISOString() || row.scanRunCreatedAt
  }));
};

export const createQueryDigests = async (
  scanRunId: string,
  digests: QueryDigestInput[]
): Promise<number> => {
  if (digests.length === 0) {
    return 0;
  }
  
  // Build bulk insert query
  const values: any[] = [];
  const placeholders: string[] = [];
  let paramIndex = 1;
  
  for (const digest of digests) {
    placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
    values.push(
      scanRunId,
      digest.digest,
      digest.digestText,
      digest.countStar,
      digest.sumTimerWait,
      digest.avgTimerWait,
      digest.minTimerWait,
      digest.maxTimerWait,
      digest.sumRowsExamined,
      digest.avgRowsExamined,
      digest.sumRowsSent,
      digest.avgRowsSent
    );
  }
  
  const query = `
    INSERT INTO query_digests (scan_run_id, digest, digest_text, count_star, sum_timer_wait, avg_timer_wait, min_timer_wait, max_timer_wait, sum_rows_examined, avg_rows_examined, sum_rows_sent, avg_rows_sent)
    VALUES ${placeholders.join(', ')}
  `;
  
  const result = await Database.query<any>(query, values);
  return result.rowCount || digests.length;
};

export const getQueryDigestsByScanRunId = async (scanRunId: string): Promise<QueryDigest[]> => {
  const result = await Database.query<any>(
    `SELECT id, scan_run_id as "scanRunId", digest, digest_text as "digestText",
      count_star as "countStar", sum_timer_wait as "sumTimerWait", avg_timer_wait as "avgTimerWait",
      min_timer_wait as "minTimerWait", max_timer_wait as "maxTimerWait",
      sum_rows_examined as "sumRowsExamined", avg_rows_examined as "avgRowsExamined",
      sum_rows_sent as "sumRowsSent", avg_rows_sent as "avgRowsSent",
      created_at as "createdAt"
    FROM query_digests WHERE scan_run_id = $1
    ORDER BY count_star DESC`,
    [scanRunId]
  );
  
  return result.rows.map((row: any) => ({
    id: row.id,
    scanRunId: row.scanRunId,
    digest: row.digest,
    digestText: row.digestText,
    countStar: parseInt(row.countStar),
    sumTimerWait: parseFloat(row.sumTimerWait),
    avgTimerWait: parseFloat(row.avgTimerWait),
    minTimerWait: parseFloat(row.minTimerWait),
    maxTimerWait: parseFloat(row.maxTimerWait),
    sumRowsExamined: parseInt(row.sumRowsExamined),
    avgRowsExamined: parseFloat(row.avgRowsExamined),
    sumRowsSent: parseInt(row.sumRowsSent),
    avgRowsSent: parseFloat(row.avgRowsSent),
    createdAt: row.createdAt?.toISOString() || row.createdAt
  }));
};
