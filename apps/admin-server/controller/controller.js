// All admin API handlers, in the same order as routes/routes.js.
// Each one: read the request -> call the screen's manager (components/<screen>/) -> send the response.
// Errors go to next(error); app.js turns them into the JSON error reply.
const { cookieName, sessionHours, isProduction } = require('../config');
const authManager = require('../components/auth/authManager');
const dashboardManager = require('../components/dashboard/dashboardManager');
const notificationManager = require('../components/notification/notificationManager');
const lookupManager = require('../components/lookup/lookupManager');
const packageManager = require('../components/package/packageManager');
const coordinationManager = require('../components/coordination/coordinationManager');
const bookingManager = require('../components/booking/bookingManager');
const customerManager = require('../components/customer/customerManager');
const enquiryManager = require('../components/enquiry/enquiryManager');
const paymentManager = require('../components/payment/paymentManager');
const masterManager = require('../components/master/masterManager');
const userManager = require('../components/user/userManager');
const settingManager = require('../components/setting/settingManager');
const reviewManager = require('../components/review/reviewManager');
const activityManager = require('../components/activity/activityManager');
const refundManager = require('../components/refund/refundManager');
const heroManager = require('../components/hero/heroManager');

// Session cookie: the admin is on the same site as its API
// (thefitnessgonewild.in/admin and /api/admin; localhost ports locally)
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: sessionHours * 60 * 60 * 1000,
};

const idParam = (req) => Number(req.params.id);

/* =====================================================================
   AUTH
   ===================================================================== */

exports.login = async (req, res, next) => {
  try {
    const { user, token } = await authManager.login(req.body?.username, req.body?.password);
    res.cookie(cookieName, token, cookieOptions);
    return res.status(200).json({ success: true, message: 'Logged in', data: user });
  } catch (error) {
    return next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    return res.status(200).json({ success: true, message: 'Logged out', data: true });
  } catch (error) {
    return next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, message: 'Current user', data: authManager.publicUser(req.admin) });
  } catch (error) {
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    await authManager.changePassword(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Password changed', data: true });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   DASHBOARD, NOTIFICATIONS, LOOKUPS
   ===================================================================== */

exports.getLookups = async (req, res, next) => {
  try {
    const data = await lookupManager.getLookups();
    return res.status(200).json({ success: true, message: 'Lookups fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await dashboardManager.getDashboard(req.admin);
    return res.status(200).json({ success: true, message: 'Dashboard fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const data = await notificationManager.getNotifications(req.admin);
    return res.status(200).json({ success: true, message: 'Notifications fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   PACKAGES & TRIPS
   ===================================================================== */

exports.getTrips = async (req, res, next) => {
  try {
    const data = await packageManager.getTrips();
    return res.status(200).json({ success: true, message: 'Trips fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getTrip = async (req, res, next) => {
  try {
    const data = await packageManager.getTrip(idParam(req));
    return res.status(200).json({ success: true, message: 'Trip fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createTrip = async (req, res, next) => {
  try {
    const data = await packageManager.createTrip(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Trip created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateTrip = async (req, res, next) => {
  try {
    const data = await packageManager.updateTrip(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Trip updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.uploadTripImage = async (req, res, next) => {
  try {
    const data = await packageManager.uploadTripImage(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Photo saved successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.deleteTripImage = async (req, res, next) => {
  try {
    const data = await packageManager.deleteTripImage(req.admin, idParam(req), Number(req.params.number));
    return res.status(200).json({ success: true, message: 'Photo removed successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.uploadTripBrochure = async (req, res, next) => {
  try {
    const data = await packageManager.uploadTripBrochure(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Brochure saved successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.deleteTripBrochure = async (req, res, next) => {
  try {
    const data = await packageManager.deleteTripBrochure(req.admin, idParam(req));
    return res.status(200).json({ success: true, message: 'Brochure removed successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   TRIP COORDINATION (departures)
   ===================================================================== */

exports.getDepartures = async (req, res, next) => {
  try {
    const data = await coordinationManager.getDepartures({ when: req.query.when, tripId: req.query.trip_id });
    return res.status(200).json({ success: true, message: 'Trip coordinations fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getDeparture = async (req, res, next) => {
  try {
    const data = await coordinationManager.getDeparture(idParam(req));
    return res.status(200).json({ success: true, message: 'Trip coordination fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createDeparture = async (req, res, next) => {
  try {
    const data = await coordinationManager.createDeparture(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Trip coordination created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateDeparture = async (req, res, next) => {
  try {
    const data = await coordinationManager.updateDeparture(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Trip coordination updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   BOOKINGS
   ===================================================================== */

exports.getBookings = async (req, res, next) => {
  try {
    const data = await bookingManager.getBookings({
      departureId: req.query.departure_id,
      customerId: req.query.customer_id,
    });
    return res.status(200).json({ success: true, message: 'Bookings fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getBooking = async (req, res, next) => {
  try {
    const data = await bookingManager.getBooking(idParam(req));
    return res.status(200).json({ success: true, message: 'Booking fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createBooking = async (req, res, next) => {
  try {
    const data = await bookingManager.createBooking(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Booking created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateBooking = async (req, res, next) => {
  try {
    const data = await bookingManager.updateBooking(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Booking updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.addBookingPayment = async (req, res, next) => {
  try {
    const data = await bookingManager.addBookingPayment(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Payment recorded successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   REFUNDS
   ===================================================================== */

exports.getRefunds = async (req, res, next) => {
  try {
    const data = await refundManager.getRefunds();
    return res.status(200).json({ success: true, message: 'Refunds fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createRefund = async (req, res, next) => {
  try {
    const data = await refundManager.createRefund(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Refund started successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.checkRefund = async (req, res, next) => {
  try {
    const data = await refundManager.checkRefund(idParam(req));
    return res.status(200).json({ success: true, message: 'Refund status checked', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   ACTIVITY LOG
   ===================================================================== */

exports.getActivity = async (req, res, next) => {
  try {
    const data = await activityManager.getActivity(req.query.type);
    return res.status(200).json({ success: true, message: 'Activity fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   CUSTOMERS
   ===================================================================== */

exports.getCustomers = async (req, res, next) => {
  try {
    const data = await customerManager.getCustomers();
    return res.status(200).json({ success: true, message: 'Customers fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const data = await customerManager.getCustomer(idParam(req));
    return res.status(200).json({ success: true, message: 'Customer fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const data = await customerManager.updateCustomer(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Customer updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   ENQUIRIES
   ===================================================================== */

exports.getEnquiries = async (req, res, next) => {
  try {
    const data = await enquiryManager.getEnquiries();
    return res.status(200).json({ success: true, message: 'Enquiries fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createEnquiry = async (req, res, next) => {
  try {
    const data = await enquiryManager.createEnquiry(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Enquiry created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateEnquiry = async (req, res, next) => {
  try {
    const data = await enquiryManager.updateEnquiry(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Enquiry updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   PAYMENTS
   ===================================================================== */

exports.getPayments = async (req, res, next) => {
  try {
    const { data, stats } = await paymentManager.getPayments();
    return res.status(200).json({ success: true, message: 'Payments fetched successfully', data, stats });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   MASTER DATA
   ===================================================================== */

exports.getMasterList = async (req, res, next) => {
  try {
    const data = await masterManager.getMasterList(req.params.type);
    return res.status(200).json({ success: true, message: 'Master data fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createMaster = async (req, res, next) => {
  try {
    const data = await masterManager.createMaster(req.admin, req.params.type, req.body || {});
    return res.status(200).json({ success: true, message: 'Record created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateMaster = async (req, res, next) => {
  try {
    const data = await masterManager.updateMaster(req.admin, req.params.type, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Record updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   USERS & ROLES
   ===================================================================== */

exports.getUsers = async (req, res, next) => {
  try {
    const data = await userManager.getUsers();
    return res.status(200).json({ success: true, message: 'Users fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const data = await userManager.createUser(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'User created successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const data = await userManager.updateUser(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'User updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const data = await userManager.resetUserPassword(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Password reset successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   SETTINGS
   ===================================================================== */

exports.getSettings = async (req, res, next) => {
  try {
    const data = await settingManager.getSettings();
    return res.status(200).json({ success: true, message: 'Settings fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const data = await settingManager.updateSettings(req.admin, req.body?.settings);
    return res.status(200).json({ success: true, message: 'Settings saved successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   REVIEWS (website + Google Business Profile)
   ===================================================================== */

exports.getReviews = async (req, res, next) => {
  try {
    const data = await reviewManager.getReviews();
    return res.status(200).json({ success: true, message: 'Reviews fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const data = await reviewManager.updateReview(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Review updated successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getGoogleStatus = async (req, res, next) => {
  try {
    const data = await reviewManager.getGoogleStatus(req);
    return res.status(200).json({ success: true, message: 'Google status fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.getGoogleConnectUrl = async (req, res, next) => {
  try {
    const url = reviewManager.getGoogleConnectUrl(req, req.admin);
    return res.status(200).json({ success: true, message: 'Google sign-in link created', data: { url } });
  } catch (error) {
    return next(error);
  }
};

// Google redirects the browser here after sign-in (not a JSON call)
exports.googleCallback = async (req, res) => {
  const next = await reviewManager.finishGoogleConnect(req);
  return res.redirect(next);
};

exports.getGoogleLocations = async (req, res, next) => {
  try {
    const data = await reviewManager.getGoogleLocations();
    return res.status(200).json({ success: true, message: 'Google locations fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.setGoogleLocation = async (req, res, next) => {
  try {
    const data = await reviewManager.setGoogleLocation(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Google location saved and synced', data });
  } catch (error) {
    return next(error);
  }
};

exports.syncGoogleReviews = async (req, res, next) => {
  try {
    const data = await reviewManager.syncGoogleReviews();
    return res.status(200).json({ success: true, message: 'Google reviews synced', data });
  } catch (error) {
    return next(error);
  }
};

exports.disconnectGoogle = async (req, res, next) => {
  try {
    await reviewManager.disconnectGoogle(req.admin);
    return res.status(200).json({ success: true, message: 'Google disconnected', data: true });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   WEBSITE HERO
   ===================================================================== */

exports.getHero = async (req, res, next) => {
  try {
    const data = await heroManager.getHero();
    return res.status(200).json({ success: true, message: 'Hero fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

exports.createHero = async (req, res, next) => {
  try {
    const data = await heroManager.createHero(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Hero created', data });
  } catch (error) {
    return next(error);
  }
};

exports.updateHero = async (req, res, next) => {
  try {
    const data = await heroManager.updateHero(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Hero saved', data });
  } catch (error) {
    return next(error);
  }
};

exports.deleteHero = async (req, res, next) => {
  try {
    await heroManager.deleteHero(req.admin, idParam(req));
    return res.status(200).json({ success: true, message: 'Hero deleted', data: true });
  } catch (error) {
    return next(error);
  }
};

exports.reorderHeroes = async (req, res, next) => {
  try {
    const data = await heroManager.reorderHeroes(req.admin, req.body?.ids || []);
    return res.status(200).json({ success: true, message: 'Order saved', data });
  } catch (error) {
    return next(error);
  }
};

exports.saveHeroTiming = async (req, res, next) => {
  try {
    const data = await heroManager.saveHeroTiming(req.admin, req.body || {});
    return res.status(200).json({ success: true, message: 'Saved', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   INVOICE (WhatsApp)
   ===================================================================== */

exports.getInvoiceLink = async (req, res, next) => {
  try {
    const data = await bookingManager.getInvoiceLink(req.admin, idParam(req), { send: Boolean(req.body?.send) });
    return res.status(200).json({ success: true, message: 'Invoice link ready', data });
  } catch (error) {
    return next(error);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const { fileName, pdf } = await bookingManager.getInvoicePdf(req.admin, idParam(req));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName}"` });
    return res.send(pdf);
  } catch (error) {
    return next(error);
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const data = await bookingManager.getInvoices(idParam(req));
    return res.status(200).json({ success: true, message: 'Invoices fetched successfully', data });
  } catch (error) {
    return next(error);
  }
};

/* =====================================================================
   WHATSAPP BUSINESS API (invoice as an attachment)
   ===================================================================== */

exports.sendInvoiceWhatsApp = async (req, res, next) => {
  try {
    const data = await bookingManager.sendInvoiceWhatsApp(req.admin, idParam(req));
    return res.status(200).json({ success: true, message: 'Invoice sent on WhatsApp', data });
  } catch (error) {
    return next(error);
  }
};

exports.getWhatsappMessages = async (req, res, next) => {
  try {
    const data = await bookingManager.getWhatsappMessages(idParam(req));
    return res.status(200).json({ success: true, message: 'Messages fetched', data });
  } catch (error) {
    return next(error);
  }
};

exports.getWhatsappStatus = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, message: 'WhatsApp status', data: bookingManager.getWhatsappStatus() });
  } catch (error) {
    return next(error);
  }
};
