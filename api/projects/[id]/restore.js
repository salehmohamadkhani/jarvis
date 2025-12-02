// api/projects/[id]/restore.js
// Restore an archived project
import { query } from '../../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await query(
      'UPDATE projects SET archived = false, archived_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error restoring project:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

