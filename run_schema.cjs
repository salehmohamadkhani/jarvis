require('dotenv').config();
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('schema.sql', 'utf8');

pool.query(sql)
  .then(() => {
    console.log('✅ Tables created');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });

