// api/health.js
import { getPool } from './db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        const pool = getPool();
        await pool.query('SELECT 1');
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('DB health check failed:', err);
        return res.status(500).json({ ok: false, error: 'Database connection failed' });
    }
}

