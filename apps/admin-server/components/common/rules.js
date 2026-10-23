// Rules used by several screens.
const { badRequest } = require('../../utils/http');

const ROLES = ['admin', 'sales', 'operations'];
const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'phonepe', 'other'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
const ENQUIRY_SOURCES = ['website', 'brochure', 'whatsapp', 'phone', 'instagram', 'walkin'];
const FOLLOW_UP_STATUSES = ['not_contacted', 'contacted', 'interested', 'converted', 'not_interested'];

// Bookings that count (hold seats, show in totals)
const isActiveBooking = (status) => status === 'confirmed' || status === 'completed';

const paymentStatusFor = (amount, paid) =>
  paid <= 0 ? 'unpaid' : paid + 0.009 >= amount ? 'paid' : 'partial';

// Screens a role may open (set in Users & Roles → Role permissions)
const modulesForRole = (role) => require('../permission/permissionManager').modulesForRole(role);

const checkPassword = (password) => {
  if (String(password || '').length < 8) {
    throw badRequest('Password must be at least 8 characters');
  }
};

module.exports = {
  ROLES,
  PAYMENT_METHODS,
  BOOKING_STATUSES,
  ENQUIRY_SOURCES,
  FOLLOW_UP_STATUSES,
  isActiveBooking,
  paymentStatusFor,
  modulesForRole,
  checkPassword,
};
