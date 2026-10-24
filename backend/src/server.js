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
    setupKeepAlive();
  });
}

function setupKeepAlive() {
  const targetUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!targetUrl) return;

  const healthUrl = `${targetUrl.replace(/\/$/, '')}/health`;
  const intervalMs = 10 * 60 * 1000; // 10 minutes (Render sleeps after 15 min idle)

  console.log(`[KeepAlive] Background heartbeat enabled for ${healthUrl}`);
  setInterval(() => {
    const client = healthUrl.startsWith('https') ? require('https') : require('http');
    client.get(healthUrl, (res) => {
      console.log(`[KeepAlive] Heartbeat ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.warn(`[KeepAlive] Heartbeat warning: ${err.message}`);
    });
  }, intervalMs);
}

start();
