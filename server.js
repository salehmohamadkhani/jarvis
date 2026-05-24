import express from 'express';
import cors from 'cors';
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dns from 'dns';
import { Pool as PgPool } from 'pg';
import { Pool as PglitePool } from '@middle-management/pglite-pg-adapter';
import { PGlite } from '@electric-sql/pglite';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env.local'), override: true });
import { google } from 'googleapis';
import swaggerUi from 'swagger-ui-express';
import openApiSpec from './docs/openapi.js';
import { fetchOllamaLlmStatus } from './lib/ollamaLlmStatus.js';

const app = express();
const PORT = process.env.PORT || 3001;

try {
  dns.setDefaultResultOrder?.('ipv4first');
} catch {}

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get('/api/version', (req, res) => {
  res.json({ apiVersion: '1', docs: '/api/docs', openApi: '/api/openapi.json' });
});
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(openApiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(null, {
  swaggerOptions: { url: '/api/openapi.json' },
}));
app.get('/api-docs', (req, res) => res.redirect(301, '/api/docs'));
app.get('/docs', (req, res) => res.redirect(301, '/api/docs'));

function buildPgSslOption(connectionString) {
  const pgSslMode = (process.env.PGSSLMODE || '').trim().toLowerCase();
  if (pgSslMode === 'disable' || pgSslMode === 'allow') return false;

  try {
    const u = new URL(connectionString);
    const sslmode = (u.searchParams.get('sslmode') || '').toLowerCase();
    if (sslmode === 'disable' || sslmode === 'allow') return false;

    const host = (u.hostname || '').toLowerCase();
    const isLocalHost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local');

    if (isLocalHost && !sslmode) return false;
  } catch {
  }

  return { rejectUnauthorized: false };
}

/** @type {import('pg').Pool | import('@middle-management/pglite-pg-adapter').Pool} */
let pool;
/** @type {import('@electric-sql/pglite').PGlite | null} */
let pgliteDb = null;

function envFlagTrue(v) {
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function summarizeDbHost(urlStr) {
  try {
    const u = new URL(urlStr);
    const port = u.port || (String(u.protocol).startsWith('postgres') ? '5432' : '');
    return port ? `${u.hostname}:${port}` : u.hostname;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

function isLocalPostgresUnreachable(err, connectionString) {
  const code = err?.code;
  if (!['ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'].includes(code)) return false;
  try {
    const host = new URL(connectionString).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === 'host.docker.internal'
    );
  } catch {
    return false;
  }
}

async function createEmbeddedPglitePool(max, idleTimeoutMillis, connectionTimeoutMillis) {
  const memoryOnly = envFlagTrue(process.env.PGLITE_MEMORY);
  const dataDirRaw = (process.env.PGLITE_DATA_DIR || '').trim();
  const defaultDataDir = path.join(__dirname, '.data', 'pglite');
  const dataDir = memoryOnly ? '' : (dataDirRaw ? path.resolve(__dirname, dataDirRaw) : defaultDataDir);

  if (!memoryOnly) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  pgliteDb = memoryOnly ? new PGlite() : new PGlite(dataDir);
  const schemaSql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pgliteDb.exec(schemaSql);

  const p = new PglitePool({
    pglite: pgliteDb,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
  });

  console.log(
    `Database: PGlite (${
      memoryOnly
        ? 'in-memory (set PGLITE_MEMORY=false for disk persistence)'
        : `persisted at ${dataDir}`
    })`
  );

  return p;
}

async function initDatabase() {
  const max = Number(process.env.PG_POOL_MAX || 10);
  const idleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS || 30000);
  const connectionTimeoutMillis = Number(process.env.PG_CONNECT_TIMEOUT_MS || 8000);

  const dbUrl = String(process.env.DATABASE_URL || '').trim();
  const usePglite = envFlagTrue(process.env.USE_PGLITE);

  if (usePglite || !dbUrl) {
    if (!usePglite && !dbUrl) {
      console.warn(
        'DATABASE_URL is empty; using embedded PGlite. Set DATABASE_URL (and USE_PGLITE=false) to use Postgres.'
      );
    }
    pool = await createEmbeddedPglitePool(max, idleTimeoutMillis, connectionTimeoutMillis);
  } else {
    pool = new PgPool({
      connectionString: dbUrl,
      ssl: buildPgSslOption(dbUrl),
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
    });

    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
      } finally {
        client.release();
      }
    } catch (err) {
      await pool.end().catch(() => {});
      if (isLocalPostgresUnreachable(err, dbUrl)) {
        console.warn(
          `Local Postgres unreachable (${err.code || err.message}) at ${summarizeDbHost(dbUrl)}; using embedded PGlite. ` +
            'Data is stored under .data/pglite. When Docker Postgres is up, restart with a working DATABASE_URL (USE_PGLITE=false).'
        );
        pool = await createEmbeddedPglitePool(max, idleTimeoutMillis, connectionTimeoutMillis);
      } else {
        throw err;
      }
    }
  }

  pool.on('error', (err) => {
    console.error('Postgres pool idle client error:', err.message);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbConnectError(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  return (
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    /EAI_AGAIN|ENOTFOUND|ETIMEDOUT|ECONNRESET|Connection terminated unexpectedly/i.test(msg)
  );
}

async function withDbRetries(fn, { attempts = 3, baseDelayMs = 250 } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = isTransientDbConnectError(err);
      if (!retryable || i === attempts - 1) throw err;
      const delay = baseDelayMs * Math.pow(2, i);
      console.warn(`DB transient error (attempt ${i + 1}/${attempts}): ${err.message} — retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function dbHealthCheck() {
  return await withDbRetries(async () => {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  });
}

app.get('/api/health', async (req, res) => {
  const includeLlm = req.query.llm === '1' || req.query.full === '1';
  try {
    await dbHealthCheck();
    const out = { ok: true, database: true };
    if (includeLlm) {
      out.llm = await fetchOllamaLlmStatus(2500);
    }
    res.json(out);
  } catch (err) {
    console.error('DB health error:', err.message);
    const isDns = /EAI_AGAIN|ENOTFOUND/i.test(String(err?.code || err?.message || ''));
    res.status(500).json({
      ok: false,
      database: false,
      error: 'Database connection failed',
      details: isDns
        ? 'DNS/network issue resolving DATABASE_URL host. Check internet/VPN/DNS, or try a different Neon hostname (direct vs pooler).'
        : (process.env.NODE_ENV !== 'production' ? err.message : undefined),
    });
  }
});

app.get('/api/projects', async (req, res) => {
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

app.get('/api/projects/:id', async (req, res) => {
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

app.post('/api/projects', async (req, res) => {
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

app.put('/api/projects/:id', async (req, res) => {
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

app.patch('/api/projects/:id/archive', async (req, res) => {
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

app.patch('/api/projects/:id/restore', async (req, res) => {
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

app.delete('/api/projects/:id', async (req, res) => {
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

app.post('/api/projects/:id/collaborators', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: projectRows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectRows[0];
    const { collaboratorId, responsibilities = [] } = req.body || {};
    if (!collaboratorId) {
      return res.status(400).json({ error: 'collaboratorId is required' });
    }
    const { rows: collaboratorRows } = await pool.query('SELECT * FROM collaborators WHERE id = $1', [collaboratorId]);
    if (collaboratorRows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' });
    }
    const collaborator = collaboratorRows[0];
    let collaborators = [];
    try {
      collaborators = Array.isArray(project.collaborators)
        ? project.collaborators
        : (project.collaborators ? JSON.parse(project.collaborators) : []);
    } catch {
      collaborators = [];
    }
    const exists = collaborators.some(c => (c.collaboratorId || c.id) === collaboratorId);
    if (exists) {
      return res.status(400).json({ error: 'Collaborator already added to this project' });
    }
    const newCollaborator = {
      id: `proj-collab-${Date.now()}`,
      collaboratorId: collaborator.id,
      name: collaborator.name,
      role: collaborator.role || '',
      email: collaborator.email || '',
      phone: collaborator.phone || '',
      responsibilities: Array.isArray(responsibilities) ? responsibilities : [],
    };
    collaborators.push(newCollaborator);
    const { rows } = await pool.query(
      'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(collaborators), id]
    );
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error adding collaborator to project:', error);
    res.status(500).json({ error: 'Failed to add collaborator to project' });
  }
});

app.delete('/api/projects/:id/collaborators/:collaboratorId', async (req, res) => {
  try {
    const { id, collaboratorId } = req.params;
    const { rows: projectRows } = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projectRows[0];
    let collaborators = [];
    try {
      collaborators = Array.isArray(project.collaborators)
        ? project.collaborators
        : (project.collaborators ? JSON.parse(project.collaborators) : []);
    } catch {
      collaborators = [];
    }
    const filtered = collaborators.filter(c => (c.collaboratorId || c.id) !== collaboratorId);
    if (filtered.length === collaborators.length) {
      return res.status(404).json({ error: 'Collaborator not found in project' });
    }
    const { rows } = await pool.query(
      'UPDATE projects SET collaborators = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(filtered), id]
    );
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error removing collaborator from project:', error);
    res.status(500).json({ error: 'Failed to remove collaborator from project' });
  }
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuidOrNull(val) {
  if (val == null || val === '') return null;
  const s = String(val).trim();
  return s && UUID_REGEX.test(s) ? s : null;
}

app.get('/api/tasks', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }
  try {
    const { projectId: projectIdRaw, status, archived } = req.query;
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    const projectIdVal = projectIdRaw ? toUuidOrNull(projectIdRaw) : null;
    if (projectIdVal) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(projectIdVal);
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
app.get('/api/tasks/:id', async (req, res) => {
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

app.post('/api/tasks', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'اتصال دیتابیس تنظیم نشده.', details: 'DATABASE_URL not set' });
  }
  const body = req.body || {};
  try {
    // هر نوع projectId (عدد، رشته نامعتبر، یا UUID) را به UUID یا null تبدیل کن؛ هیچ‌وقت 400 نده
    const projectIdRaw = body.projectId != null && typeof body.projectId === 'number' ? null : body.projectId;
    const titleRaw = body.title;
    const description = body.description ?? null;
    let dueAt = body.dueAt ?? null;
    const priority = Math.min(10, Math.max(0, parseInt(body.priority, 10) || 3));
    const status = (body.status && String(body.status).trim()) || 'todo';
    const isRoutine = Boolean(body.isRoutine);
    const labels = Array.isArray(body.labels) ? body.labels : [];
    const kind = (body.kind && String(body.kind).trim()) || 'task';
    const costAmount = body.costAmount != null ? parseFloat(body.costAmount) : null;
    const notes = body.notes != null ? String(body.notes) : null;
    const assigneeIdRaw = body.assigneeId;

    const titleTrimmed = (titleRaw != null && String(titleRaw).trim()) || '';
    if (!titleTrimmed) {
      return res.status(400).json({ error: 'عنوان تسک الزامی است.', details: 'title is required' });
    }

    const projectIdVal = toUuidOrNull(projectIdRaw);
    const assigneeIdVal = toUuidOrNull(assigneeIdRaw);

    if (projectIdVal) {
      const projCheck = await pool.query('SELECT id FROM projects WHERE id = $1', [projectIdVal]);
      if (projCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'پروژه با این شناسه وجود ندارد.',
          details: `project ${projectIdVal} not found`,
        });
      }
    }

    const labelsJson = JSON.stringify(labels);
    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, due_at, priority, status, is_routine, labels, kind, cost_amount, notes, assignee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
       RETURNING *`,
      [projectIdVal, titleTrimmed, description, dueAt, priority, status, isRoutine, labelsJson, kind, costAmount, notes, assigneeIdVal]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/tasks error:', error.message);
    console.error('Request body:', JSON.stringify(body).slice(0, 500));
    const msg = error.message || 'Failed to create task';
    const details = process.env.NODE_ENV !== 'production' ? (error.stack || msg) : msg;
    res.status(500).json({ error: 'خطا در ساخت تسک.', details });
  }
});
app.put('/api/tasks/:id', async (req, res) => {
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
app.patch('/api/tasks/:id/toggle', async (req, res) => {
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
app.patch('/api/tasks/:id/archive', async (req, res) => {
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
app.patch('/api/tasks/:id/restore', async (req, res) => {
  if (!pool) {
    return res.status(500).json({ error: 'Database connection not configured' });
  }
  try {
    const result = await pool.query(
      'UPDATE tasks SET archived = false, archived_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error restoring task:', error);
    res.status(500).json({ error: 'Failed to restore task' });
  }
});
app.delete('/api/tasks/:id', async (req, res) => {
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

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const CALENDAR_TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE || 'Asia/Tehran';

function getCalendarAuth() {
  const credentialsJson = process.env.GOOGLE_CALENDAR_CREDENTIALS_JSON;
  const credentialsPath = process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH;
  let credentials = null;
  if (credentialsJson) {
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (e) {
      console.error('Invalid GOOGLE_CALENDAR_CREDENTIALS_JSON:', e.message);
      return null;
    }
  } else if (credentialsPath) {
    const fullPath = path.isAbsolute(credentialsPath) ? credentialsPath : path.join(__dirname, credentialsPath);
    try {
      credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      console.error('Could not read GOOGLE_CALENDAR_CREDENTIALS_PATH:', e.message);
      return null;
    }
  }
  if (!credentials) return null;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
  });
  return auth;
}

async function createCalendarEvent({ title, scheduledAt, durationMinutes = 30, description, attendees = [] }) {
  const auth = getCalendarAuth();
  if (!auth || !GOOGLE_CALENDAR_ID) return null;
  const calendar = google.calendar({ version: 'v3', auth });
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + (durationMinutes || 30) * 60 * 1000);
  const event = {
    summary: title,
    description: description || undefined,
    start: { dateTime: start.toISOString(), timeZone: CALENDAR_TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: CALENDAR_TIMEZONE },
    attendees: attendees.filter(Boolean).map((e) => (typeof e === 'string' ? { email: e } : e)),
  };
  const res = await calendar.events.insert({
    calendarId: GOOGLE_CALENDAR_ID,
    requestBody: event,
  });
  return res.data;
}

function normalizeParticipants(participants) {
  if (!Array.isArray(participants)) return [];
  return participants.map((p) => {
    if (typeof p === 'string') return { email: p, name: p };
    if (p && typeof p === 'object' && (p.email || p.emailAddress)) return { email: p.email || p.emailAddress, name: p.name || p.email || p.emailAddress };
    return null;
  }).filter(Boolean);
}

function participantEmails(participants) {
  return normalizeParticipants(participants).map((p) => p.email).filter(Boolean);
}

app.get('/api/meetings', async (req, res) => {
  try {
    const { projectId } = req.query;
    let query = 'SELECT id, project_id, title, scheduled_at, duration_minutes, participants, notes, created_at, updated_at FROM meetings WHERE 1=1';
    const params = [];
    if (projectId) {
      params.push(projectId);
      query += ` AND project_id = $${params.length}`;
    }
    query += ' ORDER BY scheduled_at ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

app.get('/api/meetings/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching meeting:', err);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

app.post('/api/meetings', async (req, res) => {
  try {
    const {
      projectId,
      title,
      scheduledAt,
      durationMinutes = 30,
      participants = [],
      notes,
    } = req.body || {};

    if (!title || !scheduledAt) {
      return res.status(400).json({
        error: title ? 'scheduledAt is required' : 'title is required',
      });
    }

    const scheduledAtNorm = scheduledAt.length <= 10
      ? `${scheduledAt}T09:00:00`
      : scheduledAt.replace(' ', 'T');
    const participantsNorm = normalizeParticipants(participants);

    const projectIdVal = toUuidOrNull(projectId);

    const insertResult = await pool.query(
      `INSERT INTO meetings (project_id, title, scheduled_at, duration_minutes, participants, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectIdVal, title.trim(), scheduledAtNorm, durationMinutes || 30, JSON.stringify(participantsNorm), notes || null]
    );
    const row = insertResult.rows[0];

    let htmlLink = null;
    const calendarEvent = await createCalendarEvent({
      title: title.trim(),
      scheduledAt: scheduledAtNorm,
      durationMinutes: durationMinutes || 30,
      description: notes || undefined,
      attendees: participantEmails(participants),
    });
    if (calendarEvent) htmlLink = calendarEvent.htmlLink;

    if (process.env.TELEGRAM_API_ID && process.env.TELEGRAM_SESSION_STRING) {
      (async () => {
        try {
          const { notifyMeetingCreated } = await import('./lib/telegramUserClient.js');
          let projectName = null;
          if (projectIdVal) {
            const proj = await pool.query('SELECT name FROM projects WHERE id = $1', [projectIdVal]);
            if (proj.rows[0]) projectName = proj.rows[0].name;
          }
          const emails = participantEmails(participants);
          const participantTargets = [];
          if (emails.length > 0) {
            const coll = await pool.query('SELECT phone, telegram_id FROM collaborators WHERE email = ANY($1)', [emails]);
            for (const c of coll.rows) {
              if (c.phone || c.telegram_id) participantTargets.push({ phone: c.phone, telegramId: c.telegram_id });
            }
          }
          await notifyMeetingCreated({
            title: row.title,
            scheduledAt: row.scheduled_at,
            projectName,
            ownerOnly: false,
            participantTargets,
          });
        } catch (e) {
          console.error('Telegram notify error:', e.message);
        }
      })();
    }

    res.status(201).json({ ...row, htmlLink });
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ error: err.message || 'Failed to create meeting' });
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  try {
    const { title, scheduledAt, durationMinutes, participants, notes } = req.body || {};
    const result = await pool.query(
      `UPDATE meetings SET title = COALESCE($1, title), scheduled_at = COALESCE($2, scheduled_at), duration_minutes = COALESCE($3, duration_minutes), participants = COALESCE($4::jsonb, participants), notes = COALESCE($5, notes), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [title || null, scheduledAt || null, durationMinutes ?? null, participants != null ? JSON.stringify(normalizeParticipants(participants)) : null, notes !== undefined ? notes : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).json({ error: err.message || 'Failed to update meeting' });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM meetings WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Meeting not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).json({ error: err.message || 'Failed to delete meeting' });
  }
});

app.get('/api/collaborators', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, role, email, phone, telegram_id, created_at, updated_at FROM collaborators ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching collaborators:', err.message, err.code);
    const message = process.env.NODE_ENV !== 'production' ? (err.message || 'Failed to fetch collaborators') : 'Failed to fetch collaborators';
    res.status(500).json({ error: message });
  }
});

app.get('/api/collaborators/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM collaborators WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Collaborator not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching collaborator:', err);
    res.status(500).json({ error: 'Failed to fetch collaborator' });
  }
});

app.post('/api/collaborators', async (req, res) => {
  try {
    const { name, role, email, phone, telegramId } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      `INSERT INTO collaborators (name, role, email, phone, telegram_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), role || null, email || null, phone || null, telegramId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating collaborator:', err);
    res.status(500).json({ error: err.message || 'Failed to create collaborator' });
  }
});

app.put('/api/collaborators/:id', async (req, res) => {
  try {
    const { name, role, email, phone, telegramId } = req.body || {};
    const result = await pool.query(
      `UPDATE collaborators SET name = COALESCE($1, name), role = COALESCE($2, role), email = COALESCE($3, email), phone = COALESCE($4, phone), telegram_id = COALESCE($5, telegram_id), updated_at = NOW() WHERE id = $6 RETURNING *`,
      [name || null, role || null, email !== undefined ? email : null, phone !== undefined ? phone : null, telegramId !== undefined ? telegramId : null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Collaborator not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating collaborator:', err);
    res.status(500).json({ error: err.message || 'Failed to update collaborator' });
  }
});

app.delete('/api/collaborators/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM collaborators WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Collaborator not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting collaborator:', err);
    res.status(500).json({ error: err.message || 'Failed to delete collaborator' });
  }
});

app.get('/api/test-telegram-proxy', async (req, res) => {
  try {
    const { getTelegramProxy } = await import('./lib/telegramProxy.js');
    const proxy = getTelegramProxy();
    if (!proxy) {
      return res.json({
        ok: false,
        configured: false,
        error: 'پراکسی تنظیم نشده. TELEGRAM_PROXY یا TELEGRAM_MTPROXY_* در .env.local',
      });
    }
    if (proxy.MTProxy) {
      const net = await import('net');
      await new Promise((resolve, reject) => {
        const socket = net.createConnection(
          { host: proxy.ip, port: proxy.port, timeout: 15000 },
          () => { socket.destroy(); resolve(); }
        );
        socket.on('error', reject);
        socket.setTimeout(15000, () => { socket.destroy(); reject(new Error('Timeout')); });
      });
      return res.json({
        ok: true,
        configured: true,
        connected: true,
        type: 'MTProxy',
        message: 'سرور MTProxy در دسترس است.',
      });
    }
    const { SocksClient } = await import('socks');
    const info = await SocksClient.createConnection({
      proxy: {
        host: proxy.ip,
        port: proxy.port,
        type: proxy.socksType,
        userId: proxy.username || undefined,
        password: proxy.password || undefined,
      },
      command: 'connect',
      destination: { host: '149.154.167.91', port: 80 },
      timeout: 15000,
    });
    info.socket.destroy();
    res.json({
      ok: true,
      configured: true,
      connected: true,
      type: 'SOCKS',
      message: 'پراکسی وصل است. اتصال به تلگرام از طریق این پراکسی ممکن است.',
    });
  } catch (err) {
    res.json({
      ok: false,
      configured: true,
      connected: false,
      error: err.message || String(err),
    });
  }
});

app.get('/api/whisper-proxy', (req, res) => {
  res.json({ ok: true, whisper: 'available', method: 'POST with body: { audio: base64, mimeType }' });
});

app.post('/api/whisper-proxy', async (req, res) => {
  try {
    const { audio: audioBase64, mimeType = 'audio/webm' } = req.body || {};
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audio (base64) in request body' });
    }
    const localUrl = process.env.WHISPER_LOCAL_URL || '';
    if (!localUrl) {
      return res.status(503).json({
        error: 'Whisper محلی فعال نیست. در سرور WHISPER_LOCAL_URL را در .env.local ست کن (مثلاً http://localhost:9000/asr) و کانتینر Whisper را اجرا کن.',
      });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    if (!buffer.length) {
    }
    const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp3') ? 'mp3' : mimeType.includes('mp4') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('audio_file', new Blob([buffer], { type: mimeType }), `audio.${ext}`);
    const sep = localUrl.includes('?') ? '&' : '?';
    const urlWithParams = `${localUrl}${sep}output=json&language=fa&task=transcribe`;
    const whisperTimeoutMs = Number(process.env.WHISPER_REQUEST_TIMEOUT_MS || 180000);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), whisperTimeoutMs);
    let localRes;
    try {
      localRes = await fetch(urlWithParams, { method: 'POST', body: form, signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(502).json({ error: 'پردازش صدا طول کشید. روی گوشی از Chrome امتحان کن یا صدا را کوتاه‌تر بفرست.' });
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);
    if (!localRes.ok) {
      const errText = await localRes.text().catch(() => '');
      console.error('Whisper local error:', localRes.status, errText.substring(0, 200));
      const status = localRes.status >= 500 ? 502 : localRes.status;
      const userMsg = localRes.status >= 500
        ? 'صدا روی سرور درست پردازش نشد. روی گوشی از Chrome امتحان کن یا صدا را کوتاه‌تر (۳–۵ ثانیه) بفرست.'
        : (localRes.status === 400 ? 'صدا خیلی کوتاه یا نامعتبره. طولانی‌تر حرف بزن.' : 'سرویس صدا موقتاً جواب نداد. دوباره امتحان کن.');
      return res.status(status).json({ error: userMsg, details: errText });
    }
    const rawBody = await localRes.text();
    let localData = {};
    try {
      localData = JSON.parse(rawBody);
    } catch {
      localData = { text: rawBody.trim() };
    }
    const text = typeof localData.text === 'string' ? localData.text : (localData.transcript || localData.result || (Array.isArray(localData.segments) ? localData.segments.map(s => s.text || '').join(' ') : ''));
    return res.json({ text: text.trim() });
  } catch (error) {
    console.error('Whisper proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/** وضعیت Ollama نسبت به LLM_MODEL — برای دیباگ و صفحهٔ دستیار */
app.get('/api/llm-status', async (req, res) => {
  try {
    const data = await fetchOllamaLlmStatus(6000);
    res.status(200).json(data);
  } catch (error) {
    console.error('llm-status error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal error',
    });
  }
});

app.post('/api/chatgpt-proxy', async (req, res) => {
  try {
    if (!req.body || !req.body.messages) {
      return res.status(400).json({ error: 'Invalid request body - messages required' });
    }
    const { messages, model, temperature = 0.7 } = req.body;

    const llmBaseUrlRaw =
      process.env.LLM_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:11434/v1');
    const llmBaseUrl = llmBaseUrlRaw.replace(/\/$/, '');

    let url, headers, bodyModel;
    if (llmBaseUrl) {
      url = `${llmBaseUrl}/chat/completions`;
      headers = { 'Content-Type': 'application/json' };
      if (process.env.LLM_API_KEY) {
        headers.Authorization = `Bearer ${process.env.LLM_API_KEY}`;
      }
      bodyModel = model || process.env.LLM_MODEL || 'llama3.2';
      /* فرانت قدیمی مدل «local» می‌فرستاد؛ Ollama آن را نمی‌شناسد */
      if (bodyModel === 'local' || bodyModel === 'Local') {
        bodyModel = process.env.LLM_MODEL || 'llama3.2';
      }
    } else {
      return res.status(503).json({
        error: 'سرویس چت لوکال تنظیم نشده. LLM_BASE_URL را در .env.local ست کن (مثلاً برای Ollama: http://localhost:11434/v1).',
      });
    }

    console.log('LLM request:', url);
    const llmTimeoutMs = Number(process.env.LLM_REQUEST_TIMEOUT_MS || 300000);
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), llmTimeoutMs);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: bodyModel, messages, temperature }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(to);
      if (fetchErr.name === 'AbortError') {
        return res.status(502).json({
          error: 'سرویس چت دیر جواب داد. دوباره امتحان کن یا مدل سبک‌تر استفاده کن.',
          details: 'LLM request timeout',
        });
      }
      const isNetwork = (fetchErr.cause && (fetchErr.cause.code === 'ECONNREFUSED' || fetchErr.cause.code === 'ENOTFOUND')) || fetchErr.code === 'ECONNREFUSED';
      if (isNetwork) {
        return res.status(502).json({
          error: 'اتصال به سرویس چت برقرار نشد. اگر از Ollama استفاده می‌کنی مطمئن شو اجراست (ollama run llama3.2). اگر از OpenAI استفاده می‌کنی اتصال اینترنت سرور را چک کن.',
          details: fetchErr.message,
        });
      }
      throw fetchErr;
    }
    clearTimeout(to);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('LLM error:', response.status, text.substring(0, 300));
      let userMsg = 'سرویس چت جواب نداد. مطمئن شو سرویس LLM لوکال بالا است.';
      try {
        const j = JSON.parse(text);
        const inner = (j.error && (typeof j.error === 'string' ? j.error : j.error.message)) || '';
        const innerStr = String(inner);
        if (/not found|does not exist|model/i.test(innerStr) || response.status === 404) {
          userMsg =
            `مدل زبانی «${bodyModel}» روی Ollama آماده نیست (یا هنوز دانلود نشده). در ترمینال بزن:\nollama pull ${bodyModel}\nبعد دوباره همین جمله را امتحان کن. اگر مدل دیگری داری، در .env.local مقدار LLM_MODEL و در فرانت VITE_LLM_MODEL را همان نام بگذار.`;
        }
      } catch {
        /* plain-text error body */
      }
      /* 404 از Ollama = معمولاً «مدل نیست»؛ 404 به فرانت نفرستیم تا در DevTools شبیه «روت API گم شده» نشود */
      const upstream404 = response.status === 404;
      const clientStatus =
        upstream404 || /not_found|not found|does not exist/i.test(text) ? 422 : response.status >= 500 ? 502 : 502;
      return res.status(clientStatus).json({
        error: userMsg,
        details: text.substring(0, 400),
      });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('ChatGPT proxy error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

const distPath = path.join(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function startServer() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
