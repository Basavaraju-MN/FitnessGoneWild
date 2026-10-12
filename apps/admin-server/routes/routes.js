const express = require('express');

const controller = require('../controller/controller');
const { requireAuth, requireModule } = require('../middleware/auth');

const router = express.Router();

// can('bookings') = only roles that may open the Bookings section
const can = requireModule;

/* ---------- Public ---------- */
router.post('/auth/login', controller.login);
router.post('/auth/logout', controller.logout);

/* ---------- Everything below needs a logged-in admin ---------- */
router.use(requireAuth);

router.get('/auth/me', controller.me);
router.post('/auth/change-password', controller.changePassword);

router.get('/lookups', controller.getLookups);
router.get('/dashboard', can('dashboard'), controller.getDashboard);
router.get('/notifications', controller.getNotifications);

router.get('/trips', can('packages'), controller.getTrips);
router.get('/trips/:id', can('packages'), controller.getTrip);
router.post('/trips', can('packages'), controller.createTrip);
router.put('/trips/:id', can('packages'), controller.updateTrip);

router.get('/departures', can('coordination'), controller.getDepartures);
router.get('/departures/:id', can('coordination'), controller.getDeparture);
router.post('/departures', can('coordination'), controller.createDeparture);
router.put('/departures/:id', can('coordination'), controller.updateDeparture);

router.get('/bookings', can('bookings'), controller.getBookings);
router.get('/bookings/:id', can('bookings'), controller.getBooking);
router.post('/bookings', can('bookings'), controller.createBooking);
router.patch('/bookings/:id', can('bookings'), controller.updateBooking);
router.post('/bookings/:id/payments', can('bookings'), controller.addBookingPayment);

router.get('/customers', can('customers'), controller.getCustomers);
router.get('/customers/:id', can('customers'), controller.getCustomer);
router.patch('/customers/:id', can('customers'), controller.updateCustomer);

router.get('/enquiries', can('enquiries'), controller.getEnquiries);
router.post('/enquiries', can('enquiries'), controller.createEnquiry);
router.patch('/enquiries/:id', can('enquiries'), controller.updateEnquiry);

router.get('/brochure-downloads', can('brochures'), controller.getBrochureDownloads);
router.patch('/brochure-downloads/:id', can('brochures'), controller.updateBrochureDownload);

router.get('/payments', can('payments'), controller.getPayments);

router.get('/masters/:type', can('masters'), controller.getMasterList);
router.post('/masters/:type', can('masters'), controller.createMaster);
router.put('/masters/:type/:id', can('masters'), controller.updateMaster);

router.get('/users', can('users'), controller.getUsers);
router.post('/users', can('users'), controller.createUser);
router.put('/users/:id', can('users'), controller.updateUser);
router.post('/users/:id/reset-password', can('users'), controller.resetUserPassword);

router.get('/settings', can('settings'), controller.getSettings);
router.put('/settings', can('settings'), controller.updateSettings);

module.exports = router;
