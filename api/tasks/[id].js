// api/tasks/[id].js
// Serverless API for single task operations
import { query } from '../db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // GET /api/tasks/:id - Get single task
    if (req.method === 'GET') {
      const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/tasks/:id - Update task
    if (req.method === 'PUT') {
      const {
        title,
        description,
        dueAt,
        priority,
        status,
        isRoutine,
        labels,
        kind,
        costAmount,
        notes,
        assigneeId,
      } = req.body || {};

      const updateSql = `
        UPDATE tasks 
        SET title = $1, description = $2, due_at = $3, priority = $4, status = $5, is_routine = $6, 
            labels = $7, kind = $8, cost_amount = $9, notes = $10, assignee_id = $11, updated_at = NOW()
        WHERE id = $12
        RETURNING *;
      `;
      const { rows } = await query(updateSql, [
        title,
        description || null,
        dueAt || null,
        priority,
        status,
        isRoutine,
        JSON.stringify(labels || []), // labels as JSONB
        kind,
        costAmount || null,
        notes || null,
        assigneeId || null,
        id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // DELETE /api/tasks/:id - Delete task
    if (req.method === 'DELETE') {
      const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/tasks/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

