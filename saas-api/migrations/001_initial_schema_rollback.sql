-- Rollback: 001_initial_schema
-- Description: Drop all tables created in initial schema migration

DROP TABLE IF EXISTS verification_metrics;
DROP TABLE IF EXISTS execution_history;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS recommendation_packs;
DROP TABLE IF EXISTS query_digests;
DROP TABLE IF EXISTS schema_snapshots;
DROP TABLE IF EXISTS scan_runs;
DROP TABLE IF EXISTS connection_profiles;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS audit_logs;