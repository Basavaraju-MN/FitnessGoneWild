const express = require('express');

const { requireAuth, requireModule } = require('../middleware/auth');

const auth = require('../controller/auth');
const dashboard = require('../controller/dashboard');
const trips = require('../controller/trips');
const departures = require('../controller/departures');
const bookings = require('../controller/bookings');
const customers = require('../controller/customers');
const enquiries = require('../controller/enquiries');
const brochures = require('../controller/brochures');
const payments = require('../controller/payments');
const masters = require('../controller/masters');
const users = require('../controller/users');
const settings = require('../controller/settings');
const lookups = require('../controller/lookups');
const notifications = require('../controller/notifications');

const router = express.Router();
const can = requireModule;

// ---- Public
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);

// ---- Everything below needs a logged-in admin
router.use(requireAuth);

router.get('/auth/me', auth.me);
router.post('/auth/change-password', auth.changePassword);

router.get('/lookups', lookups.all);
router.get('/dashboard', can('dashboard'), dashboard.summary);

router.get('/trips', can('packages'), trips.list);
router.get('/trips/:id', can('packages'), trips.get);
router.post('/trips', can('packages'), trips.create);
router.put('/trips/:id', can('packages'), trips.update);

router.get('/departures', can('coordination'), departures.list);
router.get('/departures/:id', can('coordination'), departures.get);
router.post('/departures', can('coordination'), departures.create);
router.put('/departures/:id', can('coordination'), departures.update);

router.get('/bookings', can('bookings'), bookings.list);
router.get('/bookings/:id', can('bookings'), bookings.get);
router.post('/bookings', can('bookings'), bookings.create);
router.patch('/bookings/:id', can('bookings'), bookings.update);
router.post('/bookings/:id/payments', can('bookings'), bookings.addPayment);

router.get('/customers', can('customers'), customers.list);
router.get('/customers/:id', can('customers'), customers.get);
router.patch('/customers/:id', can('customers'), customers.update);

router.get('/enquiries', can('enquiries'), enquiries.list);
router.post('/enquiries', can('enquiries'), enquiries.create);
router.patch('/enquiries/:id', can('enquiries'), enquiries.update);

router.get('/brochure-downloads', can('brochures'), brochures.list);
router.get('/notifications', notifications.list);
router.patch('/brochure-downloads/:id', can('brochures'), brochures.update);

router.get('/payments', can('payments'), payments.list);

router.get('/masters/:type', can('masters'), masters.list);
router.post('/masters/:type', can('masters'), masters.create);
router.put('/masters/:type/:id', can('masters'), masters.update);

router.get('/users', can('users'), users.list);
router.post('/users', can('users'), users.create);
router.put('/users/:id', can('users'), users.update);
router.post('/users/:id/reset-password', can('users'), users.resetPassword);

router.get('/settings', can('settings'), settings.list);
router.put('/settings', can('settings'), settings.update);

module.exports = router;
