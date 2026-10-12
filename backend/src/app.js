const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const path = require('path');
const fs = require('fs');

const app = express();

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
app.use('/uploads', express.static(uploadsDir));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoints
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
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/providers', providersRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/bookings', bookingsRoutes);
app.use('/api/v1/payments', paymentsRoutes);

// Photo / media upload endpoint
app.post('/api/v1/upload', (req, res) => {
  try {
    const { image, filename } = req.body;
    if (!image) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'image data is required' } });
    }
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeName = `${Date.now()}_${(filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);
    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol || 'http';
    const publicUrl = `${protocol}://${host}/uploads/${safeName}`;
    res.status(200).json({ success: true, url: publicUrl });
  } catch (err) {
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: err.message } });
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
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
});

module.exports = app;
