// api/collaborators.js
// Serverless API for collaborators - handles GET (list) and POST (create)
import { query } from './db.js';

export default async function handler(req, res) {
  try {
    // GET /api/collaborators - List collaborators
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM collaborators ORDER BY created_at DESC');
      return res.status(200).json(rows);
    }

    // POST /api/collaborators - Create collaborator
    if (req.method === 'POST') {
      const {
        name,
        role,
        email,
        phone,
      } = req.body || {};

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const insertSql = `
        INSERT INTO collaborators (name, role, email, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        name,
        role || null,
        email || null,
        phone || null,
      ]);
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/collaborators:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

