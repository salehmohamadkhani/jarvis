/**
 * اجرای مایگریشن جدول collaborators با DATABASE_URL پروژه.
 * استفاده: node scripts/run-migration-collaborators.cjs
 */
require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode') ? { rejectUnauthorized: false } : undefined,
});

const sqlPath = path.join(__dirname, '..', 'db', 'migrations', '000_ensure_collaborators_table.sql');
const sql = fs.readFileSync(sqlPath, 'utf8')
  .split('\n')
  .filter(line => !line.trim().startsWith('--'))
  .join('\n');

pool.query(sql)
  .then(() => {
    console.log('✅ Collaborators table ensured.');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
