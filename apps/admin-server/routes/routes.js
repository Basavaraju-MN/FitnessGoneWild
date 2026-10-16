const express = require('express');

const controller = require('../controller/controller');
const { requireAuth, requireModule } = require('../middleware/auth');

const router = express.Router();

// can('bookings') = only roles that may open the Bookings section
const can = requireModule;

// Guides and pickup points have their own menus; categories are managed
// from the Treks & Trips screen
const MASTER_MODULES = { guides: 'guides', 'pickup-points': 'pickup-points', categories: 'packages', 'lead-statuses': 'enquiries' };
const canMaster = (req, res, next) => requireModule(MASTER_MODULES[req.params.type] || 'none')(req, res, next);

/* ---------- Public ---------- */
router.post('/auth/login', controller.login);
router.post('/auth/logout', controller.logout);
// Google sends the browser back here; the signed state ties it to an admin
router.get('/google/callback', controller.googleCallback);

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
router.post('/trips/:id/images', can('packages'), controller.uploadTripImage);
router.delete('/trips/:id/images/:number', can('packages'), controller.deleteTripImage);
router.post('/trips/:id/brochure', can('packages'), controller.uploadTripBrochure);
router.delete('/trips/:id/brochure', can('packages'), controller.deleteTripBrochure);

router.get('/departures', can('coordination'), controller.getDepartures);
router.get('/departures/:id', can('coordination'), controller.getDeparture);
router.post('/departures', can('coordination'), controller.createDeparture);
router.put('/departures/:id', can('coordination'), controller.updateDeparture);

router.get('/bookings', can('bookings'), controller.getBookings);
router.get('/bookings/:id', can('bookings'), controller.getBooking);
router.post('/bookings', can('bookings'), controller.createBooking);
router.patch('/bookings/:id', can('bookings'), controller.updateBooking);
router.post('/bookings/:id/payments', can('bookings'), controller.addBookingPayment);
router.post('/bookings/:id/invoice', can('bookings'), controller.getInvoiceLink);
router.get('/bookings/:id/invoice.pdf', can('bookings'), controller.getInvoicePdf);
router.get('/bookings/:id/invoices', can('bookings'), controller.getInvoices);
router.post('/bookings/:id/invoice/whatsapp', can('bookings'), controller.sendInvoiceWhatsApp);
router.get('/bookings/:id/whatsapp', can('bookings'), controller.getWhatsappMessages);
router.get('/whatsapp/status', can('bookings'), controller.getWhatsappStatus);
router.post('/bookings/:id/refunds', can('payments'), controller.createRefund);
router.get('/refunds', can('payments'), controller.getRefunds);
router.post('/refunds/:id/check', can('payments'), controller.checkRefund);

router.get('/activity', can('activity'), controller.getActivity);

router.get('/customers', can('customers'), controller.getCustomers);
router.get('/customers/:id', can('customers'), controller.getCustomer);
router.patch('/customers/:id', can('customers'), controller.updateCustomer);

router.get('/enquiries', can('enquiries'), controller.getEnquiries);
router.post('/enquiries', can('enquiries'), controller.createEnquiry);
router.patch('/enquiries/:id', can('enquiries'), controller.updateEnquiry);

router.get('/payments', can('payments'), controller.getPayments);

router.get('/masters/:type', canMaster, controller.getMasterList);
router.post('/masters/:type', canMaster, controller.createMaster);
router.put('/masters/:type/:id', canMaster, controller.updateMaster);

router.get('/users', can('users'), controller.getUsers);
router.post('/users', can('users'), controller.createUser);
router.put('/users/:id', can('users'), controller.updateUser);
router.post('/users/:id/reset-password', can('users'), controller.resetUserPassword);

router.get('/reviews', can('reviews'), controller.getReviews);
router.patch('/reviews/:id', can('reviews'), controller.updateReview);
router.get('/google/status', can('reviews'), controller.getGoogleStatus);
router.get('/google/connect', can('reviews'), controller.getGoogleConnectUrl);
router.get('/google/locations', can('reviews'), controller.getGoogleLocations);
router.put('/google/location', can('reviews'), controller.setGoogleLocation);
router.post('/google/sync', can('reviews'), controller.syncGoogleReviews);
router.post('/google/disconnect', can('reviews'), controller.disconnectGoogle);

router.get('/hero', can('hero'), controller.getHero);
router.post('/hero', can('hero'), controller.createHero);
router.put('/hero/order', can('hero'), controller.reorderHeroes);
router.put('/hero/timing', can('hero'), controller.saveHeroTiming);
router.put('/hero/:id', can('hero'), controller.updateHero);
router.delete('/hero/:id', can('hero'), controller.deleteHero);

router.get('/settings', can('settings'), controller.getSettings);
router.put('/settings', can('settings'), controller.updateSettings);

module.exports = router;
