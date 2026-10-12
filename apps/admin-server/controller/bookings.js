const { query, queryOne } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  toMoney,
  logActivity,
} = require('../utils/http');

const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'phonepe', 'other'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];
const isActive = (status) => status === 'confirmed' || status === 'completed';

const LIST_SQL = `
  SELECT b.id, b.booking_ref, b.departure_id, b.trip_id, t.name AS trip_name,
         b.trek_start_date, b.trek_end_date, b.trip_days, b.is_custom_trip,
         b.people, b.with_transport_people, b.without_transport_people, b.travel_mode,
         b.amount, b.amount_paid, b.advance_amount, b.balance_amount,
         b.payment_type, b.status, b.payment_status, b.notes,
         b.merchant_order_id, b.payment_transaction_id, b.payment_method, b.paid_at, b.booked_at,
         c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
         b.pickup_point_id, p.name AS pickup_name
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  LEFT JOIN trips t ON t.id = b.trip_id
  LEFT JOIN pickup_points p ON p.id = b.pickup_point_id`;

const paymentStatusFor = (amount, paid) =>
  paid <= 0 ? 'unpaid' : paid + 0.009 >= amount ? 'paid' : 'partial';

async function findOrCreateCustomer({ name, phone, email, trip_id }) {
  const existing = await queryOne(
    'SELECT id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1',
    [phone]
  );
  if (existing) return existing.id;

  const result = await query(
    'INSERT INTO customers (name, phone, email, trip_id, created_at) VALUES (?, ?, ?, ?, NOW())',
    [name, phone, email || null, trip_id || null]
  );
  return result.insertId;
}

async function changeSeats(departureId, delta) {
  if (!departureId || !delta) return;
  await query(
    `UPDATE departures
       SET seats_booked = GREATEST(0, seats_booked + ?),
           status = CASE
             WHEN status = 'open' AND seats_booked >= seats_total THEN 'full'
             WHEN status = 'full' AND seats_booked < seats_total THEN 'open'
             ELSE status END
     WHERE id = ?`,
    [delta, departureId]
  );
}

exports.list = async (req, res) => {
  const where = [];
  const params = [];

  if (req.query.departure_id) {
    where.push('b.departure_id = ?');
    params.push(req.query.departure_id);
  }
  if (req.query.customer_id) {
    where.push('b.customer_id = ?');
    params.push(req.query.customer_id);
  }

  ok(res, await query(
    `${LIST_SQL} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY b.booked_at DESC LIMIT 2000`,
    params
  ));
};

exports.get = async (req, res) => {
  const booking = await queryOne(`${LIST_SQL} WHERE b.id = ?`, [req.params.id]);
  if (!booking) throw notFound('Booking not found');

  const payments = await query(`
    SELECT bp.id, bp.amount, bp.method, bp.reference, bp.note, bp.paid_at,
           a.full_name AS received_by_name
    FROM booking_payments bp
    LEFT JOIN admin_users a ON a.id = bp.received_by
    WHERE bp.booking_id = ?
    ORDER BY bp.paid_at`, [booking.id]);

  ok(res, { ...booking, payments });
};

// Booking taken by phone / WhatsApp / walk-in
exports.create = async (req, res) => {
  requireFields(req.body, ['departure_id', 'name', 'phone', 'amount']);

  const departure = await queryOne(
    `SELECT id, trip_id, start_date, end_date, departure_type,
            DATEDIFF(end_date, start_date) + 1 AS days
     FROM departures WHERE id = ?`,
    [req.body.departure_id]
  );
  if (!departure) throw badRequest('Trip coordination not found');

  const withTransport = Math.max(0, Number(req.body.with_transport_people) || 0);
  const withoutTransport = Math.max(0, Number(req.body.without_transport_people) || 0);
  const people = withTransport + withoutTransport;
  if (people < 1) throw badRequest('Add at least one person');

  const amount = toMoney(req.body.amount);
  const paid = toMoney(req.body.paid_amount);
  if (amount <= 0) throw badRequest('Total amount must be more than 0');
  if (paid > amount) throw badRequest('Paid amount cannot be more than the total');

  const method = req.body.payment_method || 'upi';
  if (paid > 0 && !PAYMENT_METHODS.includes(method)) throw badRequest('Unknown payment method');

  const status = BOOKING_STATUSES.includes(req.body.status) ? req.body.status : 'confirmed';

  const customerId = await findOrCreateCustomer({
    name: String(req.body.name).trim(),
    phone: String(req.body.phone).trim(),
    email: req.body.email,
    trip_id: departure.trip_id,
  });

  let travelMode = 'without_transport';
  if (withTransport && withoutTransport) travelMode = 'mixed';
  else if (withTransport) travelMode = 'with_transport';

  const result = await query('INSERT INTO bookings SET ?', [{
    booking_ref: `TMP-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    departure_id: departure.id,
    customer_id: customerId,
    trip_id: departure.trip_id,
    pickup_point_id: req.body.pickup_point_id || null,
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
    advance_amount: paid > 0 && paid < amount ? paid : 0,
    balance_amount: toMoney(amount - paid),
    payment_type: paid > 0 && paid < amount ? 'advance' : 'full',
    status,
    payment_status: paymentStatusFor(amount, paid),
    notes: req.body.notes || null,
    paid_at: paid > 0 ? new Date() : null,
  }]);

  const bookingId = result.insertId;
  await query(
    "UPDATE bookings SET booking_ref = CONCAT('TFGW-', YEAR(booked_at), '-', LPAD(id, 4, '0')) WHERE id = ?",
    [bookingId]
  );

  if (paid > 0) {
    await query(
      'INSERT INTO booking_payments (booking_id, amount, method, reference, note, received_by) VALUES (?, ?, ?, ?, ?, ?)',
      [bookingId, paid, method, req.body.payment_reference || null, 'Paid at booking', req.admin.id]
    );
  }

  if (isActive(status)) await changeSeats(departure.id, people);

  await logActivity(req, 'create', 'booking', bookingId, `${req.body.name} · ${people} people · ₹${amount}`);
  ok(res, { id: bookingId });
};

exports.update = async (req, res) => {
  const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) throw notFound('Booking not found');

  const data = pick(req.body, ['status', 'pickup_point_id', 'notes', 'amount']);

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

  await query('UPDATE bookings SET ? WHERE id = ?', [data, booking.id]);

  // Keep the departure seat count in step with cancellations
  if (data.status && isActive(booking.status) !== isActive(data.status)) {
    await changeSeats(booking.departure_id, isActive(data.status) ? booking.people : -booking.people);
  }

  await logActivity(req, 'update', 'booking', booking.id, Object.keys(data).join(', '));
  ok(res, { id: booking.id });
};

// Balance collected after booking (cash, UPI, bank transfer…)
exports.addPayment = async (req, res) => {
  requireFields(req.body, ['amount']);

  const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (!booking) throw notFound('Booking not found');

  const amount = toMoney(req.body.amount);
  const balance = Number(booking.balance_amount);
  if (amount <= 0) throw badRequest('Amount must be more than 0');
  if (amount > balance + 0.009) throw badRequest(`Amount is more than the balance (₹${balance})`);

  const method = req.body.method || 'upi';
  if (!PAYMENT_METHODS.includes(method)) throw badRequest('Unknown payment method');

  await query(
    'INSERT INTO booking_payments (booking_id, amount, method, reference, note, received_by, paid_at) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))',
    [booking.id, amount, method, req.body.reference || null, req.body.note || null, req.admin.id, req.body.paid_at || null]
  );

  const paid = toMoney(Number(booking.amount_paid) + amount);
  const newBalance = toMoney(Number(booking.amount) - paid);
  const paymentStatus = paymentStatusFor(Number(booking.amount), paid);

  // Balance cleared: optionally close the booking as completed
  const completeNow = Boolean(req.body.mark_completed) && newBalance <= 0 && booking.status !== 'cancelled';

  await query(
    'UPDATE bookings SET amount_paid = ?, balance_amount = ?, payment_status = ?, status = ? WHERE id = ?',
    [paid, newBalance, paymentStatus, completeNow ? 'completed' : booking.status, booking.id]
  );

  await logActivity(
    req,
    'payment',
    'booking',
    booking.id,
    `₹${amount} via ${method}${completeNow ? ' · marked completed' : ''}`
  );
  ok(res, { id: booking.id, balance: newBalance, paymentStatus, status: completeNow ? 'completed' : booking.status });
};
