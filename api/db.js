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
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const pool = getPool();
  return await pool.query(sql, params);
}

