// Trip expenses: what was spent on a trip (fuel, food, permits…), with an
// optional bill photo. Guides add them in the Trek Lead portal (the office
// approves or rejects them); the office adds its own in Trip Coordination
// (approved at once) and sees the trip's profit or loss there.
// A guide can change or delete an expense only while it is not reviewed,
// and only on their own trips.
const { executeQuery } = require('../../db/connection');
const { badRequest, notFound, logActivity, isDate } = require('../../utils/http');
const { ensureSchema } = require('./trekLeadSchema');
// B2B exchanges with other vendors count in the trip's money
const b2b = require('../b2b/b2bManager');

const CATEGORIES = [
  'Transport / fuel', 'Food', 'Stay', 'Permits / entry fees', 'Local guide / porter',
  'Tolls / parking', 'Equipment', 'Medical / first aid', 'Other',
];
const PAID_BY = ['cash', 'upi', 'card', 'other'];
const STATUSES = ['submitted', 'approved', 'rejected'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;

// Trips of the logged-in guide (same rule as the portal)
const MINE = `
  SELECT dg.departure_id FROM departure_guides dg
  JOIN guides g ON g.id = dg.guide_id
  WHERE g.admin_user_id = ? AND g.is_active = 1`;

const LIST = `
  SELECT e.id, e.departure_id, e.category, e.description, e.amount, e.paid_by, e.spent_on,
         e.receipt IS NOT NULL AS has_receipt, UNIX_TIMESTAMP(e.updated_at) AS version,
         e.status, e.review_note, e.reviewed_at, e.created_by, e.created_at,
         u.full_name AS created_by_name, r.full_name AS reviewed_by_name
  FROM trip_expenses e
  LEFT JOIN admin_users u ON u.id = e.created_by
  LEFT JOIN admin_users r ON r.id = e.reviewed_by`;

const toAmount = (value) => Math.round(Number(value) * 100) / 100;
const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10); // IST

// "data:image/webp;base64,…" -> { mime, buffer }
function readReceipt(dataUrl) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match || !IMAGE_TYPES.includes(match[1])) throw badRequest('The bill photo could not be read. Please choose it again.');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_RECEIPT_BYTES) throw badRequest('The bill photo is too large');
  return { mime: match[1], buffer };
}

// A name from the list, or the person's own ("Bonfire wood", "Boat ride"…);
// an own name typed like a listed one ("food") is saved as the listed one
function cleanCategory(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  if (!name) throw badRequest('Choose or write what the money was for');
  const listed = CATEGORIES.find((c) => c.toLowerCase() === name.toLowerCase());
  if (listed) return listed;
  if (name.length < 2) throw badRequest('Write a longer expense name');
  if (name.length > 40) throw badRequest('Expense name: 40 characters at most');
  if (/[<>]/.test(name)) throw badRequest('Expense name: letters, numbers and simple punctuation only');
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function cleanExpense(body = {}) {
  const category = cleanCategory(body.category);
  const amount = toAmount(body.amount);
  if (!(amount > 0) || amount > 500000) throw badRequest('Enter the amount spent');
  const paidBy = PAID_BY.includes(body.paid_by) ? body.paid_by : 'cash';
  const spentOn = String(body.spent_on || '').slice(0, 10) || today();
  if (!isDate(spentOn)) throw badRequest('Date must be YYYY-MM-DD');
  if (spentOn > today()) throw badRequest('The date cannot be in the future');
  const description = String(body.description || '').trim().slice(0, 300) || null;
  if (category === 'Other' && !description) throw badRequest('Say what the money was for');
  return { category, amount, paid_by: paidBy, spent_on: spentOn, description };
}

const summary = (rows) => {
  const sum = (list) => toAmount(list.reduce((s, e) => s + Number(e.amount), 0));
  return {
    total: sum(rows.filter((e) => e.status !== 'rejected')),
    approved: sum(rows.filter((e) => e.status === 'approved')),
    waiting: sum(rows.filter((e) => e.status === 'submitted')),
    rejected: sum(rows.filter((e) => e.status === 'rejected')),
    count: rows.length,
  };
};

// Own names used before (on any trip) are offered in the list too,
// most used first, after the standard ones; "Other" stays last
const USED_NAMES = `
  SELECT category, COUNT(*) AS uses FROM trip_expenses
  WHERE category NOT IN (?)
  GROUP BY category ORDER BY uses DESC, category LIMIT 25`;

const listFor = async (departureId) => {
  const [items, used] = await Promise.all([
    executeQuery(`${LIST} WHERE e.departure_id = ? ORDER BY e.spent_on DESC, e.id DESC`, [departureId]),
    executeQuery(USED_NAMES, [CATEGORIES]),
  ]);
  const standard = CATEGORIES.filter((c) => c !== 'Other');
  const categories = [...standard, ...used.map((u) => u.category), 'Other'];
  return { items, summary: summary(items), categories, paidBy: PAID_BY };
};

/* ---------------- Guide (Trek Lead portal) ---------------- */

async function assertMyTrip(admin, departureId) {
  await ensureSchema();
  const id = Number(departureId);
  if (!Number.isInteger(id) || id < 1) throw notFound('Trip not found');
  const rows = await executeQuery(`SELECT 1 FROM departures WHERE id = ? AND id IN (${MINE})`, [id, admin.id]);
  if (!rows.length) throw notFound('Trip not found');
  return id;
}

// The expense, only on the guide's own trips
async function myExpense(admin, expenseId) {
  await ensureSchema();
  const [expense] = await executeQuery(`${LIST} WHERE e.id = ? AND e.departure_id IN (${MINE})`, [Number(expenseId) || 0, admin.id]);
  if (!expense) throw notFound('Expense not found');
  return expense;
}

const tripExpenses = async (admin, departureId) => listFor(await assertMyTrip(admin, departureId));

// New expense. The office's own are approved at once (they are the reviewers).
async function insertExpense(admin, departureId, body, { approved = false } = {}) {
  const data = cleanExpense(body);
  const receipt = body.receipt ? readReceipt(body.receipt) : null;
  const result = await executeQuery(
    `INSERT INTO trip_expenses (departure_id, category, description, amount, paid_by, spent_on, receipt_mime, receipt,
                                created_by, status, reviewed_by, reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(?, NOW(), NULL))`,
    [departureId, data.category, data.description, data.amount, data.paid_by, data.spent_on,
      receipt?.mime || null, receipt?.buffer || null, admin?.id || null,
      approved ? 'approved' : 'submitted', approved ? admin?.id || null : null, approved]
  );
  await logActivity(admin, 'create', 'trip_expense', result.insertId, `₹${data.amount} ${data.category} (trip ${departureId})`);
}

async function changeExpense(admin, expense, body, onlyIfWaiting) {
  const data = cleanExpense(body);
  const sets = ['category = ?', 'description = ?', 'amount = ?', 'paid_by = ?', 'spent_on = ?'];
  const params = [data.category, data.description, data.amount, data.paid_by, data.spent_on];
  if (body.receipt) {
    const receipt = readReceipt(body.receipt);
    sets.push('receipt_mime = ?', 'receipt = ?');
    params.push(receipt.mime, receipt.buffer);
  } else if (body.removeReceipt) {
    sets.push('receipt_mime = NULL', 'receipt = NULL');
  }
  const waitingOnly = onlyIfWaiting ? " AND status = 'submitted'" : '';
  await executeQuery(`UPDATE trip_expenses SET ${sets.join(', ')} WHERE id = ?${waitingOnly}`, [...params, expense.id]);
  await logActivity(admin, 'update', 'trip_expense', expense.id, `₹${data.amount} ${data.category}`);
}

async function addExpense(admin, departureId, body = {}) {
  const id = await assertMyTrip(admin, departureId);
  await insertExpense(admin, id, body);
  return listFor(id);
}

// The guide can change it until the office has reviewed it
async function updateExpense(admin, expenseId, body = {}) {
  const expense = await myExpense(admin, expenseId);
  if (expense.status !== 'submitted') throw badRequest(`This expense is already ${expense.status} by the office`);
  await changeExpense(admin, expense, body, true);
  return listFor(expense.departure_id);
}

async function deleteExpense(admin, expenseId) {
  const expense = await myExpense(admin, expenseId);
  if (expense.status !== 'submitted') throw badRequest(`This expense is already ${expense.status} by the office`);
  await executeQuery("DELETE FROM trip_expenses WHERE id = ? AND status = 'submitted'", [expense.id]);
  await logActivity(admin, 'delete', 'trip_expense', expense.id, `₹${expense.amount} ${expense.category}`);
  return listFor(expense.departure_id);
}

/* ---------------- Office (Trip Coordination) ---------------- */

// Money from the trip's bookings: confirmed / completed ones (minus any
// refunds on them), plus what was kept from cancelled ones (paid minus
// refunds, also refunds still in process)
const PENDING_REFUNDS = "(SELECT COALESCE(SUM(r.amount), 0) FROM booking_refunds r WHERE r.booking_id = b.id AND r.state = 'pending')";
const finance = (withRefunds) => `
  SELECT COUNT(CASE WHEN b.status IN ('confirmed','completed') THEN 1 END) AS bookings,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.people END), 0) AS people,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.amount - b.refund_amount END), 0) AS booked,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.amount_paid - b.refund_amount END), 0) AS collected,
         COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.balance_amount END), 0) AS pending,
         COALESCE(SUM(CASE WHEN b.status = 'cancelled'
           THEN GREATEST(0, b.amount_paid - b.refund_amount${withRefunds ? ` - ${PENDING_REFUNDS}` : ''}) END), 0) AS kept
  FROM bookings b WHERE b.departure_id = ?`;

async function tripFinance(departureId, expenses) {
  const [row] = await executeQuery(finance(true), [departureId]).catch((error) => {
    if (error?.code !== 'ER_NO_SUCH_TABLE') throw error; // booking_refunds not there yet
    return executeQuery(finance(false), [departureId]);
  });
  const n = (key) => toAmount(row?.[key]);
  const vendors = await b2b.tripMoney(departureId);
  const b2bNet = vendors ? vendors.net : 0;
  const b2bInHand = vendors ? vendors.inHand : 0;
  const income = toAmount(n('booked') + n('kept') + b2bNet);
  const spent = expenses.total; // approved + waiting (rejected left out)
  return {
    b2bNet,
    b2bToSettle: vendors ? vendors.toSettle : 0,
    b2bInboundPeople: vendors ? vendors.inboundPeople : 0,
    b2bOutboundPeople: vendors ? vendors.outboundPeople : 0,
    bookings: Number(row?.bookings || 0),
    people: Number(row?.people || 0),
    booked: n('booked'),
    kept: n('kept'),
    income,
    collected: toAmount(n('collected') + n('kept') + b2bInHand),
    pending: n('pending'),
    expenses: spent,
    expensesApproved: expenses.approved,
    expensesWaiting: expenses.waiting,
    profit: toAmount(income - spent), // once every balance is collected
    cashProfit: toAmount(n('collected') + n('kept') + b2bInHand - spent), // with the money received so far
  };
}

async function departureExpenses(departureId) {
  await ensureSchema();
  const id = Number(departureId);
  const list = await listFor(id);
  return { ...list, finance: await tripFinance(id, list.summary) };
}

/* ---------------- Trip report (Excel export in Trip Coordination) ---------------- */

// Every payment for the trip's bookings, one row each:
//   payments recorded on the booking (office, guide cash, guide PhonePe)
//   + what was paid online on the website when booking (not a payment row)
//   − refunds that went out
const COLLECTIONS = `
  SELECT bp.paid_at AS at, b.booking_ref, b.status AS booking_status, c.name AS customer_name, c.phone AS customer_phone,
         bp.amount, bp.method, bp.reference, bp.note, u.full_name AS received_by, u.role AS received_by_role
  FROM booking_payments bp
  JOIN bookings b ON b.id = bp.booking_id
  JOIN customers c ON c.id = b.customer_id
  LEFT JOIN admin_users u ON u.id = bp.received_by
  WHERE b.departure_id = ?
  UNION ALL
  SELECT COALESCE(b.paid_at, b.booked_at), b.booking_ref, b.status, c.name, c.phone,
         b.amount_paid - COALESCE((SELECT SUM(x.amount) FROM booking_payments x WHERE x.booking_id = b.id), 0),
         'phonepe', b.merchant_order_id, 'Paid online when booking on the website', NULL, NULL
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.departure_id = ? AND b.merchant_order_id IS NOT NULL
    AND b.amount_paid - COALESCE((SELECT SUM(x.amount) FROM booking_payments x WHERE x.booking_id = b.id), 0) > 0.009`;
const REFUNDS = `
  SELECT COALESCE(r.completed_at, r.created_at) AS at, b.booking_ref, b.status AS booking_status,
         c.name AS customer_name, c.phone AS customer_phone, -r.amount AS amount,
         IF(r.mode = 'phonepe', 'phonepe', COALESCE(r.method, 'other')) AS method,
         COALESCE(r.merchant_refund_id, r.reference) AS reference, 'Refund' AS note,
         u.full_name AS received_by, u.role AS received_by_role
  FROM booking_refunds r
  JOIN bookings b ON b.id = r.booking_id
  JOIN customers c ON c.id = b.customer_id
  LEFT JOIN admin_users u ON u.id = r.initiated_by
  WHERE b.departure_id = ? AND r.state = 'completed'`;

// Refunds noted on a booking without a refund record (older entries)
const OTHER_REFUNDS = (withTable) => `
  SELECT COALESCE(b.refunded_at, b.updated_at) AS at, b.booking_ref, b.status AS booking_status,
         c.name AS customer_name, c.phone AS customer_phone,
         -(b.refund_amount${withTable ? " - COALESCE((SELECT SUM(r.amount) FROM booking_refunds r WHERE r.booking_id = b.id AND r.state = 'completed'), 0)" : ''}) AS amount,
         'other' AS method, NULL AS reference, 'Refund' AS note, NULL AS received_by, NULL AS received_by_role
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.departure_id = ? AND b.refund_amount > 0
  HAVING amount < -0.009`;

// What kind of payment a row is, in words for the sheet
function collectionKind(row) {
  if (Number(row.amount) < 0) return 'Refund';
  if (String(row.reference || '').startsWith('FGWBAL_')) return 'Balance · PhonePe (guide)';
  if (row.note === 'Paid online when booking on the website') return 'Online booking · PhonePe';
  if (row.received_by_role === 'trek_lead') return `Balance · ${row.method === 'cash' ? 'cash' : row.method} (guide)`;
  return 'Recorded by office';
}

async function tripReport(departureId) {
  const id = Number(departureId);
  const { items, summary: expenseSummary, finance } = await departureExpenses(id);
  const payments = await executeQuery(COLLECTIONS, [id, id]);
  let refunds;
  let otherRefunds;
  try {
    refunds = await executeQuery(REFUNDS, [id]);
    otherRefunds = await executeQuery(OTHER_REFUNDS(true), [id]);
  } catch (error) {
    if (error?.code !== 'ER_NO_SUCH_TABLE' && error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
    refunds = []; // booking_refunds not there yet
    otherRefunds = await executeQuery(OTHER_REFUNDS(false), [id]);
  }
  const collections = [...payments, ...refunds, ...otherRefunds]
    .map((row) => ({ ...row, amount: toAmount(row.amount), kind: collectionKind(row) }))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return { collections, expenses: items, expenseSummary, finance };
}

async function officeExpense(expenseId) {
  await ensureSchema();
  const [expense] = await executeQuery('SELECT id, departure_id, amount, category, status FROM trip_expenses WHERE id = ?', [Number(expenseId) || 0]);
  if (!expense) throw notFound('Expense not found');
  return expense;
}

async function addOfficeExpense(admin, departureId, body = {}) {
  await ensureSchema();
  const id = Number(departureId);
  if (!(await executeQuery('SELECT id FROM departures WHERE id = ?', [id])).length) throw notFound('Trip not found');
  await insertExpense(admin, id, body, { approved: true });
  return departureExpenses(id);
}

// The office can correct any expense (a guide's too) or delete it
async function updateOfficeExpense(admin, expenseId, body = {}) {
  const expense = await officeExpense(expenseId);
  await changeExpense(admin, expense, body, false);
  return departureExpenses(expense.departure_id);
}

async function deleteOfficeExpense(admin, expenseId) {
  const expense = await officeExpense(expenseId);
  await executeQuery('DELETE FROM trip_expenses WHERE id = ?', [expense.id]);
  await logActivity(admin, 'delete', 'trip_expense', expense.id, `₹${expense.amount} ${expense.category}`);
  return departureExpenses(expense.departure_id);
}

// status: approved | rejected | submitted (undo); note optional
async function reviewExpense(admin, expenseId, body = {}) {
  const status = String(body.status || '');
  if (!STATUSES.includes(status)) throw badRequest('Unknown status');
  const expense = await officeExpense(expenseId);
  const note = String(body.note || '').trim().slice(0, 300) || null;
  const reviewed = status !== 'submitted';
  await executeQuery(
    'UPDATE trip_expenses SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = IF(?, NOW(), NULL) WHERE id = ?',
    [status, note, reviewed ? admin.id : null, reviewed, expense.id]
  );
  const action = status === 'submitted' ? 'reopen' : status === 'approved' ? 'approve' : 'reject';
  await logActivity(admin, action, 'trip_expense', expense.id, `₹${expense.amount} ${expense.category}${note ? ` · ${note}` : ''}`);
  return departureExpenses(expense.departure_id);
}

/* ---------------- Bill photo ---------------- */

async function sendReceipt(res, expenseId, where = '', params = []) {
  await ensureSchema();
  const [row] = await executeQuery(`SELECT receipt_mime, receipt FROM trip_expenses e WHERE e.id = ? ${where}`, [Number(expenseId) || 0, ...params]);
  if (!row?.receipt) throw notFound('No bill photo');
  res.set('Content-Type', row.receipt_mime || 'image/jpeg');
  res.set('Cache-Control', 'private, max-age=86400');
  res.send(row.receipt);
}

// Guide: only receipts on their own trips; office: any
const myReceipt = (admin, res, expenseId) => sendReceipt(res, expenseId, `AND e.departure_id IN (${MINE})`, [admin.id]);
const officeReceipt = (res, expenseId) => sendReceipt(res, expenseId);

module.exports = {
  CATEGORIES,
  tripExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  departureExpenses,
  addOfficeExpense,
  updateOfficeExpense,
  deleteOfficeExpense,
  reviewExpense,
  tripReport,
  myReceipt,
  officeReceipt,
};
