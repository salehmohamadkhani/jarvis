// api/tasks/[...slug].js
// Catch-all route for all task operations with IDs
// Handles: /api/tasks/:id, /api/tasks/:id/toggle, /api/tasks/:id/archive
import { query } from '../db.js';

export default async function handler(req, res) {
  const slug = req.query.slug || [];
  const id = slug[0] || null;
  const action = slug[1] || null;

  try {
    // GET /api/tasks/:id - Get single task
    if (req.method === 'GET' && id && !action) {
      const { rows } = await query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(200).json(rows[0]);
    }

    // PUT /api/tasks/:id - Update task
    if (req.method === 'PUT' && id && !action) {
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

    // PATCH /api/tasks/:id/toggle - Toggle task status
    if (req.method === 'PATCH' && id && action === 'toggle') {
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
    }

    // PATCH /api/tasks/:id/archive - Archive task
    if (req.method === 'PATCH' && id && action === 'archive') {
      const { rows } = await query(
        'UPDATE tasks SET archived = true, archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      return res.status(200).json(rows[0]);
    }

    // DELETE /api/tasks/:id - Delete task
    if (req.method === 'DELETE' && id && !action) {
      const { rowCount } = await query('DELETE FROM tasks WHERE id = $1', [id]);
      if (rowCount === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(204).send();
    }

    res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/tasks/:id:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
