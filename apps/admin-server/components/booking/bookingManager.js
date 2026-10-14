// Bookings screen: list, details, offline bookings, balance payments.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const refundManager = require('../refund/refundManager');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  toMoney,
  logActivity,
} = require('../../utils/http');
const {
  PAYMENT_METHODS,
  BOOKING_STATUSES,
  isActiveBooking,
  paymentStatusFor,
} = require('../common/rules');

const getBookings = ({ departureId, customerId }) => dbops.getBookings({ departureId, customerId });

async function getBooking(id) {
  const booking = await dbops.getBookingById(id);
  if (!booking) throw notFound('Booking not found');

  const [payments, refunds] = await Promise.all([
    dbops.getBookingPayments(booking.id),
    refundManager.getRefundsForBooking(booking),
  ]);
  return { ...booking, payments, ...refunds };
}

// Customers are added when they book; earlier leads with the same phone are linked
async function findOrCreateCustomer({ name, phone, email, tripId }) {
  const customerId = (await dbops.getCustomerIdByPhone(phone)) ||
    (await dbops.createCustomer({ name, phone, email, tripId }));
  await dbops.linkLeadsToCustomer(customerId, phone).catch(() => {});
  return customerId;
}

// Booking taken by phone / WhatsApp / walk-in
async function createBooking(admin, body) {
  requireFields(body, ['departure_id', 'name', 'phone', 'amount']);

  const departure = await dbops.getDepartureForBooking(body.departure_id);
  if (!departure) throw badRequest('Trip coordination not found');

  const withTransport = Math.max(0, Number(body.with_transport_people) || 0);
  const withoutTransport = Math.max(0, Number(body.without_transport_people) || 0);
  const people = withTransport + withoutTransport;
  if (people < 1) throw badRequest('Add at least one person');

  const amount = toMoney(body.amount);
  const paid = toMoney(body.paid_amount);
  if (amount <= 0) throw badRequest('Total amount must be more than 0');
  if (paid > amount) throw badRequest('Paid amount cannot be more than the total');

  const method = body.payment_method || 'upi';
  if (paid > 0 && !PAYMENT_METHODS.includes(method)) throw badRequest('Unknown payment method');

  const status = BOOKING_STATUSES.includes(body.status) ? body.status : 'confirmed';

  const customerId = await findOrCreateCustomer({
    name: String(body.name).trim(),
    phone: String(body.phone).trim(),
    email: body.email,
    tripId: departure.trip_id,
  });

  let travelMode = 'without_transport';
  if (withTransport && withoutTransport) travelMode = 'mixed';
  else if (withTransport) travelMode = 'with_transport';

  const isAdvance = paid > 0 && paid < amount;

  const bookingId = await dbops.createBooking({
    // Temporary unique ref, replaced with TFGW-YYYY-NNNN below
    booking_ref: `TMP-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    departure_id: departure.id,
    customer_id: customerId,
    trip_id: departure.trip_id,
    pickup_point_id: body.pickup_point_id || null,
    people,
    with_transport_people: withTransport,
    without_transport_people: withoutTransport,
    travel_mode: travelMode,
    trek_start_date: departure.start_date,
    trek_end_date: departure.end_date,
    trip_days: departure.days,
    is_custom_trip: departure.departure_type === 'custom' ? 1 : 0,
    amount,
    amount_paid: paid,
    advance_amount: isAdvance ? paid : 0,
    balance_amount: toMoney(amount - paid),
    payment_type: isAdvance ? 'advance' : 'full',
    status,
    payment_status: paymentStatusFor(amount, paid),
    notes: body.notes || null,
    paid_at: paid > 0 ? new Date() : null,
  });

  await dbops.setBookingRef(bookingId);

  if (paid > 0) {
    await dbops.createBookingPayment({
      bookingId,
      amount: paid,
      method,
      reference: body.payment_reference,
      note: 'Paid at booking',
      receivedBy: admin.id,
    });
  }

  if (isActiveBooking(status)) await dbops.changeDepartureSeats(departure.id, people);

  await logActivity(admin, 'create', 'booking', bookingId, `${body.name} · ${people} people · ₹${amount}`);
  return { id: bookingId };
}

async function updateBooking(admin, id, body) {
  const booking = await dbops.getBookingRow(id);
  if (!booking) throw notFound('Booking not found');

  const data = pick(body, ['status', 'pickup_point_id', 'notes', 'amount']);

  if (data.status !== undefined && !BOOKING_STATUSES.includes(data.status)) {
    throw badRequest('Unknown booking status');
  }

  if (data.amount !== undefined) {
    data.amount = toMoney(data.amount);
    if (data.amount < Number(booking.amount_paid)) {
      throw badRequest('Total cannot be less than the amount already paid');
    }
    data.balance_amount = toMoney(data.amount - Number(booking.amount_paid));
    data.payment_status = paymentStatusFor(data.amount, Number(booking.amount_paid));
  }

  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  await dbops.updateBooking(booking.id, data);

  // Keep the departure seat count in step with cancellations
  if (data.status && isActiveBooking(booking.status) !== isActiveBooking(data.status)) {
    await dbops.changeDepartureSeats(
      booking.departure_id,
      isActiveBooking(data.status) ? booking.people : -booking.people
    );
  }

  await logActivity(admin, 'update', 'booking', booking.id, Object.keys(data).join(', '));
  return { id: booking.id };
}

// Balance collected after booking (cash, UPI, bank transfer…)
async function addBookingPayment(admin, id, body) {
  requireFields(body, ['amount']);

  const booking = await dbops.getBookingRow(id);
  if (!booking) throw notFound('Booking not found');

  const amount = toMoney(body.amount);
  const balance = Number(booking.balance_amount);
  if (amount <= 0) throw badRequest('Amount must be more than 0');
  if (amount > balance + 0.009) throw badRequest(`Amount is more than the balance (₹${balance})`);

  const method = body.method || 'upi';
  if (!PAYMENT_METHODS.includes(method)) throw badRequest('Unknown payment method');

  await dbops.createBookingPayment({
    bookingId: booking.id,
    amount,
    method,
    reference: body.reference,
    note: body.note,
    receivedBy: admin.id,
    paidAt: body.paid_at,
  });

  const amountPaid = toMoney(Number(booking.amount_paid) + amount);
  const newBalance = toMoney(Number(booking.amount) - amountPaid);
  const paymentStatus = paymentStatusFor(Number(booking.amount), amountPaid);

  // Balance cleared: optionally close the booking as completed
  const completeNow = Boolean(body.mark_completed) && newBalance <= 0 && booking.status !== 'cancelled';
  const status = completeNow ? 'completed' : booking.status;

  await dbops.updateBookingPayment(booking.id, { amountPaid, balance: newBalance, paymentStatus, status });

  await logActivity(
    admin, 'payment', 'booking', booking.id,
    `₹${amount} via ${method}${completeNow ? ' · marked completed' : ''}`
  );
  return { id: booking.id, balance: newBalance, paymentStatus, status };
}

module.exports = {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  addBookingPayment,
};
