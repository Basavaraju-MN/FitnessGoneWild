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
const brochureManager = require('../components/brochure/brochureManager');
const paymentManager = require('../components/payment/paymentManager');
const masterManager = require('../components/master/masterManager');
const userManager = require('../components/user/userManager');
const settingManager = require('../components/setting/settingManager');

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
   BROCHURE DOWNLOADS
   ===================================================================== */

exports.getBrochureDownloads = async (req, res, next) => {
  try {
    const { rows, stats } = await brochureManager.getBrochureDownloads();
    return res.status(200).json({ success: true, message: 'Brochure downloads fetched successfully', data: rows, stats });
  } catch (error) {
    return next(error);
  }
};

exports.updateBrochureDownload = async (req, res, next) => {
  try {
    const data = await brochureManager.updateBrochureDownload(req.admin, idParam(req), req.body || {});
    return res.status(200).json({ success: true, message: 'Lead updated successfully', data });
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
