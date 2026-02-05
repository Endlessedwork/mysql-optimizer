-- Seed: 004_demo_executions
-- Description: Create demo executions for MySQL Production Optimizer

-- Insert demo execution
INSERT INTO execution_history (id, approval_id, executed_at, execution_status, created_at) VALUES 
('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', NOW(), 'success', NOW());

-- Insert demo verification metrics
INSERT INTO verification_metrics (id, execution_id, before_metrics, after_metrics, created_at) VALUES 
('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 
'{
  "query_count": 100,
  "avg_response_time": 150.5,
  "total_rows_examined": 50000
}',
'{
  "query_count": 100,
  "avg_response_time": 90.2,
  "total_rows_examined": 30000
}', NOW());