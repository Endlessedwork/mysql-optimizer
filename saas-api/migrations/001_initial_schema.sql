-- Migration: 001_initial_schema
-- Description: Initial database schema for MySQL Production Optimizer

-- 1. Tenants (Multi-tenant support)
CREATE TABLE tenants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Connection Profiles (ไม่เก็บ password plaintext)
CREATE TABLE connection_profiles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 3306,
    username VARCHAR(255) NOT NULL,
    database_name VARCHAR(255),
    encrypted_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Scan Runs
CREATE TABLE scan_runs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) REFERENCES tenants(id),
    connection_profile_id CHAR(36) REFERENCES connection_profiles(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Schema Snapshots
CREATE TABLE schema_snapshots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    scan_run_id CHAR(36) REFERENCES scan_runs(id),
    tables JSON,
    columns JSON,
    indexes JSON,
    views JSON,
    procedures JSON,
    functions JSON,
    triggers JSON,
    events JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Query Digests
CREATE TABLE query_digests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    scan_run_id CHAR(36) REFERENCES scan_runs(id),
    digest TEXT NOT NULL,
    digest_text TEXT NOT NULL,
    count_star BIGINT DEFAULT 0,
    sum_timer_wait NUMERIC,
    avg_timer_wait NUMERIC,
    min_timer_wait NUMERIC,
    max_timer_wait NUMERIC,
    sum_rows_examined BIGINT DEFAULT 0,
    avg_rows_examined NUMERIC,
    sum_rows_sent BIGINT DEFAULT 0,
    avg_rows_sent NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Recommendation Packs
CREATE TABLE recommendation_packs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    scan_run_id CHAR(36) REFERENCES scan_runs(id),
    tenant_id CHAR(36) REFERENCES tenants(id),
    recommendations JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Approvals
CREATE TABLE approvals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recommendation_pack_id CHAR(36) REFERENCES recommendation_packs(id),
    approved_by CHAR(36), -- ผู้อนุมัติ
    approved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Execution History
CREATE TABLE execution_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    approval_id CHAR(36) REFERENCES approvals(id),
    executed_at TIMESTAMP,
    execution_status VARCHAR(50), -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Verification Metrics
CREATE TABLE verification_metrics (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    execution_id CHAR(36) REFERENCES execution_history(id),
    before_metrics JSON,
    after_metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id CHAR(36) REFERENCES tenants(id),
    user_id CHAR(36),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id CHAR(36),
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_connection_profiles_tenant_id ON connection_profiles(tenant_id);
CREATE INDEX idx_scan_runs_tenant_id ON scan_runs(tenant_id);
CREATE INDEX idx_scan_runs_connection_profile_id ON scan_runs(connection_profile_id);
CREATE INDEX idx_query_digests_scan_run_id ON query_digests(scan_run_id);
CREATE INDEX idx_recommendation_packs_scan_run_id ON recommendation_packs(scan_run_id);
CREATE INDEX idx_approvals_recommendation_pack_id ON approvals(recommendation_pack_id);
CREATE INDEX idx_execution_history_approval_id ON execution_history(approval_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);