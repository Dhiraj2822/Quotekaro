require('dotenv').config();
const app = require('./app');
const runMigrations = require('./migrations/migrate');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    if (process.env.AUTO_MIGRATE !== 'false') {
      console.log('Running automatic database migrations on startup...');
      await runMigrations();
    }
  } catch (err) {
    console.error('Migration check warning on startup:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`QuoteKaro backend server running on http://localhost:${PORT}`);
  });
}

start();
