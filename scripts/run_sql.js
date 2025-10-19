#!/usr/bin/env node
// Usage: node scripts/run_sql.js <CONN_URI> path/to/file.sql
// Runs a SQL file against a Postgres connection string using the 'pg' library.

const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/run_sql.js <CONN_URI> <path-to-sql-file>');
    process.exit(1);
  }

  const [conn, filePath] = args;
  if (!fs.existsSync(filePath)) {
    console.error('SQL file not found:', filePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const client = new Client({ connectionString: conn });

  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error running SQL:', err.message || err);
    try { await client.query('ROLLBACK'); } catch (e) {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
