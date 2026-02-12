import { Database } from './database';

interface MigrationStatus {
  tableName: string;
  exists: boolean;
}

// List of all required tables
const REQUIRED_TABLES = [
  'tenants',
  'connection_profiles',
  'scan_runs',
  'schema_snapshots',
  'query_digests',
  'recommendation_packs',
  'approvals',
  'execution_history',
  'verification_metrics',
  'audit_logs',
  'kill_switch_settings'
];

// PostgreSQL schema for creating tables
const SCHEMA_SQL = `
-- 1. Tenants (Multi-tenant support)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Connection Profiles
CREATE TABLE IF NOT EXISTS connection_profiles (
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
CREATE TABLE IF NOT EXISTS scan_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    connection_profile_id UUID REFERENCES connection_profiles(id),
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Schema Snapshots
CREATE TABLE IF NOT EXISTS schema_snapshots (
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
CREATE TABLE IF NOT EXISTS query_digests (
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
CREATE TABLE IF NOT EXISTS recommendation_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_run_id UUID REFERENCES scan_runs(id),
    tenant_id UUID REFERENCES tenants(id),
    recommendations JSONB,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, completed_with_errors, rejected
    total_fixes INTEGER DEFAULT 0,
    applied_fixes INTEGER DEFAULT 0,
    failed_fixes INTEGER DEFAULT 0,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Approvals
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_pack_id UUID REFERENCES recommendation_packs(id),
    approved_by UUID,
    approved_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index for approvals (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_recommendation_pack_id_unique 
ON approvals(recommendation_pack_id);

-- 8. Execution History
CREATE TABLE IF NOT EXISTS execution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES approvals(id),
    executed_at TIMESTAMP,
    execution_status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Verification Metrics
CREATE TABLE IF NOT EXISTS verification_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES execution_history(id),
    before_metrics JSONB,
    after_metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID,
    entity_type VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id UUID,
    changes JSONB,
    details JSONB,
    performed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Kill Switch Settings
CREATE TABLE IF NOT EXISTS kill_switch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    is_active BOOLEAN DEFAULT FALSE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique index for kill_switch_settings (tenant_id can be NULL for global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_kill_switch_settings_tenant_id 
ON kill_switch_settings(tenant_id) NULLS NOT DISTINCT;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_connection_profiles_tenant_id ON connection_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_runs_tenant_id ON scan_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scan_runs_connection_profile_id ON scan_runs(connection_profile_id);
CREATE INDEX IF NOT EXISTS idx_query_digests_scan_run_id ON query_digests(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_packs_scan_run_id ON recommendation_packs(scan_run_id);
CREATE INDEX IF NOT EXISTS idx_approvals_recommendation_pack_id ON approvals(recommendation_pack_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_approval_id ON execution_history(approval_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Add new columns to recommendation_packs for status tracking (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendation_packs' AND column_name = 'status') THEN
        ALTER TABLE recommendation_packs ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendation_packs' AND column_name = 'total_fixes') THEN
        ALTER TABLE recommendation_packs ADD COLUMN total_fixes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendation_packs' AND column_name = 'applied_fixes') THEN
        ALTER TABLE recommendation_packs ADD COLUMN applied_fixes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendation_packs' AND column_name = 'failed_fixes') THEN
        ALTER TABLE recommendation_packs ADD COLUMN failed_fixes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recommendation_packs' AND column_name = 'archived_at') THEN
        ALTER TABLE recommendation_packs ADD COLUMN archived_at TIMESTAMP DEFAULT NULL;
    END IF;
END $$;

-- Update existing packs: set total_fixes from recommendations array length
UPDATE recommendation_packs
SET total_fixes = COALESCE(jsonb_array_length(recommendations), 0)
WHERE total_fixes = 0 OR total_fixes IS NULL;
`;

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const result = await Database.query<any>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    return false;
  }
}

async function checkMigrationStatus(): Promise<MigrationStatus[]> {
  const status: MigrationStatus[] = [];
  
  for (const tableName of REQUIRED_TABLES) {
    const exists = await checkTableExists(tableName);
    status.push({ tableName, exists });
  }
  
  return status;
}

export async function runMigrations(): Promise<{ success: boolean; message: string }> {
  console.log('Checking database schema...');
  
  try {
    const status = await checkMigrationStatus();
    const missingTables = status.filter(s => !s.exists);
    
    if (missingTables.length === 0) {
      console.log('All required tables exist. Skipping migrations.');
      return { success: true, message: 'Schema up to date' };
    }
    
    console.log(`Missing tables: ${missingTables.map(t => t.tableName).join(', ')}`);
    console.log('Running migrations...');
    
    // Run the schema SQL (uses CREATE TABLE IF NOT EXISTS, so it's safe)
    await Database.query(SCHEMA_SQL);
    
    // Verify all tables exist now
    const postStatus = await checkMigrationStatus();
    const stillMissing = postStatus.filter(s => !s.exists);
    
    if (stillMissing.length > 0) {
      console.error('Some tables still missing after migration:', stillMissing.map(t => t.tableName).join(', '));
      return { success: false, message: `Failed to create tables: ${stillMissing.map(t => t.tableName).join(', ')}` };
    }
    
    console.log('Migrations completed successfully.');
    return { success: true, message: `Created tables: ${missingTables.map(t => t.tableName).join(', ')}` };
  } catch (error: any) {
    console.error('Migration error:', error.message);
    return { success: false, message: error.message };
  }
}

export async function seedDefaultTenant(): Promise<void> {
  try {
    // Check if any tenant exists
    const result = await Database.query<any>('SELECT COUNT(*) as count FROM tenants');
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('No tenants found. Creating default tenant...');
      
      // Create default tenant
      const tenantResult = await Database.query<any>(
        `INSERT INTO tenants (name) VALUES ('Default Tenant') RETURNING id`
      );
      
      const tenantId = tenantResult.rows[0].id;
      console.log(`Created default tenant with ID: ${tenantId}`);
      
      // Set TENANT_ID environment variable for this session
      process.env.TENANT_ID = tenantId;
      
      // Seed default kill switch setting (global)
      await seedKillSwitchSetting(tenantId);
    } else {
      // Get first tenant for default
      const tenantResult = await Database.query<any>('SELECT id FROM tenants LIMIT 1');
      process.env.TENANT_ID = tenantResult.rows[0].id;
      console.log(`Using existing tenant: ${process.env.TENANT_ID}`);
    }
  } catch (error: any) {
    console.error('Failed to seed default tenant:', error.message);
  }
}

async function seedKillSwitchSetting(tenantId: string): Promise<void> {
  try {
    // Check if global kill switch setting exists
    const result = await Database.query<any>(
      `SELECT COUNT(*) as count FROM kill_switch_settings WHERE tenant_id IS NULL`
    );
    const count = parseInt(result.rows[0].count);
    
    if (count === 0) {
      console.log('Creating global kill switch setting...');
      await Database.query(
        `INSERT INTO kill_switch_settings (tenant_id, is_active, reason) VALUES (NULL, FALSE, 'Initial setup')`
      );
      console.log('Global kill switch setting created (inactive)');
    }
    
    // Check if tenant-specific kill switch exists
    const tenantResult = await Database.query<any>(
      `SELECT COUNT(*) as count FROM kill_switch_settings WHERE tenant_id = $1`,
      [tenantId]
    );
    const tenantCount = parseInt(tenantResult.rows[0].count);
    
    if (tenantCount === 0) {
      console.log('Creating tenant kill switch setting...');
      await Database.query(
        `INSERT INTO kill_switch_settings (tenant_id, is_active, reason) VALUES ($1, FALSE, 'Initial setup')`,
        [tenantId]
      );
      console.log('Tenant kill switch setting created');
    }
  } catch (error: any) {
    console.error('Failed to seed kill switch settings:', error.message);
  }
}

export async function seedSampleData(): Promise<void> {
  const seedEnabled = process.env.SEED_SAMPLE_DATA === 'true';
  
  if (!seedEnabled) {
    console.log('Sample data seeding disabled (set SEED_SAMPLE_DATA=true to enable)');
    return;
  }
  
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    console.error('No TENANT_ID set, cannot seed sample data');
    return;
  }
  
  try {
    // Check if any connections exist
    const connResult = await Database.query<any>(
      `SELECT COUNT(*) as count FROM connection_profiles WHERE tenant_id = $1`,
      [tenantId]
    );
    const connCount = parseInt(connResult.rows[0].count);
    
    if (connCount > 0) {
      console.log('Sample data already exists, skipping seed');
      return;
    }
    
    console.log('Seeding sample data...');
    
    // Create sample connection profile
    const connInsert = await Database.query<any>(
      `INSERT INTO connection_profiles 
        (tenant_id, name, host, port, username, database_name, encrypted_password, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [tenantId, 'Sample MySQL Server', 'mysql', 3306, 'optimizer', 'testdb', 'sample_encrypted_password', true]
    );
    const connectionId = connInsert.rows[0].id;
    console.log(`Created sample connection: ${connectionId}`);
    
    // Create sample scan run
    const scanInsert = await Database.query<any>(
      `INSERT INTO scan_runs 
        (tenant_id, connection_profile_id, status, started_at, completed_at)
       VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour', NOW())
       RETURNING id`,
      [tenantId, connectionId, 'completed']
    );
    const scanRunId = scanInsert.rows[0].id;
    console.log(`Created sample scan run: ${scanRunId}`);
    
    // Create sample recommendation pack
    const sampleRecommendations = [
      {
        id: 'rec_sample001',
        problem_statement: 'full_table_scan',
        evidence: { rows_examined: 50000, table_rows: 50000 },
        severity: 'high',
        fix_options: [
          { id: 'add_index', description: 'Add index on users.email column', implementation: 'CREATE INDEX idx_users_email ON users(email);' }
        ],
        expected_gain: { performance_improvement: 75, resource_savings: 60 }
      },
      {
        id: 'rec_sample002',
        problem_statement: 'filesort',
        evidence: { sort_rows: 10000 },
        severity: 'medium',
        fix_options: [
          { id: 'add_sort_index', description: 'Add composite index for ORDER BY', implementation: 'CREATE INDEX idx_orders_created ON orders(created_at);' }
        ],
        expected_gain: { performance_improvement: 40, resource_savings: 30 }
      }
    ];
    
    const packInsert = await Database.query<any>(
      `INSERT INTO recommendation_packs 
        (scan_run_id, tenant_id, recommendations, generated_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [scanRunId, tenantId, JSON.stringify(sampleRecommendations)]
    );
    const packId = packInsert.rows[0].id;
    console.log(`Created sample recommendation pack: ${packId}`);
    
    // Create sample approval (pending)
    await Database.query(
      `INSERT INTO approvals (recommendation_pack_id, status)
       VALUES ($1, 'pending')`,
      [packId]
    );
    console.log('Created sample approval');
    
    console.log('Sample data seeding completed');
  } catch (error: any) {
    console.error('Failed to seed sample data:', error.message);
  }
}
