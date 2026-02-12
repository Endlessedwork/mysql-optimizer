import { Database } from '../database';

export interface Recommendation {
  id: string;
  connectionId: string;
  connectionName?: string;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'rejected';
  createdAt: string;
  updatedAt: string;
  totalFixes?: number;
  appliedFixes?: number;
  failedFixes?: number;
}

export const getRecommendations = async (filters: { connectionId?: string; status?: string; includeArchived?: boolean }): Promise<Recommendation[]> => {
  let query = `
    SELECT
      rp.id,
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName",
      COALESCE(rp.status, 'pending') as status,
      rp.created_at as "createdAt",
      rp.generated_at as "updatedAt",
      rp.total_fixes as "totalFixes",
      rp.applied_fixes as "appliedFixes",
      rp.failed_fixes as "failedFixes",
      rp.recommendations as "rawRecommendations",
      jsonb_array_length(rp.recommendations) as "totalCount",
      rp.archived_at as "archivedAt"
    FROM recommendation_packs rp
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    LEFT JOIN connection_profiles cp ON cp.id = sr.connection_profile_id
  `;

  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // By default, only show active (non-archived) packs
  if (!filters.includeArchived) {
    conditions.push('rp.archived_at IS NULL');
  }

  if (filters.connectionId) {
    conditions.push(`sr.connection_profile_id = $${paramIndex}`);
    params.push(filters.connectionId);
    paramIndex++;
  }

  if (filters.status) {
    conditions.push(`COALESCE(rp.status, 'pending') = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY rp.created_at DESC';

  const result = await Database.query<any>(query, params);

  return result.rows.map(row => {
    const recs = row.rawRecommendations || [];

    // Count by severity
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    // Count by type and get affected tables
    const typeCounts: Record<string, number> = {};
    const affectedTables = new Set<string>();

    for (const rec of recs) {
      const severity = rec.severity || 'medium';
      if (severity in severityCounts) {
        severityCounts[severity as keyof typeof severityCounts]++;
      }

      const type = rec.problem_statement || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      if (rec.table) {
        affectedTables.add(rec.table);
      }
    }

    // Get top issues
    const topIssues = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      id: row.id,
      connectionId: row.connectionId,
      connectionName: row.connectionName,
      databaseName: row.databaseName,
      status: row.status || 'pending',
      createdAt: row.createdAt?.toISOString() || row.createdAt,
      updatedAt: row.updatedAt?.toISOString() || row.updatedAt,
      totalFixes: row.totalFixes || row.totalCount || 0,
      appliedFixes: row.appliedFixes || 0,
      failedFixes: row.failedFixes || 0,
      // Summary stats for dev view
      totalCount: row.totalCount || 0,
      severityCounts,
      topIssues,
      affectedTablesCount: affectedTables.size,
      affectedTables: Array.from(affectedTables).slice(0, 10)
    };
  });
};

export const getRecommendationById = async (id: string): Promise<Recommendation | null> => {
  const result = await Database.query<any>(
    `SELECT
      rp.id,
      rp.scan_run_id as "connectionId",
      COALESCE(rp.status, 'pending') as status,
      rp.created_at as "createdAt",
      rp.generated_at as "updatedAt",
      rp.total_fixes as "totalFixes",
      rp.applied_fixes as "appliedFixes",
      rp.failed_fixes as "failedFixes"
    FROM recommendation_packs rp
    WHERE rp.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    connectionId: row.connectionId,
    status: row.status || 'pending',
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt,
    totalFixes: row.totalFixes || 0,
    appliedFixes: row.appliedFixes || 0,
    failedFixes: row.failedFixes || 0
  };
};

// Update pack status based on applied/failed counts
export const updatePackStatus = async (id: string): Promise<Recommendation | null> => {
  // Get current counts
  const result = await Database.query<any>(
    `SELECT
      total_fixes as "totalFixes",
      applied_fixes as "appliedFixes",
      failed_fixes as "failedFixes",
      status
    FROM recommendation_packs
    WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const { totalFixes, appliedFixes, failedFixes, status } = result.rows[0];

  // Don't update if rejected
  if (status === 'rejected') {
    return getRecommendationById(id);
  }

  // Calculate new status
  let newStatus: string;
  const totalProcessed = (appliedFixes || 0) + (failedFixes || 0);

  if (totalProcessed === 0) {
    newStatus = 'pending';
  } else if (totalProcessed < (totalFixes || 0)) {
    newStatus = 'processing';
  } else if ((failedFixes || 0) > 0) {
    newStatus = 'completed_with_errors';
  } else {
    newStatus = 'completed';
  }

  // Update status
  await Database.query<any>(
    `UPDATE recommendation_packs SET status = $1 WHERE id = $2`,
    [newStatus, id]
  );

  return getRecommendationById(id);
};

// Increment applied fixes count
export const incrementAppliedFix = async (id: string): Promise<void> => {
  await Database.query<any>(
    `UPDATE recommendation_packs
     SET applied_fixes = COALESCE(applied_fixes, 0) + 1
     WHERE id = $1`,
    [id]
  );
  await updatePackStatus(id);
};

// Increment failed fixes count
export const incrementFailedFix = async (id: string): Promise<void> => {
  await Database.query<any>(
    `UPDATE recommendation_packs
     SET failed_fixes = COALESCE(failed_fixes, 0) + 1
     WHERE id = $1`,
    [id]
  );
  await updatePackStatus(id);
};

export const rejectRecommendation = async (id: string, _reason?: string): Promise<Recommendation | null> => {
  // Check if recommendation exists
  const existing = await getRecommendationById(id);
  if (!existing) {
    return null;
  }

  // Update status directly in recommendation_packs
  await Database.query<any>(
    `UPDATE recommendation_packs SET status = 'rejected' WHERE id = $1`,
    [id]
  );

  return getRecommendationById(id);
};

export interface RecommendationPackInput {
  scanRunId: string;
  tenantId: string;
  recommendations: any[]; // Array of recommendation objects from Agent
}

export interface RecommendationPackDetail {
  id: string;
  scanRunId: string;
  tenantId: string;
  recommendations: any[];
  generatedAt: string;
  createdAt: string;
  status: string;
  totalFixes: number;
  appliedFixes: number;
  failedFixes: number;
  connectionId?: string;
  connectionName?: string;
  databaseName?: string;
}

export const createRecommendationPack = async (input: RecommendationPackInput): Promise<RecommendationPackDetail> => {
  // Get connection_profile_id from scan_run
  const scanRunResult = await Database.query<any>(
    `SELECT connection_profile_id FROM scan_runs WHERE id = $1`,
    [input.scanRunId]
  );

  if (scanRunResult.rows.length > 0) {
    const connectionId = scanRunResult.rows[0].connection_profile_id;

    // Archive all existing active packs for this connection
    await Database.query<any>(
      `UPDATE recommendation_packs rp
       SET archived_at = NOW()
       FROM scan_runs sr
       WHERE rp.scan_run_id = sr.id
         AND sr.connection_profile_id = $1
         AND rp.archived_at IS NULL`,
      [connectionId]
    );
  }

  const totalFixes = input.recommendations?.length || 0;

  // Create new pack (will be the only active one for this connection)
  const result = await Database.query<any>(
    `INSERT INTO recommendation_packs (scan_run_id, tenant_id, recommendations, status, total_fixes, applied_fixes, failed_fixes, generated_at)
    VALUES ($1, $2, $3, 'pending', $4, 0, 0, NOW())
    RETURNING id, scan_run_id as "scanRunId", tenant_id as "tenantId", recommendations,
      status, total_fixes as "totalFixes", applied_fixes as "appliedFixes", failed_fixes as "failedFixes",
      generated_at as "generatedAt", created_at as "createdAt"`,
    [input.scanRunId, input.tenantId, JSON.stringify(input.recommendations), totalFixes]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    scanRunId: row.scanRunId,
    tenantId: row.tenantId,
    recommendations: row.recommendations,
    generatedAt: row.generatedAt?.toISOString() || row.generatedAt,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    status: row.status || 'pending',
    totalFixes: row.totalFixes || 0,
    appliedFixes: row.appliedFixes || 0,
    failedFixes: row.failedFixes || 0
  };
};

export const getRecommendationPackDetail = async (id: string): Promise<RecommendationPackDetail | null> => {
  const result = await Database.query<any>(
    `SELECT
      rp.id,
      rp.scan_run_id as "scanRunId",
      rp.tenant_id as "tenantId",
      rp.recommendations,
      rp.generated_at as "generatedAt",
      rp.created_at as "createdAt",
      COALESCE(rp.status, 'pending') as status,
      COALESCE(rp.total_fixes, jsonb_array_length(rp.recommendations)) as "totalFixes",
      COALESCE(rp.applied_fixes, 0) as "appliedFixes",
      COALESCE(rp.failed_fixes, 0) as "failedFixes",
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName"
    FROM recommendation_packs rp
    LEFT JOIN scan_runs sr ON sr.id = rp.scan_run_id
    LEFT JOIN connection_profiles cp ON cp.id = sr.connection_profile_id
    WHERE rp.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    scanRunId: row.scanRunId,
    tenantId: row.tenantId,
    recommendations: row.recommendations,
    generatedAt: row.generatedAt?.toISOString() || row.generatedAt,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    status: row.status,
    totalFixes: row.totalFixes || 0,
    appliedFixes: row.appliedFixes || 0,
    failedFixes: row.failedFixes || 0,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    databaseName: row.databaseName
  };
};
