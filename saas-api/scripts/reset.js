#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// Get database URL from environment variable
const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

// Parse database URL
const url = new URL(dbUrl);
const config = {
  host: url.hostname,
  port: url.port,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
};

// Create connection
const connection = mysql.createConnection(config);

// Get migration files (in reverse order for rollback)
const migrationsDir = path.join(__dirname, '../migrations');
const rollbackFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('_rollback.sql'))
  .sort()
  .reverse();

console.log('Resetting database...');

// Execute rollback files
async function resetDatabase() {
  for (const file of rollbackFiles) {
    console.log(`Executing rollback ${file}...`);
    
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await executeQuery(sql);
      console.log(`✓ ${file} executed successfully`);
    } catch (error) {
      console.error(`✗ Error executing ${file}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('Database reset completed successfully!');
  connection.end();
}

// Execute SQL query
function executeQuery(sql) {
  return new Promise((resolve, reject) => {
    connection.execute(sql, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

// Run reset
resetDatabase().catch(console.error);