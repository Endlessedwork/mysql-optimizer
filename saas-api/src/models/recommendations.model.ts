import { Database } from '../database';

export interface Recommendation {
  id: string;
  connectionId: string;
  connectionName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'executed';
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  reason?: string;
}

export const getRecommendations = async (filters: { connectionId?: string; status?: string; includeArchived?: boolean }): Promise<Recommendation[]> => {
  let query = `
    SELECT
      rp.id,
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName",
      COALESCE(a.status, 'pending') as status,
      rp.created_at as "createdAt",
      rp.generated_at as "updatedAt",
      a.approved_at as "scheduledAt",
      a.rejection_reason as reason,
      rp.recommendations as "rawRecommendations",
      jsonb_array_length(rp.recommendations) as "totalCount",
      rp.archived_at as "archivedAt"
    FROM recommendation_packs rp
    LEFT JOIN approvals a ON a.recommendation_pack_id = rp.id
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
    conditions.push(`COALESCE(a.status, 'pending') = $${paramIndex}`);
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
      scheduledAt: row.scheduledAt?.toISOString() || row.scheduledAt,
      reason: row.reason,
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
      COALESCE(a.status, 'pending') as status,
      rp.created_at as "createdAt",
      rp.generated_at as "updatedAt",
      a.approved_at as "scheduledAt",
      a.rejection_reason as reason
    FROM recommendation_packs rp
    LEFT JOIN approvals a ON a.recommendation_pack_id = rp.id
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
    scheduledAt: row.scheduledAt?.toISOString() || row.scheduledAt,
    reason: row.reason
  };
};

export interface ApproveResult extends Recommendation {
  approvalId?: string;
  executionId?: string;
}

export const approveRecommendation = async (id: string): Promise<ApproveResult | null> => {
  // Check if recommendation exists and is pending
  const existing = await getRecommendationById(id);
  if (!existing || existing.status !== 'pending') {
    return null;
  }
  
  let approvalId: string;
  
  // Check if approval already exists
  const existingApproval = await Database.query<any>(
    `SELECT id FROM approvals WHERE recommendation_pack_id = $1`,
    [id]
  );
  
  if (existingApproval.rows.length > 0) {
    // Update existing approval
    await Database.query<any>(
      `UPDATE approvals SET status = 'approved', approved_at = NOW() WHERE recommendation_pack_id = $1`,
      [id]
    );
    approvalId = existingApproval.rows[0].id;
  } else {
    // Create new approval
    const approvalResult = await Database.query<any>(
      `INSERT INTO approvals (id, recommendation_pack_id, status, approved_at, created_at)
      VALUES (gen_random_uuid(), $1, 'approved', NOW(), NOW())
      RETURNING id`,
      [id]
    );
    approvalId = approvalResult.rows[0].id;
  }
  
  // Auto-create execution record for the Agent to pick up
  const executionResult = await Database.query<any>(
    `INSERT INTO execution_history (approval_id, execution_status, created_at)
    VALUES ($1, 'pending', NOW())
    RETURNING id`,
    [approvalId]
  );
  const executionId = executionResult.rows[0].id;
  
  const result = await getRecommendationById(id);
  return result ? { ...result, approvalId, executionId } : null;
};

export const scheduleRecommendation = async (id: string, scheduledAt: string, reason?: string): Promise<Recommendation | null> => {
  // Check if recommendation exists and is approved
  const existing = await getRecommendationById(id);
  if (!existing || existing.status !== 'approved') {
    return null;
  }
  
  // Update approval to scheduled
  await Database.query<any>(
    `UPDATE approvals 
    SET status = 'scheduled', approved_at = $2
    WHERE recommendation_pack_id = $1`,
    [id, scheduledAt]
  );
  
  return getRecommendationById(id);
};

export const rejectRecommendation = async (id: string, reason?: string): Promise<Recommendation | null> => {
  // Check if recommendation exists
  const existing = await getRecommendationById(id);
  if (!existing) {
    return null;
  }
  
  // Check if approval already exists
  const existingApproval = await Database.query<any>(
    `SELECT id FROM approvals WHERE recommendation_pack_id = $1`,
    [id]
  );
  
  if (existingApproval.rows.length > 0) {
    // Update existing approval
    await Database.query<any>(
      `UPDATE approvals SET status = 'rejected', rejection_reason = $2 WHERE recommendation_pack_id = $1`,
      [id, reason]
    );
  } else {
    // Create new rejection
    await Database.query<any>(
      `INSERT INTO approvals (id, recommendation_pack_id, status, rejection_reason, created_at)
      VALUES (gen_random_uuid(), $1, 'rejected', $2, NOW())`,
      [id, reason]
    );
  }
  
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
  approvalId?: string;
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

  // Create new pack (will be the only active one for this connection)
  const result = await Database.query<any>(
    `INSERT INTO recommendation_packs (scan_run_id, tenant_id, recommendations, generated_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, scan_run_id as "scanRunId", tenant_id as "tenantId", recommendations,
      generated_at as "generatedAt", created_at as "createdAt"`,
    [input.scanRunId, input.tenantId, JSON.stringify(input.recommendations)]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    scanRunId: row.scanRunId,
    tenantId: row.tenantId,
    recommendations: row.recommendations,
    generatedAt: row.generatedAt?.toISOString() || row.generatedAt,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    status: 'pending'
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
      COALESCE(a.status, 'pending') as status,
      a.id as "approvalId",
      sr.connection_profile_id as "connectionId",
      cp.name as "connectionName",
      cp.database_name as "databaseName"
    FROM recommendation_packs rp
    LEFT JOIN approvals a ON a.recommendation_pack_id = rp.id
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
    approvalId: row.approvalId,
    connectionId: row.connectionId,
    connectionName: row.connectionName,
    databaseName: row.databaseName
  };
};
