// Saved invoice PDFs (table booking_invoices).
// An invoice is made when a booking is created, and a new version is made
// when the booking's amounts change (payment, edit, refund, cancellation),
// so the PDF sent to the customer always matches the booking.
const { executeQuery } = require('../../db/connection');
const { loadInvoiceByBookingId } = require('./invoice');
const { buildInvoicePdf } = require('./invoicePdf');

const queries = {
  latest: `SELECT id, booking_id, version, invoice_no, file_name, total, paid, balance, refunded, status,
                  created_at, sent_count, last_sent_at
           FROM booking_invoices WHERE booking_id = ? ORDER BY version DESC LIMIT 1`,
  pdf: 'SELECT pdf, file_name FROM booking_invoices WHERE id = ?',
  insert: 'INSERT INTO booking_invoices SET ?',
  markSent: 'UPDATE booking_invoices SET sent_count = sent_count + 1, last_sent_at = NOW() WHERE id = ?',
  list: `SELECT id, version, invoice_no, file_name, total, paid, balance, refunded, status,
                created_at, sent_count, last_sent_at, LENGTH(pdf) AS size
         FROM booking_invoices WHERE booking_id = ? ORDER BY version DESC`,
};

const money = (v) => Math.round(Number(v || 0) * 100) / 100;

// What the invoice shows; a change means a new version is needed
const snapshotOf = (data) => ({
  total: money(data.booking.amount),
  paid: money(data.booking.amount_paid),
  balance: money(data.booking.balance_amount),
  refunded: money(data.refunds.reduce((s, r) => s + Number(r.amount), 0)),
  status: data.booking.status,
});

const sameAs = (row, snap) =>
  row && money(row.total) === snap.total && money(row.paid) === snap.paid
  && money(row.balance) === snap.balance && money(row.refunded) === snap.refunded && row.status === snap.status;

/**
 * Latest saved invoice of a booking, making (a new version of) it when
 * there is none or the amounts changed. Returns the row without the PDF.
 */
async function ensureInvoice(bookingId, createdBy = null) {
  const data = await loadInvoiceByBookingId(bookingId);
  if (!data) return null;

  const latest = (await executeQuery(queries.latest, [bookingId]))?.[0] || null;
  const snap = snapshotOf(data);
  if (sameAs(latest, snap)) return latest;

  const version = (latest?.version || 0) + 1;
  const invoiceNo = `INV-${data.booking.booking_ref}${version > 1 ? `-${version}` : ''}`;
  const fileName = `Invoice-${data.booking.booking_ref}${version > 1 ? `-v${version}` : ''}.pdf`;
  const pdf = await buildInvoicePdf({ ...data, invoiceNo });

  try {
    await executeQuery(queries.insert, [{
      booking_id: bookingId, version, invoice_no: invoiceNo, file_name: fileName, pdf,
      ...snap, created_by: createdBy,
    }]);
  } catch (error) {
    // Two requests at once made the same version: use the one already saved
    if (error?.code !== 'ER_DUP_ENTRY') throw error;
  }
  return (await executeQuery(queries.latest, [bookingId]))?.[0] || null;
}

// { row, pdf } of the latest invoice (made if needed)
async function getInvoicePdf(bookingId, createdBy = null) {
  const row = await ensureInvoice(bookingId, createdBy);
  if (!row) return null;
  const file = (await executeQuery(queries.pdf, [row.id]))?.[0];
  return { row, pdf: file?.pdf, fileName: file?.file_name || row.file_name };
}

const markSent = (invoiceId) => executeQuery(queries.markSent, [invoiceId]);
const listInvoices = (bookingId) => executeQuery(queries.list, [bookingId]);

module.exports = { ensureInvoice, getInvoicePdf, markSent, listInvoices };
