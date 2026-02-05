-- Rollback: 002_add_kill_switch
-- Description: Drop kill switch table and index

DROP TABLE IF EXISTS kill_switch_settings;
DROP INDEX IF EXISTS idx_kill_switch_settings_tenant_id;