// Guide portal ("Trek Lead"): a guide with a login (Guides screen) sees ONLY
// the trips they are a guide on in Trip Coordination, with those trips'
// customers and balances. Everything here is read-only. Every query is
// limited to the logged-in guide's own trips, so changing an id in the
// address bar or the API call cannot show another trip ("not found").
// Also: the guides of a trip (Trip Coordination) and a guide's login.
const bcrypt = require('bcryptjs');

const { executeQuery } = require('../../db/connection');
const dbops = require('../../db/dbops');
const sqlQueries = require('../../db/sqlqueries');
const { HttpError, badRequest, notFound, logActivity } = require('../../utils/http');
const { checkPassword } = require('../common/rules');
const { publicSiteUrl } = require('../../config');
// Collect balance: PhonePe, the same gateway as website bookings
const balancePayment = require('../../../server/src/components/payment/balancePayment');
const { ensureSchema } = require('./trekLeadSchema');

// Role of a guide's login account
const ROLE = 'trek_lead';
// Screens of the guide portal (ids of the admin app's pages)
const LEAD_PAGES = ['dashboard', 'my-trips', 'my-customers', 'balances', 'profile'];

const ACTIVE = "b.status IN ('confirmed','completed')";
// Trips of the logged-in guide: the trips their guide record is on
// (the parameter is their login id). A guide switched off loses access.
const MINE = `
  SELECT dg.departure_id FROM departure_guides dg
  JOIN guides g ON g.id = dg.guide_id
  WHERE g.admin_user_id = ? AND g.is_active = 1`;

const SQL = {
  isAssigned: `
    SELECT 1 FROM departure_guides dg JOIN guides g ON g.id = dg.guide_id
    WHERE dg.departure_id = ? AND g.admin_user_id = ? AND g.is_active = 1`,
  pickups: `
    SELECT b.departure_id, GROUP_CONCAT(DISTINCT p.name ORDER BY p.sort_order, p.name SEPARATOR ', ') AS pickups
    FROM bookings b JOIN pickup_points p ON p.id = b.pickup_point_id
    WHERE b.departure_id IN (?) AND ${ACTIVE}
    GROUP BY b.departure_id`,
  // One row per booking on the guide's trips (customer, trip, money)
  bookings: `
    SELECT b.id, b.booking_ref, b.departure_id, b.status, b.payment_status, b.people,
           b.with_transport_people, b.without_transport_people, b.travel_mode,
           b.amount, b.amount_paid, b.balance_amount, b.payment_type, b.booked_at,
           c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           p.name AS pickup_name, p.address AS pickup_address,
           d.trip_code, d.start_date, d.end_date, d.trip_status, t.name AS trip_name
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    JOIN departures d ON d.id = b.departure_id
    JOIN trips t ON t.id = d.trip_id
    LEFT JOIN pickup_points p ON p.id = b.pickup_point_id`,
  payments: `
    SELECT id, amount, method, reference, paid_at
    FROM booking_payments WHERE booking_id = ? ORDER BY paid_at, id`,
  // Trip Coordination: the guides of a trip
  existingGuides: 'SELECT id FROM guides WHERE id IN (?)',
  tripGuides: 'SELECT guide_id FROM departure_guides WHERE departure_id = ?',
  clearGuides: 'DELETE FROM departure_guides WHERE departure_id = ?',
  addGuides: 'INSERT INTO departure_guides (departure_id, guide_id, assigned_by) VALUES ?',
  mainGuide: 'UPDATE departures SET guide_id = ? WHERE id = ?',
  // Guides screen: a guide's login
  guide: 'SELECT id, name, email, is_active, admin_user_id FROM guides WHERE id = ?',
  linkLogin: 'UPDATE guides SET admin_user_id = ? WHERE id = ?',
  account: 'SELECT id, username, role FROM admin_users WHERE id = ?',
  updateAccount: 'UPDATE admin_users SET ? WHERE id = ?',
};

const isLead = (admin) => admin?.role === ROLE;

// Completed tab = marked completed / cancelled, or the return date has passed
const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST
const ymd = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10));
const isDone = (d) => ['completed', 'cancelled'].includes(d.trip_status);

/* ---------------- The guide's trips ---------------- */

async function myTrips(admin) {
  await ensureSchema();
  const sql = `${sqlQueries.departuresBase}
    WHERE d.id IN (${MINE})
    GROUP BY d.id
    ORDER BY d.start_date`;
  const trips = await executeQuery(sql, [admin.id]);
  if (!trips.length) return [];

  const pickups = await executeQuery(SQL.pickups, [trips.map((t) => t.id)]);
  const byTrip = new Map(pickups.map((p) => [p.departure_id, p.pickups]));
  return trips.map((t) => ({ ...t, pickups: byTrip.get(t.id) || '' }));
}

// The trip, only when this guide is on it (else "not found")
async function assertAssigned(admin, departureId) {
  await ensureSchema();
  const id = Number(departureId);
  if (!Number.isInteger(id) || id < 1) throw notFound('Trip not found');
  const rows = await executeQuery(SQL.isAssigned, [id, admin.id]);
  if (!rows.length) throw notFound('Trip not found');
  return id;
}

async function myTrip(admin, departureId) {
  const id = await assertAssigned(admin, departureId);
  const departure = await dbops.getDepartureById(id);
  if (!departure) throw notFound('Trip not found');

  const customers = await executeQuery(`${SQL.bookings} WHERE b.departure_id = ? AND b.status <> 'transferred' ORDER BY b.status = 'cancelled', p.sort_order, c.name`, [id]);
  const tickets = await dbops.getBookingTicketOptions(customers.map((c) => c.id));
  return { ...departure, customers: customers.map((c) => ({ ...c, tickets: tickets.get(c.id) || [] })) };
}

// Every booking on the guide's trips (Customers and Payment balances screens)
async function myCustomers(admin) {
  await ensureSchema();
  return executeQuery(`${SQL.bookings} WHERE b.departure_id IN (${MINE}) AND b.status <> 'transferred' ORDER BY d.start_date DESC, c.name`, [admin.id]);
}

// One booking with its payments, only on the guide's own trips
async function myBooking(admin, bookingId) {
  await ensureSchema();
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id < 1) throw notFound('Booking not found');
  const [booking] = await executeQuery(`${SQL.bookings} WHERE b.id = ? AND b.status <> 'transferred' AND b.departure_id IN (${MINE})`, [id, admin.id]);
  if (!booking) throw notFound('Booking not found');

  const [payments, tickets] = await Promise.all([
    executeQuery(SQL.payments, [id]),
    dbops.getBookingTicketOptions([id]),
  ]);
  return { ...booking, payments, tickets: tickets.get(id) || [] };
}

/* ---------------- Collect a balance through PhonePe ---------------- */

const assertMyBooking = async (admin, bookingId) => {
  const rows = await executeQuery(`SELECT b.id FROM bookings b WHERE b.id = ? AND b.status <> 'transferred' AND b.departure_id IN (${MINE})`, [bookingId, admin.id]);
  if (!rows.length) throw notFound('Booking not found');
};

const toAmount = (value) => Math.round(Number(value) * 100) / 100;

// Cash the guide received (all of the balance, or part: the rest online).
// The booking is only changed when the amount still fits the balance.
async function recordCash(admin, bookingId, body = {}) {
  await ensureSchema();
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id < 1) throw notFound('Booking not found');
  await assertMyBooking(admin, id);

  const amount = toAmount(body.amount);
  if (!(amount > 0)) throw badRequest('Enter the cash amount received');
  const [booking] = await executeQuery('SELECT booking_ref, status, balance_amount FROM bookings WHERE id = ?', [id]);
  if (booking.status === 'cancelled') throw badRequest('This booking is cancelled');
  if (amount > Number(booking.balance_amount) + 0.009) throw badRequest(`Only ₹${Number(booking.balance_amount)} is left to pay`);

  // MySQL sets the columns left to right: balance and status use the new amount_paid
  const updated = await executeQuery(`
    UPDATE bookings
       SET amount_paid = amount_paid + ?,
           balance_amount = GREATEST(0, amount - amount_paid),
           payment_status = CASE WHEN amount_paid <= 0 THEN 'unpaid'
                                 WHEN amount_paid + 0.009 >= amount THEN 'paid'
                                 ELSE 'partial' END
     WHERE id = ? AND status <> 'cancelled' AND balance_amount + 0.009 >= ?`, [amount, id, amount]);
  if (!updated.affectedRows) throw badRequest('The balance just changed. Close this and open it again.');

  const note = ['Cash collected by guide', String(body.note || '').trim().slice(0, 200)].filter(Boolean).join(' · ');
  await dbops.createBookingPayment({ bookingId: id, amount, method: 'cash', reference: null, note, receivedBy: admin.id, paidAt: null });
  await logActivity(admin, 'payment', 'booking', id, `₹${amount} cash (collected by guide)`);

  const [after] = await executeQuery('SELECT amount, amount_paid, balance_amount, payment_status FROM bookings WHERE id = ?', [id]);
  return { amount, booking: after };
}

// PhonePe payment page for the booking's balance, or part of it (amount):
// QR to scan, or a link the guide sends the customer on WhatsApp
async function collectBalance(admin, bookingId, body = {}) {
  await ensureSchema();
  const id = Number(bookingId);
  if (!Number.isInteger(id) || id < 1) throw notFound('Booking not found');
  await assertMyBooking(admin, id);
  try {
    const order = await balancePayment.create({
      bookingId: id,
      amount: body.amount,
      collectedBy: admin.id,
      returnUrl: `${publicSiteUrl}/balance-paid`,
    });
    const { booking } = order;
    const message = [
      `Hi ${booking.customer_name}, please pay ₹${order.amount.toLocaleString('en-IN')} towards your balance for ${booking.trip_name || 'your trek'} (booking ${booking.booking_ref}) here:`,
      order.checkoutUrl,
      '— The Fitness Gone Wild',
    ].join('\n');
    return { merchantOrderId: order.merchantOrderId, checkoutUrl: order.checkoutUrl, amount: order.amount, message };
  } catch (error) {
    if (error.status === 400 || error.status === 404) throw new HttpError(error.status, error.message);
    console.error('PhonePe balance payment:', error?.message || error, error?.data || '');
    const reason = error?.data?.message || error?.message || 'no answer';
    throw badRequest(`PhonePe could not create the payment (${String(reason).slice(0, 160)}). Please try again.`);
  }
}

// Has the customer paid? Verified with PhonePe; once paid the balance is
// added to the booking automatically
async function collectionStatus(admin, merchantOrderId) {
  await ensureSchema();
  const found = await balancePayment.orderDetails(String(merchantOrderId || ''));
  if (!found?.details.bookingId) throw notFound('Payment not found');
  await assertMyBooking(admin, Number(found.details.bookingId));
  const { status, amount, booking } = await balancePayment.check(found.transaction.merchant_order_id);
  return {
    status,
    amount,
    booking: booking && {
      id: booking.id,
      departure_id: booking.departure_id,
      amount: booking.amount,
      amount_paid: booking.amount_paid,
      balance_amount: booking.balance_amount,
      payment_status: booking.payment_status,
    },
  };
}

async function dashboard(admin) {
  const trips = await myTrips(admin);
  const now = today();

  const live = trips.filter((t) => t.trip_status !== 'cancelled');
  const completed = trips.filter((t) => isDone(t) || ymd(t.end_date) < now);
  const upcoming = live.filter((t) => !isDone(t) && ymd(t.end_date) >= now);
  const sum = (list, key) => list.reduce((s, t) => s + Number(t[key] || 0), 0);

  return {
    counts: {
      assigned: trips.length,
      upcoming: upcoming.length,
      completed: completed.length,
      customers: sum(live, 'people'),
      bookings: sum(live, 'bookings'),
      total: sum(live, 'total_amount'),
      collected: sum(live, 'paid_amount'),
      pending: sum(live, 'pending_amount'),
    },
    upcoming: upcoming.slice(0, 6),
  };
}

/* ---------------- Guides of a trip (Trip Coordination) ---------------- */

// "3,5" or [3, 5] -> [3, 5]; undefined = leave the guides as they are
function parseGuideIds(value) {
  if (value === undefined) return undefined;
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}

// Replaces the trip's guides. departures.guide_id is kept = the first
// guide (dashboard, reports and the Excel sheet show it).
async function setTripGuides(admin, departureId, wanted) {
  if (wanted === undefined) return;
  await ensureSchema();
  const known = wanted.length
    ? new Set((await executeQuery(SQL.existingGuides, [wanted])).map((r) => Number(r.id)))
    : new Set();
  const ids = wanted.filter((id) => known.has(id));

  await executeQuery(SQL.mainGuide, [ids[0] || null, departureId]);
  const current = (await executeQuery(SQL.tripGuides, [departureId])).map((r) => Number(r.guide_id));
  if (current.length === ids.length && ids.every((id) => current.includes(id))) return; // no change

  await executeQuery(SQL.clearGuides, [departureId]);
  if (ids.length) await executeQuery(SQL.addGuides, [ids.map((id) => [departureId, id, admin?.id || null])]);
  await logActivity(admin, 'assign_guides', 'departure', departureId, ids.length ? `Guides: ${ids.join(', ')}` : 'No guide');
}

/* ---------------- A guide's login (Add / Edit guide form) ---------------- */

const isOff = (value) => value === false || value === 0 || value === '0';

// The login part of the guide form, checked BEFORE the guide is saved so a
// wrong login never leaves a half-saved guide. guideId: null for a new guide.
async function checkGuideLogin(body = {}, guideId) {
  await ensureSchema();
  const username = String(body.login_username || '').trim();
  const password = String(body.login_password || '');
  const [guide] = guideId ? await executeQuery(SQL.guide, [guideId]) : [];
  const accountId = guide?.admin_user_id || 0;

  if (!username && !accountId) {
    if (password) throw badRequest('Enter a username for the login, or leave the password empty');
    return; // no login wanted
  }
  if (username && !/^[\w.@-]{3,60}$/.test(username)) {
    throw badRequest('Username: 3 to 60 letters, numbers, . _ - or @ (no spaces)');
  }
  if (!accountId && !password) throw badRequest('Enter a password for the login');
  if (password) checkPassword(password);

  const email = String(body.email ?? guide?.email ?? '').trim().toLowerCase();
  if (!email) throw badRequest('Enter the guide’s email: the login needs it');

  const taken = await executeQuery(
    'SELECT username, email FROM admin_users WHERE (username = ? OR email = ?) AND id <> ?',
    [username || '-', email, accountId]
  );
  if (taken.some((u) => username && u.username === username)) throw badRequest(`Username ${username} is already used`);
  if (taken.some((u) => String(u.email).toLowerCase() === email)) throw badRequest(`Email ${email} is already used by another login`);
}

// After the guide is saved: create or update their login from the form,
// then keep the login's name, email and on/off in step with the guide
async function saveGuideForm(admin, guideId, body = {}) {
  await saveGuideLogin(admin, guideId, {
    username: body.login_username,
    password: body.login_password,
    enabled: !isOff(body.login_active ?? true),
  });
  await syncGuideLogin(guideId);
}

// First time: creates the login (role trek_lead) with the guide's name and
// email. Later: changes the username, switches it on or off, or sets a new
// password (when given).
async function saveGuideLogin(admin, guideId, body = {}) {
  await ensureSchema();
  const [guide] = await executeQuery(SQL.guide, [guideId]);
  if (!guide) throw notFound('Guide not found');

  const enabled = !isOff(body.enabled);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (password) checkPassword(password);

  const [account] = guide.admin_user_id ? await executeQuery(SQL.account, [guide.admin_user_id]) : [];

  try {
    if (!account) {
      if (!enabled || !username) return { id: guide.id }; // no login wanted
      if (!guide.email) throw badRequest('Enter the guide’s email: the login needs it');
      if (!password) throw badRequest('Enter a password for the login');
      const userId = await dbops.createAdminUser({
        username,
        full_name: guide.name,
        email: String(guide.email).trim().toLowerCase(),
        role: ROLE,
        password_hash: await bcrypt.hash(password, 10),
        is_active: Number(guide.is_active) ? 1 : 0,
      });
      await executeQuery(SQL.linkLogin, [userId, guide.id]);
      await logActivity(admin, 'create_login', 'guide', guide.id, username);
      return { id: guide.id };
    }

    // A guide switched off (Edit → Active) cannot log in even if the login is on
    const changes = { is_active: enabled && Number(guide.is_active) ? 1 : 0 };
    if (username && username !== account.username) changes.username = username;
    if (password) changes.password_hash = await bcrypt.hash(password, 10);
    await executeQuery(SQL.updateAccount, [changes, account.id]);
    const detail = [enabled ? 'login on' : 'login off', changes.username, password && 'new password'].filter(Boolean).join(', ');
    await logActivity(admin, 'update_login', 'guide', guide.id, detail);
    return { id: guide.id };
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('This username or email is already used by another login');
    throw error;
  }
}

// After a guide is edited, their login follows the name, email and the
// Active switch (a guide switched off cannot log in)
async function syncGuideLogin(guideId) {
  await ensureSchema();
  const [guide] = await executeQuery(SQL.guide, [guideId]);
  if (!guide?.admin_user_id) return;
  const changes = { full_name: guide.name };
  if (guide.email) changes.email = String(guide.email).trim().toLowerCase();
  if (!Number(guide.is_active)) changes.is_active = 0;
  try {
    await executeQuery(SQL.updateAccount, [changes, guide.admin_user_id]);
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('This email is already used by another login');
    throw error;
  }
}

module.exports = {
  ROLE,
  LEAD_PAGES,
  isLead,
  ensureSchema,
  myTrips,
  myTrip,
  myCustomers,
  myBooking,
  collectBalance,
  recordCash,
  collectionStatus,
  dashboard,
  parseGuideIds,
  setTripGuides,
  checkGuideLogin,
  saveGuideForm,
};
