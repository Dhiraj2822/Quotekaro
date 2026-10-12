const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigrations() {
  let client;
  try {
    console.log('Connecting to PostgreSQL database and running migrations...');
    client = await db.getClient();
    await client.query('BEGIN');

    // Create schema_migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (checkRes.rowCount === 0) {
        console.log(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (name) VALUES ($1)',
          [file]
        );
        console.log(`Successfully applied: ${file}`);
      } else {
        console.log(`Skipping already applied migration: ${file}`);
      }
    }

    await client.query('COMMIT');
    console.log('All migrations completed successfully.');
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        // Ignore rollback error
      }
    }
    console.error('Migration failed:', error.message || error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal:', err.message || err);
      process.exit(1);
    });
}

module.exports = runMigrations;
