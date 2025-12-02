// api/index.js - Vercel Serverless Function
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

// Get connection string from environment variables (Vercel provides these)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

// Initialize database pool with proper error handling
let pool = null;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set. Please configure environment variables in Vercel.');
} else {
  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}

// Database health check function
async function checkDatabaseHealth() {
  if (!pool) {
    return { ok: false, error: 'DATABASE_URL not set' };
  }

  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    // Log full error for server-side debugging (but don't expose to client)
    console.error('❌ Database health check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    return { ok: false, error: 'Database connection failed' };
  }
}

const app = express();

// Middleware
app.use(cors({
  origin: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database health check endpoint
// Accessible at: GET /api/health/db
app.get('/health/db', async (req, res) => {
  const result = await checkDatabaseHealth();
  if (result.ok) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
});

// General health check endpoint
// Accessible at: GET /api/health
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({
    status: dbHealth.ok ? 'ok' : 'error',
    database: dbHealth.ok ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Projects API routes
// Accessible at: GET /api/projects
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

// Get project by ID
// Accessible at: GET /api/projects/:id
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

// Create project
// Accessible at: POST /api/projects
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

// Update project
// Accessible at: PUT /api/projects/:id
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

// Archive project
// Accessible at: PATCH /api/projects/:id/archive
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

// Restore project
// Accessible at: PATCH /api/projects/:id/restore
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

// Delete project
// Accessible at: DELETE /api/projects/:id
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

// Tasks API routes
// Accessible at: GET /api/tasks
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

// Get task by ID
// Accessible at: GET /api/tasks/:id
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

// Create task
// Accessible at: POST /api/tasks
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

// Update task
// Accessible at: PUT /api/tasks/:id
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

// Toggle task status
// Accessible at: PATCH /api/tasks/:id/toggle
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

// Archive task
// Accessible at: PATCH /api/tasks/:id/archive
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

// Delete task
// Accessible at: DELETE /api/tasks/:id
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

// Meetings API routes
// Accessible at: GET /api/meetings
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

// Get meeting by ID
// Accessible at: GET /api/meetings/:id
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

// Create meeting
// Accessible at: POST /api/meetings
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

// Update meeting
// Accessible at: PUT /api/meetings/:id
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

// Delete meeting
// Accessible at: DELETE /api/meetings/:id
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

// Collaborators API routes
// Accessible at: GET /api/collaborators
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

// Get collaborator by ID
// Accessible at: GET /api/collaborators/:id
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

// Create collaborator
// Accessible at: POST /api/collaborators
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

// Update collaborator
// Accessible at: PUT /api/collaborators/:id
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

// Delete collaborator
// Accessible at: DELETE /api/collaborators/:id
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

// Export Express app for Vercel
export default app;
