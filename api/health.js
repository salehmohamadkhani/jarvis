const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL;

    if (!connectionString) {
      throw new Error('No DATABASE_URL/POSTGRES_URL found in environment');
    }

    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
  }

  return pool;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const client = await getPool().connect();
    await client.query('SELECT 1'); // simple health check
    client.release();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DB health check failed', err);
    return res.status(500).json({
      ok: false,
      error: 'Database connection failed',
    });
  }
};
