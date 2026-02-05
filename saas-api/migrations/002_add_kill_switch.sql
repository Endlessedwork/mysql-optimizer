-- Migration: 002_add_kill_switch
-- Description: Add kill switch functionality to the system

-- 11. Kill Switch Settings
CREATE TABLE kill_switch_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) REFERENCES tenants(id),
    is_active BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add index for kill switch settings
CREATE INDEX idx_kill_switch_settings_tenant_id ON kill_switch_settings(tenant_id);