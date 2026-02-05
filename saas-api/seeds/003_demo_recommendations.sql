-- Seed: 003_demo_recommendations
-- Description: Create demo recommendations for MySQL Production Optimizer

-- Insert demo scan run
INSERT INTO scan_runs (id, tenant_id, connection_profile_id, status, created_at, updated_at) VALUES 
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'completed', NOW(), NOW());

-- Insert demo recommendation pack
INSERT INTO recommendation_packs (id, scan_run_id, tenant_id, recommendations, generated_at, created_at) VALUES 
('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 
'[
  {
    "id": "r1",
    "type": "index",
    "description": "Add index on user_id column",
    "sql": "CREATE INDEX idx_user_id ON users(user_id);",
    "impact": "High",
    "estimated_improvement": "40%"
  },
  {
    "id": "r2", 
    "type": "query",
    "description": "Rewrite query to use JOIN instead of subquery",
    "sql": "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id;",
    "impact": "Medium",
    "estimated_improvement": "25%"
  }
]', NOW(), NOW());

-- Insert demo approval
INSERT INTO approvals (id, recommendation_pack_id, approved_by, approved_at, status, created_at) VALUES 
('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'admin_user_id', NOW(), 'approved', NOW());