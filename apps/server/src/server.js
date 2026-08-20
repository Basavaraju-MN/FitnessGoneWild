const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '../.env'),
});

const trekRoutes = require('./routes/routes');
const { clientOrigins } = require('./config/config');
const { checkDatabaseConnection } = require('./db/connection');

const app = express();

const PORT = Number(process.env.PORT || 4000);
const CLIENT_DIST_PATH = path.resolve(__dirname, '../../client/dist');

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (clientOrigins.includes(origin)) {
        return callback(null, true);
      }

      // When the frontend is served by this same Express server, browser
      // requests are same-origin and do not require CORS.
      if (process.env.NODE_ENV === 'production') {
        const productionOrigin = process.env.CLIENT_URL?.split(',')[0]?.trim();

        if (productionOrigin && origin === productionOrigin) {
          return callback(null, true);
        }
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);

// Preserve the raw request body because PhonePe webhook validation uses it.
app.use(
  express.json({
    verify(req, res, buffer) {
      req.rawBody = buffer.toString('utf8');
    },
  })
);

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Fitness Gone Wild server is running',
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await checkDatabaseConnection();

    return res.status(200).json({
      success: true,
      message: 'Fitness Gone Wild API is healthy',
      database: 'connected',
    });
  } catch (error) {
    console.error('API health check database error:', error?.message || error);

    return res.status(503).json({
      success: false,
      message: 'API is running but database is unavailable',
      database: 'disconnected',
    });
  }
});

app.use('/api', trekRoutes);

// Serve the Vite production build from the same Render Web Service.
app.use(express.static(CLIENT_DIST_PATH));

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// SPA fallback: React Router handles browser routes.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) {
    return next();
  }

  return res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fitness Gone Wild server listening on port ${PORT}`);
  console.log(`Client build path: ${CLIENT_DIST_PATH}`);
});
