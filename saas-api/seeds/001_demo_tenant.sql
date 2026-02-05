-- Seed: 001_demo_tenant
-- Description: Create demo tenant for MySQL Production Optimizer

INSERT INTO tenants (id, name, created_at, updated_at) VALUES 
('11111111-1111-1111-1111-111111111111', 'Demo Tenant', NOW(), NOW());