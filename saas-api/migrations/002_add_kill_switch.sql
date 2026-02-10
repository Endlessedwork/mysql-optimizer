-- Migration: 002_add_kill_switch (PostgreSQL)
-- Description: Add kill switch functionality

CREATE TABLE IF NOT EXISTS kill_switch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    is_active BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kill_switch_settings_tenant_id
  ON kill_switch_settings(tenant_id) NULLS NOT DISTINCT;

COMMENT ON TABLE kill_switch_settings IS 'tenant_id IS NULL = global kill switch; otherwise = per-connection';
