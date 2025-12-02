// api/index.js - Vercel Serverless Function
// این فایل باید در planner-web/api/ باشد تا Vercel آن را به عنوان serverless function تشخیص دهد

// برای Vercel، باید از مسیرهای نسبی استفاده کنیم
// اما بهتر است که backend را به planner-web کپی کنیم یا از یک ساختار مشترک استفاده کنیم

// راه حل موقت: استفاده مستقیم از کد backend
import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

async function healthCheck() {
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    console.error('❌ Database health check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return { ok: false, error: error.message };
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

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Database health check endpoint
app.get('/api/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ ok: true });
  } catch (error) {
    // Log full error for server-side debugging
    console.error('❌ Database health check failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

// Simple API routes (می‌توانید routes کامل را بعداً اضافه کنید)
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE archived = false ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE archived = false ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Export for Vercel
export default app;
