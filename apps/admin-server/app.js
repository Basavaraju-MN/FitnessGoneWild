const express = require('express');
const cookieParser = require('cookie-parser');

const routes = require('./routes/routes');
const reviewManager = require('./components/review/reviewManager');
const refundManager = require('./components/refund/refundManager');
const { HttpError } = require('./utils/http');

/**
 * The whole admin API as one router, so it can run on its own
 * (server.js, local development) or inside the website server
 * (production: thefitnessgonewild.in/api/admin).
 */
function createAdminRouter() {
  const router = express.Router();

  // Photos and brochure PDFs are sent as base64 inside JSON
  router.use(express.json({ limit: '30mb' }));
  router.use(cookieParser());

  router.use(routes);

  // Keeps Google reviews in sync in the background (when connected)
  reviewManager.startAutoSync();
  // Checks pending PhonePe refunds until they complete or fail
  refundManager.startRefundChecks();

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

    // Our own errors (HttpError, e.g. "PhonePe: …") say what went wrong;
    // anything unexpected (database, bugs) gets a general message
    res.status(status).json({
      success: false,
      message: error instanceof HttpError ? error.message : 'Something went wrong on the server',
    });
  });

  return router;
}

module.exports = { createAdminRouter };
