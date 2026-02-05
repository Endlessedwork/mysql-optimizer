import { Database } from '../database';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLog {
  id: string;
  action: string;
  connectionId: string;
  timestamp: string;
  userId: string;
  details?: object;
}

export const getAuditLogs = async (filters: { action?: string; connectionId?: string; dateRange?: string }): Promise<AuditLog[]> => {
  let query = `
    SELECT 
      id,
      action,
      resource_id as "connectionId",
      created_at as timestamp,
      user_id as "userId",
      details
    FROM audit_logs
  `;
  
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters.action) {
    conditions.push(`action = $${paramIndex}`);
    params.push(filters.action);
    paramIndex++;
  }
  
  if (filters.connectionId) {
    conditions.push(`resource_id = $${paramIndex}`);
    params.push(filters.connectionId);
    paramIndex++;
  }
  
  if (filters.dateRange) {
    // Parse date range (e.g., "2024-01-01,2024-12-31")
    const [startDate, endDate] = filters.dateRange.split(',');
    if (startDate && endDate) {
      conditions.push(`created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`);
      params.push(startDate, endDate);
      paramIndex += 2;
    }
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC';
  
  const result = await Database.query<any>(query, params);
  
  return result.rows.map(row => ({
    id: row.id,
    action: row.action,
    connectionId: row.connectionId,
    timestamp: row.timestamp?.toISOString() || row.timestamp,
    userId: row.userId,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
  }));
};

export const createAuditLog = async (auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
  const id = uuidv4();
  
  const result = await Database.query<any>(
    `INSERT INTO audit_logs (id, action, resource_type, resource_id, user_id, tenant_id, details, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id, action, resource_id as "connectionId", created_at as timestamp, user_id as "userId", details`,
    [
      id,
      auditData.action,
      'connection', // resource_type
      auditData.connectionId,
      auditData.userId,
      null, // tenant_id - would need to be passed in for multi-tenant
      auditData.details ? JSON.stringify(auditData.details) : null
    ]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    action: row.action,
    connectionId: row.connectionId,
    timestamp: row.timestamp?.toISOString() || row.timestamp,
    userId: row.userId,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
  };
};

export const getAuditLogsByResourceId = async (resourceId: string, resourceType: string = 'connection'): Promise<AuditLog[]> => {
  const result = await Database.query<any>(
    `SELECT 
      id,
      action,
      resource_id as "connectionId",
      created_at as timestamp,
      user_id as "userId",
      details
    FROM audit_logs
    WHERE resource_id = $1 AND resource_type = $2
    ORDER BY created_at DESC`,
    [resourceId, resourceType]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    action: row.action,
    connectionId: row.connectionId,
    timestamp: row.timestamp?.toISOString() || row.timestamp,
    userId: row.userId,
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
  }));
};
