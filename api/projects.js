// api/projects.js
// Serverless API for projects - handles GET (list) and POST (create)
import { query } from './db.js';

export default async function handler(req, res) {
  try {
    // GET /api/projects - List projects
    if (req.method === 'GET') {
      const archivedFilter = req.query.archived;
      let sql = 'SELECT * FROM projects';
      const params = [];

      if (archivedFilter === 'false') {
        sql += ' WHERE archived = FALSE';
      } else if (archivedFilter === 'true') {
        sql += ' WHERE archived = TRUE';
      }

      sql += ' ORDER BY created_at DESC';

      const { rows } = await query(sql, params);
      return res.status(200).json(rows);
    }

    // POST /api/projects - Create project
    if (req.method === 'POST') {
      const {
        name,
        status = 'active',
        priority = 3,
        startDate,
        dueDate,
        notes,
        clientName,
        clientPhone,
        referredByName,
        referredByPhone,
      } = req.body || {};

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const insertSql = `
        INSERT INTO projects (name, status, priority, start_date, due_date, notes, client_name, client_phone, referred_by_name, referred_by_phone, collaborators)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        name,
        status,
        priority,
        startDate || null,
        dueDate || null,
        notes || null,
        clientName || null,
        clientPhone || null,
        referredByName || null,
        referredByPhone || null,
        JSON.stringify([]), // collaborators as JSONB
      ]);
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/projects:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
