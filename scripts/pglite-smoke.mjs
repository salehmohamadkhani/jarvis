import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from '@middle-management/pglite-pg-adapter';

const db = new PGlite();
const pool = new Pool({ pglite: db, max: 2 });

try {
  const uuidRes = await pool.query('select gen_random_uuid() as u');
  console.log('gen_random_uuid:', uuidRes.rows[0]?.u);

  const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  console.log('schema applied');

  const tables = await pool.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('projects','tasks','meetings','collaborators') order by table_name"
  );
  console.log('tables:', tables.rows.map((r) => r.table_name).join(', '));
} finally {
  await pool.end();
  await db.close();
}
