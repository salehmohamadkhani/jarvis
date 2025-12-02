// api/health.js
// Health check endpoint for Neon Postgres database
import { query } from './db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    // Simple health query
    await query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DB healthcheck error:', err);
    res.status(500).json({
      ok: false,
      message: 'Database connection failed',
      error: err.message,
    });
  }
}
