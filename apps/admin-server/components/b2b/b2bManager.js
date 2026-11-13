// B2B: customers exchanged with other trek vendors.
//
//   INBOUND   a vendor gives us customers. They join our trip as a normal
//             booking (seats, customer list, guide portal, Collect balance
//             all work) whose amount is what the customer pays US. The vendor
//             keeps what the customer paid them. Agreed B2B price per person:
//                 vendor owes us = price × people − what the customer pays us
//
//   OUTBOUND  we give customers to a vendor (all or SOME people of a booking).
//             Those people move to a booking marked "transferred" (kept with
//             its advance and history, not cancelled or deleted); their seats
//             are freed. The customer pays the rest directly to the vendor:
//                 we owe vendor = price × people − what the customer pays them
//
// One record per exchange (b2b_transfers): settlement = what the vendor owes
// us (negative: what we owe them); payments either way in b2b_settlements.
const { executeQuery } = require('../../db/connection');
const dbops = require('../../db/dbops');
const { badRequest, notFound, logActivity, isDate } = require('../../utils/http');
const { paymentStatusFor } = require('../common/rules');

const toAmount = (value) => Math.round((Number(value) || 0) * 100) / 100;
const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST
const METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'other'];

/* ---------------- Tables (created by the server once per start) ---------------- */

const TABLES = [
  `CREATE TABLE IF NOT EXISTS b2b_vendors (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    contact_person VARCHAR(120) NULL,
    phone VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    company VARCHAR(150) NULL,
    address VARCHAR(255) NULL,
    notes VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS b2b_transfers (
    id INT NOT NULL AUTO_INCREMENT,
    direction VARCHAR(10) NOT NULL,
    vendor_id INT NOT NULL,
    departure_id INT NOT NULL,
    booking_id INT NOT NULL,
    source_booking_id INT NULL,
    people SMALLINT NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0,
    b2b_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    customer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    settlement DECIMAL(10,2) NOT NULL DEFAULT 0,
    transfer_date DATE NOT NULL,
    reason VARCHAR(300) NULL,
    notes VARCHAR(500) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_b2b_departure (departure_id),
    KEY idx_b2b_vendor (vendor_id),
    KEY idx_b2b_booking (booking_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  `CREATE TABLE IF NOT EXISTS b2b_settlements (
    id INT NOT NULL AUTO_INCREMENT,
    transfer_id INT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_on DATE NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'upi',
    reference VARCHAR(120) NULL,
    note VARCHAR(300) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_b2b_settlement_transfer (transfer_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
];

// bookings.status is an ENUM: add 'transferred', keeping every value it has
async function addTransferredStatus() {
  const [column] = await executeQuery(`
    SELECT COLUMN_TYPE AS type, COLUMN_DEFAULT AS dflt FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'status'`);
  const type = String(column?.type || '');
  if (!/^enum\(/i.test(type) || type.includes("'transferred'")) return;
  const values = [...type.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  const list = [...values, 'transferred'].map((v) => `'${v}'`).join(',');
  const dflt = values.includes(column.dflt) ? column.dflt : values[0];
  await executeQuery(`ALTER TABLE bookings MODIFY status ENUM(${list}) NOT NULL DEFAULT '${dflt}'`);
}

// One settlement with a vendor (all their open records at once, net amount)
const BATCH_TABLE = `
  CREATE TABLE IF NOT EXISTS b2b_settlement_batches (
    id INT NOT NULL AUTO_INCREMENT,
    vendor_id INT NOT NULL,
    direction VARCHAR(10) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    records INT NOT NULL DEFAULT 0,
    paid_on DATE NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'upi',
    reference VARCHAR(120) NULL,
    note VARCHAR(300) NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_b2b_batch_vendor (vendor_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`;

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      await addTransferredStatus();
      for (const sql of TABLES) await executeQuery(sql);
      await executeQuery(BATCH_TABLE);
      const hasBatch = await executeQuery(`SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'b2b_settlements' AND COLUMN_NAME = 'batch_id'`);
      if (!hasBatch.length) await executeQuery('ALTER TABLE b2b_settlements ADD COLUMN batch_id INT NULL, ADD KEY idx_b2b_settlement_batch (batch_id)');
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

/* ---------------- Settlement state of a record ---------------- */

// settlement: + vendor owes us, − we owe the vendor. done: received − paid.
function withState(row) {
  const due = toAmount(row.settlement);
  const done = toAmount(Number(row.received || 0) - Number(row.paid || 0));
  const remaining = toAmount(due - done);
  const status = Math.abs(remaining) < 0.01 ? 'settled' : Math.abs(done) >= 0.01 ? 'partial' : 'pending';
  return { ...row, settlement: due, settled: done, remaining, settlement_status: status };
}

const RECORDS = `
  SELECT x.*, v.name AS vendor_name, v.phone AS vendor_phone,
         b.booking_ref, b.status AS booking_status, b.people AS booking_people,
         b.amount AS booking_amount, b.amount_paid AS booking_paid, b.balance_amount AS booking_balance,
         sb.booking_ref AS source_booking_ref,
         c.name AS customer_name, c.phone AS customer_phone,
         d.trip_code, d.start_date, t.name AS trip_name,
         u.full_name AS created_by_name,
         COALESCE((SELECT SUM(s.amount) FROM b2b_settlements s WHERE s.transfer_id = x.id AND s.direction = 'received'), 0) AS received,
         COALESCE((SELECT SUM(s.amount) FROM b2b_settlements s WHERE s.transfer_id = x.id AND s.direction = 'paid'), 0) AS paid
  FROM b2b_transfers x
  JOIN b2b_vendors v ON v.id = x.vendor_id
  JOIN bookings b ON b.id = x.booking_id
  JOIN customers c ON c.id = b.customer_id
  JOIN departures d ON d.id = x.departure_id
  JOIN trips t ON t.id = d.trip_id
  LEFT JOIN bookings sb ON sb.id = x.source_booking_id
  LEFT JOIN admin_users u ON u.id = x.created_by`;

/* ---------------- Vendors ---------------- */

const VENDOR_FIELDS = ['name', 'contact_person', 'phone', 'email', 'company', 'address', 'notes'];

function cleanVendor(body = {}) {
  const data = {};
  for (const key of VENDOR_FIELDS) {
    if (body[key] === undefined) continue;
    const max = { name: 120, contact_person: 120, phone: 20, email: 150, company: 150, address: 255, notes: 500 }[key];
    data[key] = String(body[key] ?? '').trim().slice(0, max) || null;
  }
  if (body.is_active !== undefined) data.is_active = body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1;
  if ('name' in data && !data.name) throw badRequest("Enter the vendor's name");
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) throw badRequest('Enter a valid email');
  return data;
}

// Every vendor with the ledger across all trips
async function getVendors() {
  await ensureSchema();
  const vendors = await executeQuery('SELECT * FROM b2b_vendors ORDER BY is_active DESC, name');
  const records = (await executeQuery(RECORDS)).map(withState);
  return vendors.map((v) => {
    const mine = records.filter((r) => r.vendor_id === v.id);
    const sum = (list, f) => toAmount(list.reduce((s, r) => s + f(r), 0));
    return {
      ...v,
      received_people: sum(mine.filter((r) => r.direction === 'inbound'), (r) => Number(r.people)),
      sent_people: sum(mine.filter((r) => r.direction === 'outbound'), (r) => Number(r.people)),
      // Still to settle with this vendor: + they owe us, − we owe them
      they_owe: sum(mine, (r) => Math.max(0, r.remaining)),
      we_owe: sum(mine, (r) => Math.max(0, -r.remaining)),
      settled: sum(mine, (r) => Math.abs(r.settled)),
      records: mine.length,
    };
  });
}

async function createVendor(admin, body) {
  await ensureSchema();
  const data = cleanVendor(body);
  if (!data.name) throw badRequest("Enter the vendor's name");
  const result = await executeQuery('INSERT INTO b2b_vendors SET ?', [data]);
  await logActivity(admin, 'create', 'b2b_vendor', result.insertId, data.name);
  return { id: result.insertId };
}

async function updateVendor(admin, id, body) {
  await ensureSchema();
  const data = cleanVendor(body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');
  const result = await executeQuery('UPDATE b2b_vendors SET ? WHERE id = ?', [data, Number(id)]);
  if (!result.affectedRows) throw notFound('Vendor not found');
  await logActivity(admin, 'update', 'b2b_vendor', Number(id), Object.keys(data).join(', '));
  return { id: Number(id) };
}

async function activeVendor(id) {
  const [vendor] = await executeQuery('SELECT id, name, is_active FROM b2b_vendors WHERE id = ?', [Number(id) || 0]);
  if (!vendor) throw badRequest('Choose the vendor');
  if (!Number(vendor.is_active)) throw badRequest(`${vendor.name} is inactive`);
  return vendor;
}

/* ---------------- One trip's B2B (Trip Coordination) ---------------- */

async function tripB2B(departureId) {
  await ensureSchema();
  const rows = (await executeQuery(`${RECORDS} WHERE x.departure_id = ? ORDER BY x.transfer_date DESC, x.id DESC`, [Number(departureId)]))
    .map(withState);
  const inbound = rows.filter((r) => r.direction === 'inbound');
  const outbound = rows.filter((r) => r.direction === 'outbound');
  const sum = (list, f) => toAmount(list.reduce((s, r) => s + f(r), 0));
  return {
    inbound,
    outbound,
    totals: {
      inboundPeople: sum(inbound, (r) => Number(r.people)),
      outboundPeople: sum(outbound, (r) => Number(r.people)),
      theyOwe: sum(rows, (r) => Math.max(0, r.remaining)),
      weOwe: sum(rows, (r) => Math.max(0, -r.remaining)),
    },
  };
}

// Used in the trip's money overview (expenseManager)
async function tripMoney(departureId) {
  try {
    await ensureSchema();
    const rows = (await executeQuery(`${RECORDS} WHERE x.departure_id = ?`, [Number(departureId)])).map(withState);
    const sum = (list, f) => toAmount(list.reduce((s, r) => s + f(r), 0));
    const inbound = rows.filter((r) => r.direction === 'inbound');
    const outbound = rows.filter((r) => r.direction === 'outbound');
    return {
      // What the B2B exchanges earn the trip: inbound = what the vendors owe
      // us; outbound = the advance we kept + the settlement (negative = we pay)
      net: toAmount(sum(inbound, (r) => r.settlement) + sum(outbound, (r) => Number(r.advance_amount) + r.settlement)),
      // Money already in hand from them: outbound advances + settlements done
      inHand: toAmount(sum(outbound, (r) => Number(r.advance_amount)) + sum(rows, (r) => r.settled)),
      toSettle: sum(rows, (r) => r.remaining),
      inboundPeople: sum(inbound, (r) => Number(r.people)),
      outboundPeople: sum(outbound, (r) => Number(r.people)),
    };
  } catch (error) {
    console.error('B2B trip money:', error?.message || error);
    return null;
  }
}

/* ---------------- Inbound: a vendor's customers join our trip ---------------- */

async function addInbound(admin, departureId, body = {}) {
  await ensureSchema();
  const departure = await dbops.getDepartureForBooking(Number(departureId));
  if (!departure) throw notFound('Trip not found');
  const vendor = await activeVendor(body.vendor_id);

  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/[^\d+]/g, '');
  if (!name) throw badRequest("Enter the customer's name");
  if (phone.replace(/\D/g, '').length < 10) throw badRequest('Enter a valid mobile number');
  const people = Number(body.people);
  if (!Number.isInteger(people) || people < 1 || people > 99) throw badRequest('People: a whole number from 1');
  const price = toAmount(body.price_per_person);
  if (price < 0) throw badRequest('B2B price cannot be negative');
  const customerPays = toAmount(body.customer_amount);
  if (customerPays < 0) throw badRequest('The amount the customer pays us cannot be negative');
  const date = String(body.transfer_date || '').slice(0, 10) || today();
  if (!isDate(date)) throw badRequest('Date must be YYYY-MM-DD');
  const withTransport = body.with_transport === false || body.with_transport === '0' ? 0 : 1;

  const customerId = (await dbops.getCustomerIdByPhone(phone))
    || (await dbops.createCustomer({ name, phone, email: String(body.email || '').trim() || null, tripId: departure.trip_id }));

  // The booking: what the customer pays US (collected like any balance)
  const bookingId = await dbops.createBooking({
    booking_ref: `TMP-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    departure_id: departure.id,
    customer_id: customerId,
    trip_id: departure.trip_id,
    pickup_point_id: Number(body.pickup_point_id) || null,
    people,
    with_transport_people: withTransport ? people : 0,
    without_transport_people: withTransport ? 0 : people,
    travel_mode: withTransport ? 'with_transport' : 'without_transport',
    trek_start_date: departure.start_date,
    trek_end_date: departure.end_date,
    trip_days: departure.days,
    is_custom_trip: departure.departure_type === 'custom' ? 1 : 0,
    amount: customerPays,
    amount_paid: 0,
    advance_amount: 0,
    balance_amount: customerPays,
    payment_type: 'full',
    status: 'confirmed',
    payment_status: customerPays > 0 ? 'unpaid' : 'paid',
    notes: `B2B from ${vendor.name}${body.notes ? ` · ${String(body.notes).slice(0, 300)}` : ''}`.slice(0, 500),
    sold_by: admin?.id || null,
  });
  await dbops.setBookingRef(bookingId);
  await dbops.changeDepartureSeats(departure.id, people);

  const b2bTotal = toAmount(price * people);
  const result = await executeQuery('INSERT INTO b2b_transfers SET ?', [{
    direction: 'inbound',
    vendor_id: vendor.id,
    departure_id: departure.id,
    booking_id: bookingId,
    people,
    price_per_person: price,
    b2b_total: b2bTotal,
    customer_amount: customerPays,
    advance_amount: 0,
    settlement: toAmount(b2bTotal - customerPays), // + the vendor pays us
    transfer_date: date,
    notes: String(body.notes || '').trim().slice(0, 500) || null,
    created_by: admin?.id || null,
  }]);
  await logActivity(admin, 'b2b_inbound', 'booking', bookingId, `${people} from ${vendor.name} · B2B ₹${b2bTotal} · customer pays us ₹${customerPays}`);
  return { id: result.insertId, booking_id: bookingId };
}

/* ---------------- Outbound: some or all people of a booking go to a vendor ---------------- */

// Moves `count` people out of the booking's price-option lines (first lines first)
function splitTickets(lines, count) {
  const keep = [];
  const move = [];
  let left = count;
  for (const line of lines) {
    const n = Number(line.people) || 0;
    const take = Math.min(n, left);
    left -= take;
    if (take) move.push({ ...line, people: take });
    if (n - take) keep.push({ ...line, people: n - take });
  }
  return { keep, move };
}

async function transferOut(admin, bookingId, body = {}) {
  await ensureSchema();
  const booking = await dbops.getBookingRow(Number(bookingId));
  if (!booking) throw notFound('Booking not found');
  if (!['confirmed', 'completed', 'pending'].includes(booking.status)) throw badRequest(`A ${booking.status} booking cannot be transferred`);
  const vendor = await activeVendor(body.vendor_id);

  const total = Number(booking.people) || 0;
  const count = Number(body.people);
  if (!Number.isInteger(count) || count < 1 || count > total) throw badRequest(`People to transfer: 1 to ${total}`);
  const whole = count === total;

  // Money of the people who move (suggested pro rata; the office can change it)
  const share = count / total;
  const movedAmount = body.moved_amount !== undefined && body.moved_amount !== '' ? toAmount(body.moved_amount) : toAmount(Number(booking.amount) * share);
  const movedAdvance = body.moved_advance !== undefined && body.moved_advance !== '' ? toAmount(body.moved_advance) : toAmount(Number(booking.amount_paid) * share);
  if (movedAmount < 0 || movedAdvance < 0) throw badRequest('Amounts cannot be negative');
  if (movedAmount > Number(booking.amount) + 0.009) throw badRequest(`The moved amount is more than the booking (₹${Number(booking.amount)})`);
  if (movedAdvance > Number(booking.amount_paid) + 0.009) throw badRequest(`The moved advance is more than what was paid (₹${Number(booking.amount_paid)})`);
  if (movedAdvance > movedAmount + 0.009) throw badRequest('The moved advance cannot be more than the moved amount');
  if (whole && (Math.abs(movedAmount - Number(booking.amount)) > 0.009 || Math.abs(movedAdvance - Number(booking.amount_paid)) > 0.009)) {
    throw badRequest('Moving everyone: the whole booking amount and advance move');
  }

  const price = toAmount(body.price_per_person);
  if (price < 0) throw badRequest('B2B price cannot be negative');
  const customerPaysVendor = body.customer_amount !== undefined && body.customer_amount !== ''
    ? toAmount(body.customer_amount) : toAmount(movedAmount - movedAdvance);
  if (customerPaysVendor < 0) throw badRequest('What the customer pays the vendor cannot be negative');
  const date = String(body.transfer_date || '').slice(0, 10) || today();
  if (!isDate(date)) throw badRequest('Date must be YYYY-MM-DD');
  const reason = String(body.reason || '').trim().slice(0, 300) || null;

  let movedId = booking.id;
  const note = `Transferred to ${vendor.name}${reason ? ` · ${reason}` : ''}`;
  if (whole) {
    await executeQuery("UPDATE bookings SET status = 'transferred', notes = ? WHERE id = ?", [
      [booking.notes, note].filter(Boolean).join(' · ').slice(0, 500), booking.id]);
  } else {
    // Which people move: from the price-option lines, else with transport first
    const lines = (await dbops.getBookingTicketOptions([booking.id])).get(booking.id) || [];
    const { keep, move } = splitTickets(lines, count);
    let movedWith;
    if (lines.length) movedWith = move.filter((l) => Number(l.with_transport)).reduce((s, l) => s + Number(l.people), 0);
    else movedWith = Math.min(count, Number(booking.with_transport_people) || 0);
    const movedWithout = count - movedWith;
    const keptWith = (Number(booking.with_transport_people) || 0) - movedWith;
    const keptWithout = (Number(booking.without_transport_people) || 0) - movedWithout;
    const mode = (w, wo) => (w && wo ? 'mixed' : w ? 'with_transport' : 'without_transport');

    // The moved part: its own booking, marked transferred
    const keptAmount = toAmount(Number(booking.amount) - movedAmount);
    const keptPaid = toAmount(Number(booking.amount_paid) - movedAdvance);
    // Unique / per-booking columns are not copied (invoice link, PhonePe order, ref)
    const { id: _id, booking_ref: _ref, invoice_token: _i, merchant_order_id: _m, phonepe_order_id: _p, payment_transaction_id: _t, booked_at: _b, updated_at: _u, refunded_at: _r, ...copy } = booking;
    movedId = await dbops.createBooking({
      ...copy,
      booking_ref: `TMP-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      people: count,
      with_transport_people: movedWith,
      without_transport_people: movedWithout,
      travel_mode: mode(movedWith, movedWithout),
      amount: movedAmount,
      amount_paid: movedAdvance,
      advance_amount: movedAdvance,
      balance_amount: toAmount(movedAmount - movedAdvance),
      refund_amount: 0,
      payment_status: paymentStatusFor(movedAmount, movedAdvance),
      status: 'transferred',
      notes: `${note} · ${count} of ${total} people from ${booking.booking_ref}`.slice(0, 500),
    });
    await dbops.setBookingRef(movedId);
    if (move.length) await dbops.addBookingTicketOptions(movedId, move);

    // The people who stay keep the original booking
    await executeQuery(`UPDATE bookings SET people = ?, with_transport_people = ?, without_transport_people = ?, travel_mode = ?,
                          amount = ?, amount_paid = ?, advance_amount = LEAST(advance_amount, ?), balance_amount = ?, payment_status = ?, notes = ?
                        WHERE id = ?`, [
      total - count, keptWith, keptWithout, mode(keptWith, keptWithout),
      keptAmount, keptPaid, keptPaid, toAmount(keptAmount - keptPaid), paymentStatusFor(keptAmount, keptPaid),
      [booking.notes, `${count} people transferred to ${vendor.name}`].filter(Boolean).join(' · ').slice(0, 500),
      booking.id,
    ]);
    if (lines.length) {
      await executeQuery('DELETE FROM booking_ticket_options WHERE booking_id = ?', [booking.id]);
      if (keep.length) await dbops.addBookingTicketOptions(booking.id, keep);
    }
  }
  // Seats of the people who left are free again
  if (['confirmed', 'completed'].includes(booking.status)) await dbops.changeDepartureSeats(booking.departure_id, -count);

  const b2bTotal = toAmount(price * count);
  const result = await executeQuery('INSERT INTO b2b_transfers SET ?', [{
    direction: 'outbound',
    vendor_id: vendor.id,
    departure_id: booking.departure_id,
    booking_id: movedId,
    source_booking_id: whole ? null : booking.id,
    people: count,
    price_per_person: price,
    b2b_total: b2bTotal,
    customer_amount: customerPaysVendor,
    advance_amount: movedAdvance,
    settlement: toAmount(customerPaysVendor - b2bTotal), // − we pay the vendor
    transfer_date: date,
    reason,
    created_by: admin?.id || null,
  }]);
  await logActivity(admin, 'b2b_outbound', 'booking', booking.id,
    `${count} of ${total} people to ${vendor.name} · B2B ₹${b2bTotal} · customer pays vendor ₹${customerPaysVendor}`);
  return { id: result.insertId, booking_id: movedId };
}

/* ---------------- Settlement payments with a vendor ---------------- */

async function addSettlement(admin, transferId, body = {}) {
  await ensureSchema();
  const [record] = (await executeQuery(`${RECORDS} WHERE x.id = ?`, [Number(transferId) || 0])).map(withState);
  if (!record) throw notFound('B2B record not found');
  const direction = body.direction === 'paid' ? 'paid' : 'received';
  const amount = toAmount(body.amount);
  if (!(amount > 0)) throw badRequest('Enter the amount');
  const date = String(body.paid_on || '').slice(0, 10) || today();
  if (!isDate(date)) throw badRequest('Date must be YYYY-MM-DD');
  const method = METHODS.includes(body.method) ? body.method : 'upi';
  await executeQuery('INSERT INTO b2b_settlements SET ?', [{
    transfer_id: record.id,
    direction,
    amount,
    paid_on: date,
    method,
    reference: String(body.reference || '').trim().slice(0, 120) || null,
    note: String(body.note || '').trim().slice(0, 300) || null,
    created_by: admin?.id || null,
  }]);
  await logActivity(admin, 'b2b_settlement', 'b2b_transfer', record.id, `₹${amount} ${direction === 'paid' ? 'paid to' : 'received from'} ${record.vendor_name}`);
  return tripB2B(record.departure_id);
}

async function getSettlements(transferId) {
  await ensureSchema();
  return executeQuery(`SELECT s.*, u.full_name AS created_by_name FROM b2b_settlements s
    LEFT JOIN admin_users u ON u.id = s.created_by WHERE s.transfer_id = ? ORDER BY s.paid_on, s.id`, [Number(transferId) || 0]);
}

/* ---------------- A vendor's statement and settling everything at once ---------------- */

// Everything with one vendor: open records, settled ones, past settlements
async function vendorStatement(vendorId) {
  await ensureSchema();
  const [vendor] = await executeQuery('SELECT * FROM b2b_vendors WHERE id = ?', [Number(vendorId) || 0]);
  if (!vendor) throw notFound('Vendor not found');
  const records = (await executeQuery(`${RECORDS} WHERE x.vendor_id = ? ORDER BY x.transfer_date, x.id`, [vendor.id])).map(withState);
  const batches = await executeQuery(`SELECT bt.*, u.full_name AS created_by_name FROM b2b_settlement_batches bt
    LEFT JOIN admin_users u ON u.id = bt.created_by WHERE bt.vendor_id = ? ORDER BY bt.paid_on DESC, bt.id DESC`, [vendor.id]);
  const open = records.filter((r) => r.settlement_status !== 'settled');
  const sum = (list, f) => toAmount(list.reduce((s, r) => s + f(r), 0));
  return {
    vendor,
    open,
    settled: records.filter((r) => r.settlement_status === 'settled'),
    batches,
    totals: {
      // Open: + they owe us, − we owe them
      toReceive: sum(open, (r) => Math.max(0, r.remaining)),
      toPay: sum(open, (r) => Math.max(0, -r.remaining)),
      net: sum(open, (r) => r.remaining),
      receivedPeople: sum(open.filter((r) => r.direction === 'inbound'), (r) => Number(r.people)),
      sentPeople: sum(open.filter((r) => r.direction === 'outbound'), (r) => Number(r.people)),
      allReceivedPeople: sum(records.filter((r) => r.direction === 'inbound'), (r) => Number(r.people)),
      allSentPeople: sum(records.filter((r) => r.direction === 'outbound'), (r) => Number(r.people)),
    },
  };
}

// Settles EVERY open record with the vendor in one go: one payment of the
// net amount (they pay us, or we pay them), recorded against each record
async function settleVendor(admin, vendorId, body = {}) {
  const statement = await vendorStatement(vendorId);
  const { vendor, open, totals } = statement;
  if (!open.length) throw badRequest(`Nothing to settle with ${vendor.name}`);
  const net = totals.net;
  if (body.expected_net !== undefined && Math.abs(toAmount(body.expected_net) - net) > 0.009) {
    throw badRequest('The amounts changed meanwhile. Close this and open it again.');
  }
  const date = String(body.paid_on || '').slice(0, 10) || today();
  if (!isDate(date)) throw badRequest('Date must be YYYY-MM-DD');
  const method = METHODS.includes(body.method) ? body.method : 'upi';
  const direction = net > 0.009 ? 'received' : net < -0.009 ? 'paid' : 'even';

  const batch = await executeQuery('INSERT INTO b2b_settlement_batches SET ?', [{
    vendor_id: vendor.id,
    direction,
    net_amount: Math.abs(net),
    records: open.length,
    paid_on: date,
    method,
    reference: String(body.reference || '').trim().slice(0, 120) || null,
    note: String(body.note || '').trim().slice(0, 300) || null,
    created_by: admin?.id || null,
  }]);
  const rows = open
    .filter((r) => Math.abs(r.remaining) >= 0.01)
    .map((r) => [r.id, r.remaining > 0 ? 'received' : 'paid', Math.abs(r.remaining), date, method, `Settlement #${batch.insertId}`, admin?.id || null, batch.insertId]);
  if (rows.length) {
    await executeQuery('INSERT INTO b2b_settlements (transfer_id, direction, amount, paid_on, method, note, created_by, batch_id) VALUES ?', [rows]);
  }
  await logActivity(admin, 'b2b_settle', 'b2b_vendor', vendor.id,
    `${open.length} records · ${direction === 'received' ? `received ₹${Math.abs(net)}` : direction === 'paid' ? `paid ₹${Math.abs(net)}` : 'even'}`);
  return vendorStatement(vendor.id);
}

/* ---------------- Every B2B record (B2B Vendors screen) ---------------- */

async function allRecords() {
  await ensureSchema();
  return (await executeQuery(`${RECORDS} ORDER BY x.transfer_date DESC, x.id DESC LIMIT 5000`)).map(withState);
}

module.exports = {
  ensureSchema,
  getVendors,
  createVendor,
  updateVendor,
  tripB2B,
  tripMoney,
  addInbound,
  transferOut,
  addSettlement,
  getSettlements,
  allRecords,
  vendorStatement,
  settleVendor,
};
