// api/tasks.js
// Serverless API for tasks - handles GET (list) and POST (create)
import { query } from './db.js';

export default async function handler(req, res) {
  try {
    // GET /api/tasks - List tasks
    if (req.method === 'GET') {
      const { projectId, status, archived } = req.query;
      let sql = 'SELECT * FROM tasks WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (projectId) {
        sql += ` AND project_id = $${paramIndex++}`;
        params.push(projectId);
      }
      if (status) {
        sql += ` AND status = $${paramIndex++}`;
        params.push(status);
      }
      if (archived !== undefined) {
        sql += ` AND archived = $${paramIndex++}`;
        params.push(archived === 'true');
      }

      sql += ' ORDER BY created_at DESC';
      const { rows } = await query(sql, params);
      return res.status(200).json(rows);
    }

    // POST /api/tasks - Create task
    if (req.method === 'POST') {
      const {
        projectId,
        title,
        description,
        dueAt,
        priority = 3,
        status = 'todo',
        isRoutine = false,
        labels = [],
        kind = 'task',
        costAmount,
        notes,
        assigneeId,
      } = req.body || {};

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      const insertSql = `
        INSERT INTO tasks (project_id, title, description, due_at, priority, status, is_routine, labels, kind, cost_amount, notes, assignee_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *;
      `;
      const { rows } = await query(insertSql, [
        projectId || null,
        title,
        description || null,
        dueAt || null,
        priority,
        status,
        isRoutine,
        JSON.stringify(labels), // labels as JSONB
        kind,
        costAmount || null,
        notes || null,
        assigneeId || null,
      ]);
      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Error in /api/tasks:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

