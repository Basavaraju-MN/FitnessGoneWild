const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '../.env'),
});

const trekRoutes = require('./routes/routes');
const { cachePublicApi, clearOnAdminChange } = require('./utils/apiCache');
const { trekPage } = require('./utils/trekShare');
const { clientOrigins } = require('./config/config');
const { checkDatabaseConnection } = require('./db/connection');
const { db } = require('./config/database');
const { invoicePage, invoicePdfPage } = require('./components/invoice/invoice');
const whatsappCloud = require('./components/whatsapp/whatsappCloud');

const app = express();

const PORT = Number(process.env.PORT || 4000);

const CLIENT_DIST_PATH = path.resolve(
  __dirname,
  '../../client/dist'
);

// Admin portal build (apps/admin), served at /admin
const ADMIN_DIST_PATH = path.resolve(
  __dirname,
  '../../admin/dist'
);

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Gzip text answers (HTML, JS, CSS, JSON): about 70% less bandwidth.
// Photos and PDFs are already compressed, so they are sent as they are.
app.use(compression());

/* =========================================================
   SECURITY HEADERS (website, admin and API)
   Scripts only from this site: no inline scripts, no eval.
   Styles may be inline (React style={...}, the rich text editor).
   ========================================================= */

const isProduction = process.env.NODE_ENV === 'production';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Trek photos, Unsplash heroes, Google review photos, uploads being previewed
  "img-src 'self' data: blob: https:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "form-action 'self'",
  // Live site only: on http://localhost it would break local testing
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  // Browsers use HTTPS only for the next 2 years (the site has no HTTP pages)
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/* =========================================================
   CORS CONFIGURATION
   ========================================================= */

const allowedOrigins = new Set([
  // Local development
  // 'http://localhost:3000',
  // 'http://localhost:4000',
  'http://localhost:4000',
  'http://localhost:5173',
  'http://localhost:5174',

  // Render
  'https://fitnessgonewild.onrender.com',

  // Production domain
  'https://thefitnessgonewild.in',
  'https://www.thefitnessgonewild.in',
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

    // Lets the client read the brochure file name.
    exposedHeaders: ['Content-Disposition'],
  })
);

// WhatsApp delivery status (sent / delivered / read). Raw body: its
// signature is checked against WHATSAPP_APP_SECRET.
app.get('/api/whatsapp/webhook', whatsappCloud.verifyWebhook);
app.post('/api/whatsapp/webhook', express.raw({ type: '*/*', limit: '1mb' }), whatsappCloud.receiveWebhook);

const jsonParser = express.json({
  verify(req, res, buffer) {
    req.rawBody = buffer.toString('utf8');
  },
});

// The admin API reads its own JSON with a higher limit (photo and
// brochure uploads), so its requests skip this parser.
app.use((req, res, next) =>
  req.path.startsWith('/api/admin') ? next() : jsonParser(req, res, next)
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

    // The error code (no passwords) says why, e.g.
    // ER_ACCESS_DENIED_ERROR = this server's IP / password not allowed,
    // ETIMEDOUT = blocked or unreachable, ENOTFOUND = wrong host name
    return res.status(503).json({
      success: false,
      message: 'API is running but database is unavailable',
      database: 'disconnected',
      error: error?.code || 'UNKNOWN',
      host: db.host,
    });
  }
});

/* =========================================================
   ADMIN PORTAL
   API at /api/admin (apps/admin-server), app at /admin.
   If the admin cannot start (e.g. ADMIN_JWT_SECRET missing),
   the website keeps running without it.
   ========================================================= */

try {
  const { createAdminRouter } = require('../../admin-server/app');
  // A change saved in the admin clears the website's API cache
  app.use('/api/admin', clearOnAdminChange, createAdminRouter());
  console.log('Admin API mounted at /api/admin');
} catch (error) {
  console.error('Admin API not mounted:', error);

  // Say why, instead of a generic "API endpoint not found",
  // so the admin login page shows the real problem.
  const reason = String(error?.message || error).split('\n')[0];
  app.use('/api/admin', (req, res) => {
    res.status(503).json({
      success: false,
      message: `Admin portal is not available: ${reason}`,
    });
  });
}

app.use('/admin', express.static(ADMIN_DIST_PATH));

// The admin is a single-page app: any /admin URL loads its index.html
app.get(/^\/admin(\/.*)?$/, (req, res, next) => {
  res.sendFile(path.join(ADMIN_DIST_PATH, 'index.html'), (error) => {
    if (error) next();
  });
});

// Customer invoice (link sent on WhatsApp from the admin)
// Print button of the invoice page (a file, so the CSP needs no inline script)
app.get('/invoice-print.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send("document.getElementById('print-invoice')?.addEventListener('click', () => window.print());");
});
app.get('/invoice/:token', invoicePage);
app.get('/invoice/:token/pdf', invoicePdfPage);

// Public website data is cached for 2 minutes (fewer database connections)
app.use('/api', cachePublicApi, trekRoutes);

// Shareable trek link: the page with that trek's title and photo for previews
app.get('/treks/:slug', trekPage(CLIENT_DIST_PATH));

// Browsers keep website files instead of downloading them on every visit.
// Built JS/CSS have a content hash in their name, so they never change;
// photos can be replaced from the admin, so they are kept for a day.
app.use(
  express.static(CLIENT_DIST_PATH, {
    setHeaders(res, filePath) {
      const relative = path.relative(CLIENT_DIST_PATH, filePath);
      if (relative.startsWith(`assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (relative.startsWith(`images${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      }
    },
  })
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

    // Copy the Hostinger brochures to this server in the background
    setTimeout(() => {
      require('./components/broucher/ftpBrochure').warmUp()
        .catch((error) => console.error('Brochure warm-up failed:', error?.message || error));
    }, 5000);
  }
);
