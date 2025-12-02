// api/health.js
import { Pool } from 'pg';

// 1) Read connection string from env
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  throw new Error('No DATABASE_URL / POSTGRES_URL / POSTGRES_PRISMA_URL is set');
}

// 2) Create a single pg pool (reuse between invocations)
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // needed for Neon on Vercel
  },
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Simple health query
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DB healthcheck error:', err);

    // *** موقتاً برای دیباگ، متن ارور را هم برمی‌گردانیم ***
    res.status(500).json({
      ok: false,
      message: 'Database connection failed',
      error: err.message,
    });
  }
}
