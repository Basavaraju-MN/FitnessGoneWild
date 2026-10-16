// Bookings screen: list, details, offline bookings, balance payments.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const crypto = require('crypto');
const dbops = require('../../db/dbops');
const { publicSiteUrl } = require('../../config');
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
  requireFields(body, ['departure_id', 'name', 'phone']);
  if ((body.trip_amount === undefined || body.trip_amount === '') && (body.amount === undefined || body.amount === '')) {
    throw badRequest('Enter the trip amount');
  }

  const departure = await dbops.getDepartureForBooking(body.departure_id);
  if (!departure) throw badRequest('Trip coordination not found');

  const withTransport = Math.max(0, Number(body.with_transport_people) || 0);
  const withoutTransport = Math.max(0, Number(body.without_transport_people) || 0);
  const people = withTransport + withoutTransport;
  if (people < 1) throw badRequest('Add at least one person');

  // The trip amount is entered without GST; GST (Settings, 5%) is added on top.
  // "Paid now" is what the customer actually sent (e.g. an advance).
  const gst = await dbops.getGstPercent();
  const amount = body.trip_amount !== undefined && body.trip_amount !== ''
    ? toMoney(Number(body.trip_amount) * (1 + gst / 100))
    : toMoney(body.amount);
  const paid = toMoney(body.paid_amount);
  if (amount <= 0) throw badRequest('Trip amount must be more than 0');
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

  // Save the invoice PDF straight away (ready to send from the ⋮ menu)
  await invoiceStore.ensureInvoice(bookingId, admin.id).catch((error) =>
    console.error('Invoice save failed:', error?.message || error));
  return { id: bookingId };
}

async function updateBooking(admin, id, body) {
  const booking = await dbops.getBookingRow(id);
  if (!booking) throw notFound('Booking not found');

  const data = pick(body, ['status', 'pickup_point_id', 'notes', 'amount']);
  // Edited as the trip amount without GST: total = amount + GST
  if (body.trip_amount !== undefined && body.trip_amount !== '') {
    data.amount = Number(body.trip_amount) * (1 + (await dbops.getGstPercent()) / 100);
  }

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

/* ---------------- Invoice on WhatsApp ---------------- */
const invoiceStore = require('../../../server/src/components/invoice/invoiceStore');
const whatsappCloud = require('../../../server/src/components/whatsapp/whatsappCloud');

// The saved invoice PDF of a booking (a new version is made if amounts changed)
async function getInvoicePdf(admin, id) {
  const saved = await invoiceStore.getInvoicePdf(id, admin?.id || null);
  if (!saved?.pdf) throw notFound('Booking not found');
  return { fileName: saved.fileName, pdf: saved.pdf, invoiceNo: saved.row.invoice_no };
}

// Saved invoices of a booking (newest first)
const getInvoices = (id) => invoiceStore.listInvoices(id);

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const shortDate = (v) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Private invoice link for the booking (created once) and a ready WhatsApp message
async function getInvoiceLink(admin, id, { send = false } = {}) {
  let booking = await dbops.getBookingRow(id);
  if (!booking) throw notFound('Booking not found');

  const saved = await invoiceStore.ensureInvoice(booking.id, admin?.id || null);
  if (send && saved) await invoiceStore.markSent(saved.id);

  if (!booking.invoice_token) {
    await dbops.setInvoiceToken(booking.id, crypto.randomBytes(18).toString('base64url'));
    booking = await dbops.getBookingRow(id);
  }
  const details = await dbops.getBookingById(booking.id);
  const url = `${publicSiteUrl}/invoice/${booking.invoice_token}`;

  const balance = Number(details.balance_amount);
  const dates = details.trek_end_date && details.trek_end_date !== details.trek_start_date
    ? `${shortDate(details.trek_start_date)} – ${shortDate(details.trek_end_date)}`
    : shortDate(details.trek_start_date);

  const lines = [
    `Hi ${details.customer_name}, thank you for booking with The Fitness Gone Wild! 🏔️`,
    '',
    `*${details.trip_name || 'Your trip'}*`,
    `📅 ${dates}`,
    `👥 ${details.people} ${Number(details.people) === 1 ? 'person' : 'people'}${details.pickup_name ? ` · Pickup: ${details.pickup_name}` : ''}`,
    `🧾 Booking ID: ${details.booking_ref}${saved ? ` · Invoice ${saved.invoice_no}` : ''}`,
    '',
    `Total: ${inr(details.amount)} (incl. GST)`,
    `Paid: ${inr(details.amount_paid)}`,
    details.status === 'cancelled' ? 'Status: Cancelled' : (balance > 0.009 ? `*Balance due: ${inr(balance)}*` : '✅ Fully paid'),
    '',
    `Your invoice: ${url}`,
    `Download PDF: ${url}/pdf`,
  ];

  if (send) await logActivity(admin, 'invoice', 'booking', booking.id, `${saved?.invoice_no || 'invoice'} sent on WhatsApp`);
  return { url, phone: details.customer_phone, message: lines.join('\n'), invoiceNo: saved?.invoice_no || null };
}

// Template values, in this order (see README: "booking_invoice" template)
// {{1}} name · {{2}} trip · {{3}} dates · {{4}} booking ID · {{5}} total · {{6}} paid · {{7}} balance
async function sendInvoiceWhatsApp(admin, id) {
  const saved = await invoiceStore.getInvoicePdf(id, admin?.id || null);
  if (!saved?.pdf) throw notFound('Booking not found');
  const b = await dbops.getBookingById(id);

  const dates = b.trek_end_date && b.trek_end_date !== b.trek_start_date
    ? `${shortDate(b.trek_start_date)} – ${shortDate(b.trek_end_date)}`
    : shortDate(b.trek_start_date);
  const balance = Number(b.balance_amount);

  const result = await whatsappCloud.sendInvoiceDocument({
    bookingId: b.id,
    invoiceId: saved.row.id,
    phone: b.customer_phone,
    pdf: saved.pdf,
    fileName: saved.fileName,
    sentBy: admin?.id,
    params: [
      b.customer_name,
      b.trip_name || 'your trip',
      dates || '-',
      b.booking_ref,
      inr(b.amount),
      inr(b.amount_paid),
      b.status === 'cancelled' ? 'Cancelled' : balance > 0.009 ? inr(balance) : 'Nil (fully paid)',
    ],
  });

  await invoiceStore.markSent(saved.row.id);
  await logActivity(admin, 'invoice', 'booking', b.id, `${saved.row.invoice_no} sent by WhatsApp API to ${result.to}`);
  return { to: result.to, invoiceNo: saved.row.invoice_no, messageId: result.id };
}

const getWhatsappMessages = (id) => whatsappCloud.messagesForBooking(id);

const getWhatsappStatus = () => ({
  configured: whatsappCloud.isConfigured(),
  template: whatsappCloud.templateName(),
});

module.exports = {
  sendInvoiceWhatsApp,
  getWhatsappMessages,
  getWhatsappStatus,
  getInvoiceLink,
  getInvoicePdf,
  getInvoices,
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  addBookingPayment,
};
