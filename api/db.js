// api/db.js
// Centralized Neon Postgres connection helper for Vercel serverless functions
import { Pool } from 'pg';

let pool;

function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (!connectionString) {
      throw new Error('No DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL is set');
    }

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Neon serverless Postgres
      },
    });
  }

  return pool;
}

/**
 * Execute a SQL query using the shared connection pool
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters (optional)
 * @returns {Promise<{rows: Array, rowCount: number}>} Query result
 */
export async function query(sql, params = []) {
  const pool = getPool();
  return await pool.query(sql, params);
}

