import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

let pool = null;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set. Please configure environment variables in Vercel.');
} else {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

async function checkDatabaseHealth() {
  if (!pool) {
    return { ok: false, error: 'DATABASE_URL not set' };
  }

  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    console.error('❌ Database health check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return { ok: false, error: 'Database connection failed' };
  }
}

const app = express();

app.use(cors({
  origin: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health/db', async (req, res) => {
  const result = await checkDatabaseHealth();
  if (result.ok) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    ok: dbHealth.ok,
    status: dbHealth.ok ? 'ok' : 'error',
    database: dbHealth.ok ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/projects', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const archived = req.query.archived === 'true';
    const result = await pool.query(
      'SELECT * FROM projects WHERE archived = $1 ORDER BY created_at DESC',
      [archived]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/projects/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/projects', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
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
    } = req.body;

    const result = await pool.query(
      `INSERT INTO projects (name, status, priority, start_date, due_date, notes, client_name, client_phone, referred_by_name, referred_by_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, status, priority, startDate || null, dueDate || null, notes || null, clientName || null, clientPhone || null, referredByName || null, referredByPhone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/projects/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
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
    } = req.body;

    const result = await pool.query(
      `UPDATE projects 
       SET name = $1, status = $2, priority = $3, start_date = $4, due_date = $5, notes = $6, 
           client_name = $7, client_phone = $8, referred_by_name = $9, referred_by_phone = $10, updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [name, status, priority, startDate || null, dueDate || null, notes || null, clientName || null, clientPhone || null, referredByName || null, referredByPhone || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.patch('/projects/:id/archive', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query(
      'UPDATE projects SET archived = true, archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

app.patch('/projects/:id/restore', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query(
      'UPDATE projects SET archived = false, archived_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error restoring project:', error);
    res.status(500).json({ error: 'Failed to restore project' });
  }
});

app.delete('/projects/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/tasks', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const { projectId, status, archived } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (projectId) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (archived !== undefined) {
      query += ` AND archived = $${paramIndex++}`;
      params.push(archived === 'true');
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

app.post('/tasks', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
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
    } = req.body;

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, due_at, priority, status, is_routine, labels, kind, cost_amount, notes, assignee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [projectId || null, title, description || null, dueAt || null, priority, status, isRoutine, JSON.stringify(labels), kind, costAmount || null, notes || null, assigneeId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
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
    } = req.body;

    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, due_at = $3, priority = $4, status = $5, is_routine = $6, 
           labels = $7, kind = $8, cost_amount = $9, notes = $10, assignee_id = $11, updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [title, description || null, dueAt || null, priority, status, isRoutine, JSON.stringify(labels || []), kind, costAmount || null, notes || null, assigneeId || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.patch('/tasks/:id/toggle', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query(
      `UPDATE tasks 
       SET status = CASE WHEN status = 'done' THEN 'todo' ELSE 'done' END, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling task:', error);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

app.patch('/tasks/:id/archive', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query(
      'UPDATE tasks SET archived = true, archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error archiving task:', error);
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

app.delete('/tasks/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/meetings', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const { projectId } = req.query;
    let query = 'SELECT * FROM meetings WHERE 1=1';
    const params = [];

    if (projectId) {
      query += ' AND project_id = $1';
      params.push(projectId);
    }

    query += ' ORDER BY scheduled_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.get('/meetings/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching meeting:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

app.post('/meetings', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const {
      projectId,
      title,
      scheduledAt,
      durationMinutes,
      participants = [],
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO meetings (project_id, title, scheduled_at, duration_minutes, participants, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectId || null, title, scheduledAt, durationMinutes || null, JSON.stringify(participants), notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meeting:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

app.put('/meetings/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const {
      title,
      scheduledAt,
      durationMinutes,
      participants,
      notes,
    } = req.body;

    const result = await pool.query(
      `UPDATE meetings 
       SET title = $1, scheduled_at = $2, duration_minutes = $3, participants = $4, notes = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [title, scheduledAt, durationMinutes || null, JSON.stringify(participants || []), notes || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meeting:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

app.delete('/meetings/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('DELETE FROM meetings WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

app.get('/collaborators', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('SELECT * FROM collaborators ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

app.get('/collaborators/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('SELECT * FROM collaborators WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching collaborator:', error);
    res.status(500).json({ error: 'Failed to fetch collaborator' });
  }
});

app.post('/collaborators', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const {
      name,
      role,
      email,
      phone,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO collaborators (name, role, email, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, role || null, email || null, phone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating collaborator:', error);
    res.status(500).json({ error: 'Failed to create collaborator' });
  }
});

app.put('/collaborators/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const {
      name,
      role,
      email,
      phone,
    } = req.body;

    const result = await pool.query(
      `UPDATE collaborators 
       SET name = $1, role = $2, email = $3, phone = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, role || null, email || null, phone || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating collaborator:', error);
    res.status(500).json({ error: 'Failed to update collaborator' });
  }
});

app.delete('/collaborators/:id', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }

  try {
    const result = await pool.query('DELETE FROM collaborators WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collaborator:', error);
    res.status(500).json({ error: 'Failed to delete collaborator' });
  }
});

export default app;
