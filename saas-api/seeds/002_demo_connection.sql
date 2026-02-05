-- Seed: 002_demo_connection
-- Description: Create demo connection profile for MySQL Production Optimizer

INSERT INTO connection_profiles (id, tenant_id, name, host, port, username, database_name, encrypted_password, is_active, created_at, updated_at) VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Demo Connection', 'localhost', 3306, 'demo_user', 'demo_database', 'encrypted_password_123', TRUE, NOW(), NOW());