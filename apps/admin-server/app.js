const express = require('express');
const cookieParser = require('cookie-parser');

const routes = require('./routes/routes');

/**
 * The whole admin API as one router, so it can run on its own
 * (server.js, local development) or inside the website server
 * (production: thefitnessgonewild.in/api/admin).
 */
function createAdminRouter() {
  const router = express.Router();

  router.use(express.json({ limit: '2mb' }));
  router.use(cookieParser());

  router.use(routes);

  router.use((req, res) => {
    res.status(404).json({ success: false, message: 'Admin API endpoint not found' });
  });

  // Errors thrown in handlers (HttpError carries its own status)
  router.use((error, req, res, next) => {
    const status = error.status || 500;

    if (status >= 500) {
      console.error('Admin API error:', error);
    }

    if (res.headersSent) return next(error);

    res.status(status).json({
      success: false,
      message: status >= 500 ? 'Something went wrong on the server' : error.message,
    });
  });

  return router;
}

module.exports = { createAdminRouter };
