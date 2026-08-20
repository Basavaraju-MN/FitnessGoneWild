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

/**
 * Render provides PORT automatically.
 *
 * Local:
 *   PORT=4000
 *
 * Render:
 *   PORT=10000 (or another Render assigned port)
 */
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

/**
 * Allow CLIENT_URL from Render environment variables.
 *
 * Example:
 *
 * CLIENT_URL=https://fitnessgonewild.onrender.com
 *
 * Or:
 *
 * CLIENT_URL=https://fitnessgonewild.in,https://www.fitnessgonewild.in
 */
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .forEach((origin) => {
      allowedOrigins.add(origin);
    });
}

/**
 * Render automatically provides RENDER_EXTERNAL_URL
 * for the service in the Render environment.
 *
 * Example:
 *
 * https://fitnessgonewild.onrender.com
 */
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
      /**
       * Requests without an Origin header can be:
       * - curl
       * - Postman
       * - Render health checks
       * - server-to-server requests
       */
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

      /**
       * Do not throw an Express error here.
       *
       * callback(new Error(...))
       *
       * was causing:
       *
       * "Unhandled server error:
       *  Error: CORS origin not allowed"
       */
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

/* =========================================================
   BODY PARSER
   ========================================================= */

/**
 * Preserve raw request body because PhonePe webhook
 * validation uses it.
 */
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

/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get('/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Fitness Gone Wild server is running',
  });
});

/* =========================================================
   API HEALTH CHECK
   ========================================================= */

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

/* =========================================================
   API ROUTES
   ========================================================= */

app.use('/api', trekRoutes);

/* =========================================================
   SERVE REACT PRODUCTION BUILD
   ========================================================= */

app.use(
  express.static(CLIENT_DIST_PATH)
);

/* =========================================================
   API 404
   ========================================================= */

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

/* =========================================================
   REACT SPA FALLBACK
   ========================================================= */

/**
 * React Router handles browser routes.
 *
 * Example:
 *
 * /treks
 * /treks/kedarkantha
 * /about
 * /contact
 */
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

/* =========================================================
   ERROR HANDLER
   ========================================================= */

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

/* =========================================================
   START SERVER
   ========================================================= */

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
