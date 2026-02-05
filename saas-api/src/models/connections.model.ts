import { Database } from '../database';

export interface Connection {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export const getConnections = async (): Promise<Connection[]> => {
  const result = await Database.query<any>(
    `SELECT id, name, 
      CASE WHEN is_active THEN 'active' ELSE 'disabled' END as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM connection_profiles`
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  }));
};

export const getConnectionById = async (id: string): Promise<Connection | null> => {
  const result = await Database.query<any>(
    `SELECT id, name, 
      CASE WHEN is_active THEN 'active' ELSE 'disabled' END as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM connection_profiles 
    WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};

export const updateConnectionStatus = async (id: string, status: 'active' | 'disabled'): Promise<Connection | null> => {
  const isActive = status === 'active';
  
  const result = await Database.query<any>(
    `UPDATE connection_profiles 
    SET is_active = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, 
      CASE WHEN is_active THEN 'active' ELSE 'disabled' END as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"`,
    [isActive, id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};
