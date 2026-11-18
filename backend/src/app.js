const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');
const fs = require('fs');

const app = express();

// Trust reverse proxy (Render, Vercel, Cloudflare)
app.set('trust proxy', 1);

const db = require('./config/db');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json({
  limit: '15mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Persistent image serving: check Neon PostgreSQL first (survives Render restarts), fallback to local disk
app.get('/uploads/:filename', async (req, res, next) => {
  const filename = req.params.filename;
  try {
    const dbRes = await db.query('SELECT mime_type, data FROM uploads WHERE filename = $1', [filename]);
    if (dbRes.rows.length > 0) {
      res.setHeader('Content-Type', dbRes.rows[0].mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(dbRes.rows[0].data);
    }
  } catch (err) {
    // If DB check fails, continue to static fallback
  }
  next();
});
app.use('/uploads', express.static(uploadsDir));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check & root endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'quotekaro-backend',
    message: 'QuoteKaro API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      apiHealth: '/api/v1/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'quotekaro-backend',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString()
  });
});

// API Module Routes
const authRoutes = require('./auth/auth.routes');
const usersRoutes = require('./users/users.routes');
const providersRoutes = require('./providers/providers.routes');
const adminRoutes = require('./admin/admin.routes');
const jobsRoutes = require('./jobs/jobs.routes');
const { bookingsRoutes } = require('./bookings');
const paymentsRoutes = require('./payments/payments.routes');
const catalogRoutes = require('./catalog/catalog.routes');
const maintenanceRoutes = require('./maintenance/maintenance.routes');
const addressesRoutes = require('./addresses/addresses.routes');
const couponsRoutes = require('./coupons/coupons.routes');
const supportRoutes = require('./support/support.routes');
const { notificationsRoutes } = require('./notifications');
const legalRoutes = require('./legal/legal.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/providers', providersRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/addresses', addressesRoutes);
app.use('/api/v1/coupons', couponsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/legal', legalRoutes);

// Photo / media upload endpoint (persists to PostgreSQL to survive serverless/ephemeral disk restarts)
app.post('/api/v1/upload', async (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'image data is required' } });
    }
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = `${Date.now()}_${(filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const filePath = path.join(uploadsDir, safeName);

    // 1. Write to local cache
    try {
      fs.writeFileSync(filePath, buffer);
    } catch (_) {}

    // 2. Persist to Neon PostgreSQL
    let mimeType = 'image/jpeg';
    const lowerName = safeName.toLowerCase();
    if (lowerName.endsWith('.png')) mimeType = 'image/png';
    else if (lowerName.endsWith('.webp')) mimeType = 'image/webp';
    else if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';

    try {
      await db.query(
        `INSERT INTO uploads (filename, mime_type, data)
         VALUES ($1, $2, $3)
         ON CONFLICT (filename) DO UPDATE SET data = EXCLUDED.data`,
        [safeName, mimeType, buffer]
      );
    } catch (dbErr) {
      console.error('[UPLOAD DB SAVE WARNING]', dbErr.message);
    }

    const host = req.get('host') || 'quotekaro-backend.onrender.com';
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || host.includes('render.com') || host.includes('vercel.app');
    const protocol = isHttps ? 'https' : 'http';
    const publicUrl = `${protocol}://${host}/uploads/${safeName}`;

    res.status(200).json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('[UPLOAD ERROR]', err);
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Failed to process and save the uploaded image.' } });
  }
});

// Standard 404 handler conforming to 05_API_SPEC.md error format
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`
    }
  });
});

// Standard global error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error(`[SERVER ERROR 500] ${req.method} ${req.url}:`, err);
  }

  const userFacingMessage = (statusCode >= 500 && isProduction)
    ? 'Something went wrong on our end. Please try again later.'
    : (err.message || 'An unexpected error occurred');

  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR'),
      message: userFacingMessage
    }
  });
});

module.exports = app;
