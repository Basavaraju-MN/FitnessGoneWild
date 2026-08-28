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

const CLIENT_DIST_PATH = path.resolve(
  __dirname,
  '../../client/dist'
);

app.set('trust proxy', 1);

/* =========================================================
   CORS CONFIGURATION
   ========================================================= */

const allowedOrigins = new Set([
  // Local development
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:5174',

  // Render
  'https://fitnessgonewild.onrender.com',

  // Production domain
  'https://fitnessgonewild.in',
  'https://www.fitnessgonewild.in',
]);

/**
 * Preserve origins from config/config.js
 */
if (Array.isArray(clientOrigins)) {
  clientOrigins.forEach((origin) => {
    if (origin) {
      allowedOrigins.add(origin.trim().replace(/\/$/, ''));
    }
  });
}

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .forEach((origin) => {
      allowedOrigins.add(origin);
    });
}

if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.add(
    process.env.RENDER_EXTERNAL_URL
      .trim()
      .replace(/\/$/, '')
  );
}

console.log(
  'Allowed CORS origins:',
  Array.from(allowedOrigins)
);

app.use(
  cors({
    origin(origin, callback) {

      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin
        .trim()
        .replace(/\/$/, '');

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(
        `[CORS] Blocked origin: ${normalizedOrigin}`
      );

      return callback(null, false);
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  })
);

app.use(
  express.json({
    verify(req, res, buffer) {
      req.rawBody = buffer.toString('utf8');
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
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
    console.error(
      'API health check database error:',
      error?.message || error
    );

    return res.status(503).json({
      success: false,
      message: 'API is running but database is unavailable',
      database: 'disconnected',
    });
  }
});

app.use('/api', trekRoutes);

app.use(
  express.static(CLIENT_DIST_PATH)
);

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

app.use((req, res, next) => {
  if (
    req.method !== 'GET' ||
    req.path.startsWith('/api')
  ) {
    return next();
  }

  return res.sendFile(
    path.join(
      CLIENT_DIST_PATH,
      'index.html'
    ),
    (error) => {
      if (error) {
        next(error);
      }
    }
  );
});

app.use((error, req, res, next) => {
  console.error(
    'Unhandled server error:',
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `Fitness Gone Wild server listening on port ${PORT}`
    );

    console.log(
      `Client build path: ${CLIENT_DIST_PATH}`
    );
  }
);
