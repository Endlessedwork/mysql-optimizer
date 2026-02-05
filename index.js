const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// MySQL connection for customer databases
const createMySQLConnection = (host, port, database, user, password) => {
  return mysql.createConnection({
    host,
    port,
    database,
    user,
    password,
    multipleStatements: true
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Tenant endpoints
app.get('/api/tenants', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM tenants');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tenants', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pgPool.query(
      'INSERT INTO tenants (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connection profile endpoints
app.get('/api/connections', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM connection_profiles');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching connection profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/connections', async (req, res) => {
  try {
    const { tenant_id, name, host, port, database_name, username, encrypted_password } = req.body;
    const result = await pgPool.query(
      'INSERT INTO connection_profiles (tenant_id, name, host, port, database_name, username, encrypted_password) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [tenant_id, name, host, port, database_name, username, encrypted_password]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating connection profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Scan run endpoints
app.get('/api/scans', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM scan_runs');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching scan runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/scans', async (req, res) => {
  try {
    const { tenant_id, connection_profile_id, status } = req.body;
    const result = await pgPool.query(
      'INSERT INTO scan_runs (tenant_id, connection_profile_id, status) VALUES ($1, $2, $3) RETURNING *',
      [tenant_id, connection_profile_id, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating scan run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recommendation endpoints
app.get('/api/recommendations', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM recommendations');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recommendations', async (req, res) => {
  try {
    const { recommendation_pack_id, scan_run_id, type, description, impact_score } = req.body;
    const result = await pgPool.query(
      'INSERT INTO recommendations (recommendation_pack_id, scan_run_id, type, description, impact_score) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [recommendation_pack_id, scan_run_id, type, description, impact_score]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating recommendation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Execute recommendation endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { recommendation_id } = req.body;
    
    // Get recommendation details
    const recommendationResult = await pgPool.query(
      'SELECT * FROM recommendations WHERE id = $1',
      [recommendation_id]
    );
    
    if (recommendationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    const recommendation = recommendationResult.rows[0];
    
    // Get connection profile
    const connectionResult = await pgPool.query(
      'SELECT * FROM connection_profiles WHERE id = (SELECT connection_profile_id FROM scan_runs WHERE id = $1)',
      [recommendation.scan_run_id]
    );
    
    if (connectionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Connection profile not found' });
    }
    
    const connection = connectionResult.rows[0];
    
    // Create MySQL connection
    const mysqlConnection = createMySQLConnection(
      connection.host,
      connection.port,
      connection.database_name,
      connection.username,
      connection.encrypted_password
    );
    
    // Execute the recommendation (this is a placeholder - actual implementation would depend on recommendation type)
    // For example, if it's an index recommendation, we would create an index
    // This is a simplified example
    const executionResult = await new Promise((resolve, reject) => {
      // This is where you would implement the actual SQL execution
      // For now, we'll just simulate it
      setTimeout(() => {
        resolve({ success: true, message: 'Recommendation executed successfully' });
      }, 1000);
    });
    
    // Update execution history
    await pgPool.query(
      'INSERT INTO execution_history (recommendation_id, executed_at, status, output) VALUES ($1, $2, $3, $4)',
      [recommendation_id, new Date(), 'completed', JSON.stringify(executionResult)]
    );
    
    res.json({ 
      success: true, 
      message: 'Recommendation executed successfully',
      result: executionResult 
    });
  } catch (error) {
    console.error('Error executing recommendation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Audit log endpoint
app.get('/api/audit', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`MySQL Production Optimizer SaaS running on port ${port}`);
});

module.exports = app;