import { Database } from '../database';
import crypto from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.API_SECRET || 'default_secret_key_32_chars_long!';
  // Derive a 32-byte key from API_SECRET using SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptPassword(password: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptPassword(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export interface Connection {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface ConnectionDetail extends Connection {
  host: string;
  port: number;
  username: string;
  databaseName: string | null;
  tenantId: string | null;
}

export interface CreateConnectionInput {
  tenantId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName?: string;
}

export interface UpdateConnectionInput {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  databaseName?: string;
}

export const getConnections = async (): Promise<ConnectionDetail[]> => {
  const result = await Database.query<any>(
    `SELECT id, tenant_id as "tenantId", name, host, port, username, database_name as "databaseName",
      CASE WHEN is_active THEN 'active' ELSE 'disabled' END as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"
    FROM connection_profiles`
  );
  return result.rows.map(row => ({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    databaseName: row.databaseName,
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

export const getConnectionDetailById = async (id: string): Promise<ConnectionDetail | null> => {
  const result = await Database.query<any>(
    `SELECT id, tenant_id as "tenantId", name, host, port, username, database_name as "databaseName",
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
    tenantId: row.tenantId,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    databaseName: row.databaseName,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};

export const createConnection = async (input: CreateConnectionInput): Promise<ConnectionDetail> => {
  const encryptedPassword = encryptPassword(input.password);
  
  const result = await Database.query<any>(
    `INSERT INTO connection_profiles (tenant_id, name, host, port, username, database_name, encrypted_password, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    RETURNING id, tenant_id as "tenantId", name, host, port, username, database_name as "databaseName",
      'active' as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"`,
    [input.tenantId, input.name, input.host, input.port, input.username, input.databaseName || null, encryptedPassword]
  );
  
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    databaseName: row.databaseName,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};

export const updateConnection = async (id: string, input: UpdateConnectionInput): Promise<ConnectionDetail | null> => {
  // Build dynamic update query
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.host !== undefined) {
    updates.push(`host = $${paramIndex++}`);
    values.push(input.host);
  }
  if (input.port !== undefined) {
    updates.push(`port = $${paramIndex++}`);
    values.push(input.port);
  }
  if (input.username !== undefined) {
    updates.push(`username = $${paramIndex++}`);
    values.push(input.username);
  }
  if (input.password !== undefined) {
    updates.push(`encrypted_password = $${paramIndex++}`);
    values.push(encryptPassword(input.password));
  }
  if (input.databaseName !== undefined) {
    updates.push(`database_name = $${paramIndex++}`);
    values.push(input.databaseName);
  }
  
  if (updates.length === 0) {
    return getConnectionDetailById(id);
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const result = await Database.query<any>(
    `UPDATE connection_profiles 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, tenant_id as "tenantId", name, host, port, username, database_name as "databaseName",
      CASE WHEN is_active THEN 'active' ELSE 'disabled' END as status,
      created_at as "createdAt", 
      updated_at as "updatedAt"`,
    values
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    databaseName: row.databaseName,
    status: row.status,
    createdAt: row.createdAt?.toISOString() || row.createdAt,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};

export const deleteConnection = async (id: string): Promise<boolean> => {
  // Check if connection has any scan_runs
  const scanRunsCheck = await Database.query<any>(
    `SELECT COUNT(*) as count FROM scan_runs WHERE connection_profile_id = $1`,
    [id]
  );
  
  const hasScans = parseInt(scanRunsCheck.rows[0].count) > 0;
  
  if (hasScans) {
    // Soft delete - just disable the connection
    const result = await Database.query<any>(
      `UPDATE connection_profiles SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows.length > 0;
  } else {
    // Hard delete - no associated data
    const result = await Database.query<any>(
      `DELETE FROM connection_profiles WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows.length > 0;
  }
};

export const getConnectionCredentials = async (id: string): Promise<{ host: string; port: number; username: string; password: string; databaseName: string | null } | null> => {
  const result = await Database.query<any>(
    `SELECT host, port, username, encrypted_password, database_name as "databaseName"
    FROM connection_profiles 
    WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: decryptPassword(row.encrypted_password),
    databaseName: row.databaseName
  };
};
