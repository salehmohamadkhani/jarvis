// api/meetings.js
// Consolidated serverless API for all meeting operations
// Handles: /api/meetings (GET list, POST create)
// Note: For dynamic routes like /api/meetings/:id, use api/meetings/[...slug].js
import { query } from './db.js';

export default async function handler(req, res) {
  try {
    // GET /api/meetings - List meetings
    if (req.method === 'GET') {
      const { projectId } = req.query;
      let sql = 'SELECT * FROM meetings WHERE 1=1';
      const params = [];

      if (projectId) {
        sql += ' AND project_id = $1';
        params.push(projectId);
      }

      sql += ' ORDER BY scheduled_at ASC';
      const { rows } = await query(sql, params);
      return res.status(200).json(rows);
    }

    // POST /api/meetings - Create meeting
    if (req.method === 'POST') {
      const {
        projectId,
        title,
        scheduledAt,
        durationMinutes,
        participants = [],
        notes,
      } = req.body || {};

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }
      if (!scheduledAt) {
        return res.status(400).json({ error: 'scheduledAt is required' });
      }

      const insertSql = `
        INSERT INTO meetings (project_id, title, scheduled_at, duration_minutes, participants, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        projectId || null,
        title,
        scheduledAt,
        durationMinutes || null,
        JSON.stringify(participants), // participants as JSONB
        notes || null,
      ]);
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/meetings:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
