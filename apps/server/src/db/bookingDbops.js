const { executeQuery } = require('./connection');

const queries = {
  // Scheduled departures match on trip + start date; custom trips also on end date
  findDeparture: `SELECT id FROM departures WHERE trip_id = ? AND start_date = ? AND departure_type = ? AND (departure_type = 'scheduled' OR end_date = ?) ORDER BY id LIMIT 1`,
  createDeparture: `INSERT INTO departures (trip_id, start_date, end_date, departure_type, seats_booked, status) VALUES (?, ?, ?, ?, 0, 'open')`,
  addSeatsBooked: `UPDATE departures SET seats_booked = seats_booked + ?, status = IF(status = 'open' AND seats_booked >= seats_total, 'full', status) WHERE id = ?`,

  findCustomerByPhone: `SELECT id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1`,
  createCustomer: `INSERT INTO customers (name, phone, email, trip_id, created_at) VALUES (?, ?, ?, ?, NOW())`,

  findPickupPoint: `SELECT id FROM pickup_points WHERE trip_id = ? AND name = ? ORDER BY id LIMIT 1`,

  // merchant_order_id is UNIQUE, so the same payment is booked only once
  createBooking: `INSERT INTO bookings (booking_ref, departure_id, customer_id, trip_id, pickup_point_id, people, with_transport_people, without_transport_people, travel_mode, trek_start_date, trek_end_date, trip_days, is_custom_trip, amount, amount_paid, advance_amount, balance_amount, payment_type, status, payment_status, merchant_order_id, payment_transaction_id, phonepe_order_id, payment_method, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, NOW())`,
  // Readable reference from the row id, e.g. TFGW-2026-0042
  setBookingRef: `UPDATE bookings SET booking_ref = CONCAT('TFGW-', YEAR(booked_at), '-', LPAD(id, 4, '0')) WHERE id = ?`,
};

const toDateOrNull = (value) => {
  const date = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};

const toCount = (value) => Math.max(0, Math.floor(Number(value) || 0));

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const parseBookingDetails = (value) => {
  if (value && typeof value === 'object') return value;

  try {
    return JSON.parse(value || '{}') || {};
  } catch {
    return {};
  }
};

async function findOrCreateDeparture(tripId, startDate, endDate, departureType) {
  const params = [tripId, startDate, departureType, endDate];
  const rows = await executeQuery(queries.findDeparture, params);
  if (rows[0]) return rows[0].id;

  try {
    const result = await executeQuery(queries.createDeparture, [
      tripId, startDate, endDate, departureType,
    ]);
    return result.insertId;
  } catch (error) {
    // Another request created it at the same moment
    if (error?.code === 'ER_DUP_ENTRY') {
      const again = await executeQuery(queries.findDeparture, params);
      if (again[0]) return again[0].id;
    }
    throw error;
  }
}

async function findOrCreateCustomer({ name, phone, email, tripId }) {
  const rows = await executeQuery(queries.findCustomerByPhone, [phone]);
  if (rows[0]) return rows[0].id;

  const result = await executeQuery(queries.createCustomer, [
    name || 'Customer', phone, email || null, tripId,
  ]);
  return result.insertId;
}

async function findPickupPointId(tripId, pickupName) {
  if (!pickupName) return null;
  const rows = await executeQuery(queries.findPickupPoint, [tripId, pickupName]);
  return rows[0]?.id || null;
}

/**
 * Creates the booking for a successful payment and adds its people
 * to the departure. Safe to call many times for the same payment
 * (webhook, status check, receipt page): it is booked once.
 */
async function recordBooking(transaction) {
  if (
    !transaction ||
    String(transaction.status || '').toUpperCase() !== 'SUCCESS'
  ) {
    return null;
  }

  const details = parseBookingDetails(transaction.booking_details);

  const tripId = Number(details.trekId) || null;
  const startDate = toDateOrNull(details.tripStartDate);
  const endDate = toDateOrNull(details.tripEndDate) || startDate;
  const phone = details.customerPhone || details.mobile || '';

  if (!tripId || !startDate || !phone) {
    console.warn(
      `Booking not created for ${transaction.merchant_order_id}: missing trek, date or phone`
    );
    return null;
  }

  const withTransport = toCount(details.withTransportTickets);
  const withoutTransport = toCount(details.withoutTransportTickets);
  const people = Math.max(1, withTransport + withoutTransport);

  let travelMode = 'without_transport';
  if (withTransport > 0 && withoutTransport > 0) travelMode = 'mixed';
  else if (withTransport > 0) travelMode = 'with_transport';

  const amountPaid = toMoney(Number(transaction.amount || 0) / 100);
  const isAdvance = details.paymentType === 'advance';
  const tripTotal = toMoney(details.tripTotal) || amountPaid;
  const balance = isAdvance ? Math.max(0, toMoney(tripTotal - amountPaid)) : 0;

  const departureType = details.isCustomTrip ? 'custom' : 'scheduled';
  const departureId = await findOrCreateDeparture(
    tripId, startDate, endDate, departureType
  );

  const customerId = await findOrCreateCustomer({
    name: details.customerName,
    phone,
    email: details.customerEmail,
    tripId,
  });

  const pickupPointId = await findPickupPointId(tripId, details.pickupLocation);

  let result;
  try {
    result = await executeQuery(queries.createBooking, [
      // Temporary unique ref, replaced with TFGW-YYYY-NNNN below
      `TMP-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      departureId,
      customerId,
      tripId,
      pickupPointId,
      people,
      withTransport,
      withoutTransport,
      travelMode,
      startDate,
      endDate,
      toCount(details.tripDays) || null,
      details.isCustomTrip ? 1 : 0,
      tripTotal,
      amountPaid,
      isAdvance ? amountPaid : 0,
      balance,
      isAdvance ? 'advance' : 'full',
      balance > 0 ? 'partial' : 'paid',
      transaction.merchant_order_id,
      transaction.transaction_id || null,
      transaction.phonepe_order_id || null,
      transaction.payment_method || null,
    ]);
  } catch (error) {
    // Already booked by an earlier success notification
    if (error?.code === 'ER_DUP_ENTRY') return null;
    throw error;
  }

  await executeQuery(queries.setBookingRef, [result.insertId]);
  await executeQuery(queries.addSeatsBooked, [people, departureId]);

  return result.insertId;
}

module.exports = {
  recordBooking,
};
