// api/tasks/[id]/toggle.js
// Toggle task status between 'done' and 'todo'
import { query } from '../../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { rows } = await query(
      `UPDATE tasks 
       SET status = CASE WHEN status = 'done' THEN 'todo' ELSE 'done' END, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error toggling task:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

