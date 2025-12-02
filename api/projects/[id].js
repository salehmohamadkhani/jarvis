// api/projects/[id].js
// Serverless API for single project operations
import { query } from '../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    // GET /api/projects/:id - Get single project
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM projects WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/projects/:id - Update project
    if (req.method === 'PUT') {
      const {
        name,
        status,
        priority,
        startDate,
        dueDate,
        notes,
        clientName,
        clientPhone,
        referredByName,
        referredByPhone,
      } = req.body || {};

      const updateSql = `
        UPDATE projects 
        SET name = $1, status = $2, priority = $3, start_date = $4, due_date = $5, notes = $6, 
            client_name = $7, client_phone = $8, referred_by_name = $9, referred_by_phone = $10, updated_at = NOW()
        WHERE id = $11
        RETURNING *;
      `;
      const { rows } = await query(updateSql, [
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
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/projects/:id - Delete project
    if (req.method === 'DELETE') {
      const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/projects/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

