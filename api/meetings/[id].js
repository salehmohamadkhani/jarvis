// api/meetings/[id].js
// Serverless API for single meeting operations
import { query } from '../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Meeting ID is required' });
  }

  try {
    // GET /api/meetings/:id - Get single meeting
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM meetings WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/meetings/:id - Update meeting
    if (req.method === 'PUT') {
      const {
        title,
        scheduledAt,
        durationMinutes,
        participants,
        notes,
      } = req.body || {};

      const updateSql = `
        UPDATE meetings 
        SET title = $1, scheduled_at = $2, duration_minutes = $3, participants = $4, notes = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING *;
      `;
      const { rows } = await query(updateSql, [
        title,
        scheduledAt,
        durationMinutes || null,
        JSON.stringify(participants || []), // participants as JSONB
        notes || null,
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/meetings/:id - Delete meeting
    if (req.method === 'DELETE') {
      const { rowCount } = await query('DELETE FROM meetings WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Meeting not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/meetings/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

