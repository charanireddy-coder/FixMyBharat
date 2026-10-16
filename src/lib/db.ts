import { Pool, QueryResult, QueryResultRow } from 'pg';

// Global singleton pool for server-side Next.js execution
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or DIRECT_URL is not configured in environment variables.');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return pool;
}

/**
 * Execute a direct SQL query against the Supabase Postgres database.
 * Uses the connection pooler. Server-side only.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const clientPool = getDbPool();
  return clientPool.query<T>(text, params);
}
