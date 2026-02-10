import { Database } from '../database';

export interface KillSwitchStatus {
  global: boolean;
  connections: {
    connectionId: string;
    enabled: boolean;
  }[];
}

export interface ConnectionKillSwitch {
  connectionId: string;
  enabled: boolean;
  reason?: string;
  updatedAt: string;
}

export const getKillSwitchStatus = async (): Promise<KillSwitchStatus> => {
  // Get global kill switch status (tenant_id is null for global)
  const globalResult = await Database.query<any>(
    `SELECT is_active FROM kill_switch_settings WHERE tenant_id IS NULL LIMIT 1`
  );
  
  // Get connection kill switch statuses (tenant_id is not null for connections)
  const connectionResult = await Database.query<any>(
    `SELECT tenant_id as "connectionId", is_active as enabled
    FROM kill_switch_settings
    WHERE tenant_id IS NOT NULL`
  );
  
  return {
    global: globalResult.rows.length > 0 ? globalResult.rows[0].is_active : false,
    connections: connectionResult.rows.map((row: any) => ({
      connectionId: row.connectionId,
      enabled: row.enabled
    }))
  };
};

export const getGlobalKillSwitchStatus = async (): Promise<{ enabled: boolean }> => {
  const result = await Database.query<any>(
    `SELECT is_active FROM kill_switch_settings WHERE tenant_id IS NULL LIMIT 1`
  );
  
  return {
    enabled: result.rows.length > 0 ? result.rows[0].is_active : false
  };
};

export const getConnectionKillSwitchStatuses = async (): Promise<{ connectionId: string; enabled: boolean }[]> => {
  const result = await Database.query<any>(
    `SELECT tenant_id as "connectionId", is_active as enabled
    FROM kill_switch_settings
    WHERE tenant_id IS NOT NULL`
  );
  
  return result.rows.map((row: any) => ({
    connectionId: row.connectionId,
    enabled: row.enabled
  }));
};

export const toggleKillSwitch = async (connectionId: string, enabled: boolean, reason?: string): Promise<ConnectionKillSwitch | null> => {
  // Check if connection exists
  const connectionResult = await Database.query<any>(
    `SELECT id FROM connection_profiles WHERE id = $1`,
    [connectionId]
  );
  
  if (connectionResult.rows.length === 0) {
    return null;
  }
  
  // Upsert kill switch setting
  const result = await Database.query<any>(
    `INSERT INTO kill_switch_settings (id, tenant_id, is_active, reason, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
    ON CONFLICT (tenant_id) 
    DO UPDATE SET is_active = $2, reason = $3, updated_at = NOW()
    RETURNING tenant_id as "connectionId", is_active as enabled, reason, updated_at as "updatedAt"`,
    [connectionId, enabled, reason]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    connectionId: row.connectionId,
    enabled: row.enabled,
    reason: row.reason,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};

export const toggleGlobalKillSwitch = async (enabled: boolean, reason?: string): Promise<{ enabled: boolean; reason?: string; updatedAt: string } | null> => {
  // Upsert global kill switch setting (tenant_id is null)
  const result = await Database.query<any>(
    `INSERT INTO kill_switch_settings (id, tenant_id, is_active, reason, created_at, updated_at)
    VALUES (gen_random_uuid(), NULL, $1, $2, NOW(), NOW())
    ON CONFLICT (tenant_id)
    DO UPDATE SET is_active = $1, reason = $2, updated_at = NOW()
    RETURNING is_active as enabled, reason, updated_at as "updatedAt"`,
    [enabled, reason]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    enabled: row.enabled,
    reason: row.reason,
    updatedAt: row.updatedAt?.toISOString() || row.updatedAt
  };
};
