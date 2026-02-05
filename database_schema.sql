-- MySQL Production Optimizer Database Schema
-- สำหรับ SaaS ระบบวิเคราะห์ประสิทธิภาพ MySQL

-- 1. Tenants (Multi-tenant support)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Connection Profiles (ไม่เก็บ password plaintext)
CREATE TABLE connection_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER DEFAULT 3306,
    username VARCHAR(255) NOT NULL,
    database_name VARCHAR(255),
    encrypted_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scan Runs
CREATE TABLE scan_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    connection_profile_id UUID REFERENCES connection_profiles(id),
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Schema Snapshots
CREATE TABLE schema_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_run_id UUID REFERENCES scan_runs(id),
    tables JSONB,
    columns JSONB,
    indexes JSONB,
    views JSONB,
    procedures JSONB,
    functions JSONB,
    triggers JSONB,
    events JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Query Digests
CREATE TABLE query_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_run_id UUID REFERENCES scan_runs(id),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_run_id UUID REFERENCES scan_runs(id),
    tenant_id UUID REFERENCES tenants(id),
    recommendations JSONB,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Approvals
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_pack_id UUID REFERENCES recommendation_packs(id),
    approved_by UUID, -- ผู้อนุมัติ
    approved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Execution History
CREATE TABLE execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES approvals(id),
    executed_at TIMESTAMP,
    execution_status VARCHAR(50), -- success, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Verification Metrics
CREATE TABLE verification_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES execution_history(id),
    before_metrics JSONB,
    after_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id UUID,
    details JSONB,
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