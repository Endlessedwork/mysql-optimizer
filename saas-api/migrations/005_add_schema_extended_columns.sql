-- Migration: 005_add_schema_extended_columns
-- Description: Add extended schema columns (foreign_keys, table_stats, index_usage, index_cardinality, lock_stats)
-- These columns store data the Agent already collects but was not persisted

ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS foreign_keys JSON;
ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS table_stats JSON;
ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS index_usage JSON;
ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS index_cardinality JSON;
ALTER TABLE schema_snapshots ADD COLUMN IF NOT EXISTS lock_stats JSON;
