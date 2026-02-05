import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool;

export async function connectDB() {
  try {
    // Use PostgreSQL connection string from environment
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgres://localhost:5432/mysql_optimizer';
    
    pool = new Pool({
      connectionString,
      max: 20, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('Connected to PostgreSQL');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export function getPool(): Pool {
  return pool;
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

// Export database instance for models
export class Database {
  private static pool: Pool;

  static async getInstance(): Promise<Pool> {
    if (!Database.pool) {
      await connectDB();
      Database.pool = pool;
    }
    return Database.pool;
  }

  static async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const pool = await Database.getInstance();
    return pool.query<T>(text, params);
  }

  static async getClient(): Promise<PoolClient> {
    const pool = await Database.getInstance();
    return pool.connect();
  }
}

// Graceful shutdown
export async function closeDB() {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL connection pool closed');
  }
}
