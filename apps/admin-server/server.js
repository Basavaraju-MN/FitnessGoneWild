// Standalone admin API for local development (http://localhost:4100).
// In production the same router runs inside the website server.
const express = require('express');
const cors = require('cors');

const { port, adminOrigins } = require('./config');
const dbops = require('./db/dbops');
const { createAdminRouter } = require('./app');

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and tools like curl send no Origin header
      if (!origin || adminOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.get('/health', async (req, res) => {
  try {
    await dbops.ping();
    res.json({ success: true, database: 'connected' });
  } catch (error) {
    res.status(503).json({ success: false, database: 'disconnected' });
  }
});

app.use('/api/admin', createAdminRouter());

app.listen(port, () => {
  console.log(`Fitness Gone Wild admin API on http://localhost:${port}`);
  console.log('Allowed admin origins:', adminOrigins);
});
