// api/collaborators/[id].js
// Serverless API for single collaborator operations
import { query } from '../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Collaborator ID is required' });
  }

  try {
    // GET /api/collaborators/:id - Get single collaborator
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM collaborators WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/collaborators/:id - Update collaborator
    if (req.method === 'PUT') {
      const {
        name,
        role,
        email,
        phone,
      } = req.body || {};

      const updateSql = `
        UPDATE collaborators 
        SET name = $1, role = $2, email = $3, phone = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `;
      const { rows } = await query(updateSql, [
        name,
        role || null,
        email || null,
        phone || null,
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/collaborators/:id - Delete collaborator
    if (req.method === 'DELETE') {
      const { rowCount } = await query('DELETE FROM collaborators WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Collaborator not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/collaborators/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

