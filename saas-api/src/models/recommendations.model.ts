import { Database } from '../database';

export interface Recommendation {
  id: string;
  connectionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'executed';
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  reason?: string;
}

export const getRecommendations = async (filters: { connectionId?: string; status?: string }): Promise<Recommendation[]> => {
  let query = `
    SELECT 
      rp.id,
      rp.scan_run_id as "connectionId",
      COALESCE(a.status, 'pending') as status,
      rp.created_at as "createdAt",
      rp.generated_at as "updatedAt",
      a.approved_at as "scheduledAt",
      a.rejection_reason as reason
    FROM recommendation_packs rp
    LEFT JOIN approvals a ON a.recommendation_pack_id = rp.id
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters.connectionId) {
    conditions.push(`rp.scan_run_id = $${paramIndex}`);
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
  
  return result.rows.map(row => ({
    id: row.id,
    connectionId: row.connectionId,
    status: row.status || 'pending',
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt,
    scheduledAt: row.scheduledAt?.toISOString() || row.scheduledAt,
    reason: row.reason
  }));
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

export const approveRecommendation = async (id: string): Promise<Recommendation | null> => {
  // Check if recommendation exists and is pending
  const existing = await getRecommendationById(id);
  if (!existing || existing.status !== 'pending') {
    return null;
  }
  
  // Create or update approval
  const result = await Database.query<any>(
    `INSERT INTO approvals (id, recommendation_pack_id, status, approved_at, created_at)
    VALUES (gen_random_uuid(), $1, 'approved', NOW(), NOW())
    ON CONFLICT (recommendation_pack_id) 
    DO UPDATE SET status = 'approved', approved_at = NOW()
    RETURNING id`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return getRecommendationById(id);
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
  
  // Create or update approval as rejected
  await Database.query<any>(
    `INSERT INTO approvals (id, recommendation_pack_id, status, rejection_reason, created_at)
    VALUES (gen_random_uuid(), $1, 'rejected', $2, NOW())
    ON CONFLICT (recommendation_pack_id) 
    DO UPDATE SET status = 'rejected', rejection_reason = $2`,
    [id, reason]
  );
  
  return getRecommendationById(id);
};
