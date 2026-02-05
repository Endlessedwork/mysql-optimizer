#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Get database URL from environment variable
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  console.error('DATABASE_URL or POSTGRES_URL environment variable is required');
  process.exit(1);
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: dbUrl,
});

// Get migration files
const migrationsDir = path.join(__dirname, '../migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql') && !file.endsWith('_rollback.sql'))
  .sort();

console.log('Running migrations...');

// Execute migration files
async function runMigrations() {
  const client = await pool.connect();
  
  try {
    for (const file of migrationFiles) {
      console.log(`Executing ${file}...`);
      
      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Split by semicolons but handle multi-statement migrations
        // PostgreSQL can handle multiple statements in one query with pg
        await client.query(sql);
        console.log(`✓ ${file} executed successfully`);
      } catch (error) {
        // Check if error is due to table/index already existing
        if (error.code === '42P07' || error.code === '42710') {
          console.log(`⚠ ${file} skipped (table/index already exists)`);
        } else {
          console.error(`✗ Error executing ${file}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('All migrations completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
