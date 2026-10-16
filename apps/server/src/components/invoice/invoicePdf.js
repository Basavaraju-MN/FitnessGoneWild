// Invoice as a PDF (A4), the same content as the invoice page.
// Used by the website (/invoice/<token>/pdf) and the admin (attach on WhatsApp).
const path = require('path');
const PDFDocument = require('pdfkit');

const FONTS = path.join(__dirname, '../../utils/templates/fonts');
// Small copy of the logo (keeps each PDF light)
const LOGO = path.join(__dirname, '../../utils/templates/invoice-logo.png');

const PINE = '#0F3D36';
const MUTED = '#6B7C77';
const LINE = '#DDE4DE';
const METHOD = { upi: 'UPI', cash: 'Cash', bank_transfer: 'Bank transfer', card: 'Card', phonepe: 'PhonePe', other: 'Other' };

const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (v) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// data = { booking, payments, refunds, settings } (see invoice.js)
function buildInvoicePdf({ booking: b, payments, refunds, settings, invoiceNo }) {
  const number = invoiceNo || `INV-${b.booking_ref}`;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${number}`, Author: settings.business_name || 'The Fitness Gone Wild' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', path.join(FONTS, 'NotoSans-Regular.ttf'));
    doc.registerFont('bold', path.join(FONTS, 'NotoSans-Bold.ttf'));

    const left = 40;
    const right = doc.page.width - 40;
    const width = right - left;

    const gst = Number(settings.gst_percent || 5);
    const total = Number(b.amount);
    const taxable = total / (1 + gst / 100);
    const recorded = payments.reduce((s, p) => s + Number(p.amount), 0);
    const online = Math.max(0, Number(b.amount_paid) - recorded);
    const refunded = refunds.reduce((s, r) => s + Number(r.amount), 0);
    const balance = Number(b.balance_amount);
    const cancelled = b.status === 'cancelled';
    const statusText = cancelled ? 'CANCELLED' : balance > 0.009 ? 'BALANCE DUE' : 'PAID IN FULL';

    /* ---------- Header band ---------- */
    doc.rect(0, 0, doc.page.width, 120).fill(PINE);
    try {
      doc.roundedRect(left, 22, 96, 76, 8).fill('#FFFFFF');
      doc.image(LOGO, left + 6, 26, { fit: [84, 68], align: 'center', valign: 'center' });
    } catch {
      // no logo file: name only
    }
    doc.fillColor('#FFFFFF').font('bold').fontSize(13).text(settings.business_name || 'The Fitness Gone Wild', left + 110, 28);
    doc.font('regular').fontSize(9).fillColor('#C9DAD4')
      .text(settings.business_address || '', left + 110, 48)
      .text([settings.contact_phone, settings.contact_email].filter(Boolean).join('  ·  '), left + 110, 62);

    doc.font('bold').fontSize(22).fillColor('#FFFFFF').text('INVOICE', left, 26, { width, align: 'right' });
    doc.font('regular').fontSize(9).fillColor('#C9DAD4')
      .text(`No. ${number}`, left, 56, { width, align: 'right' })
      .text(`Booked on ${date(b.booked_at)}`, left, 69, { width, align: 'right' });
    const badge = statusText;
    doc.font('bold').fontSize(8);
    const bw = doc.widthOfString(badge) + 16;
    const badgeColor = cancelled ? '#E5E7EB' : balance > 0.009 ? '#FDE9CF' : '#D9F2E3';
    const badgeText = cancelled ? '#4B5563' : balance > 0.009 ? '#8A4A08' : '#1F6B3D';
    doc.roundedRect(right - bw, 86, bw, 16, 8).fill(badgeColor);
    doc.fillColor(badgeText).text(badge, right - bw, 90, { width: bw, align: 'center' });

    /* ---------- Billed to / Trip ---------- */
    let y = 145;
    const col = width / 2;
    const label = (text, x, yy) => doc.font('bold').fontSize(8).fillColor(MUTED).text(text.toUpperCase(), x, yy, { characterSpacing: 1 });
    label('Billed to', left, y);
    label('Trip', left + col, y);
    doc.font('bold').fontSize(11).fillColor('#1D2A27').text(b.customer_name || '', left, y + 14, { width: col - 10 });
    doc.font('regular').fontSize(10).fillColor('#33433E').text([b.customer_phone, b.customer_email].filter(Boolean).join('\n'), left, y + 30, { width: col - 10 });

    const dates = b.trek_end_date && b.trek_end_date !== b.trek_start_date ? `${date(b.trek_start_date)} – ${date(b.trek_end_date)}` : date(b.trek_start_date);
    const pickup = b.pickup_name ? `${b.pickup_name}${b.pickup_address ? ` – ${b.pickup_address}` : ''}` : 'Self';
    doc.font('bold').fontSize(11).fillColor('#1D2A27').text(b.trip_name || 'Trip', left + col, y + 14, { width: col });
    doc.font('regular').fontSize(10).fillColor('#33433E').text(`${dates}\nPickup: ${pickup}`, left + col, y + 30, { width: col });

    /* ---------- Line item ---------- */
    y = Math.max(doc.y, y + 64) + 18;
    doc.rect(left, y, width, 24).fill('#F2F5F1');
    doc.font('bold').fontSize(9).fillColor('#4B5B56')
      .text('Description', left + 10, y + 7)
      .text('People', left + width - 190, y + 7, { width: 60, align: 'right' })
      .text('Amount', left + width - 120, y + 7, { width: 110, align: 'right' });
    y += 32;
    const transport = b.travel_mode === 'mixed'
      ? `${b.with_transport_people} with transport, ${b.without_transport_people} without`
      : b.travel_mode === 'without_transport' ? 'Without transport' : 'With transport';
    doc.font('bold').fontSize(10).fillColor('#1D2A27').text(b.trip_name || 'Trip', left + 10, y, { width: width - 210 });
    doc.font('regular').fontSize(9).fillColor(MUTED).text(`${transport} · Booking ${b.booking_ref}`, left + 10, doc.y + 1, { width: width - 210 });
    doc.font('regular').fontSize(10).fillColor('#1D2A27')
      .text(String(b.people), left + width - 190, y, { width: 60, align: 'right' })
      .text(rupees(taxable), left + width - 120, y, { width: 110, align: 'right' });
    y = Math.max(doc.y, y + 30) + 10;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).lineWidth(1).stroke();

    /* ---------- Totals ---------- */
    y += 12;
    const tx = right - 250;
    const row = (name, value, opts = {}) => {
      doc.font(opts.bold ? 'bold' : 'regular').fontSize(opts.size || 10).fillColor(opts.color || '#1D2A27');
      doc.text(name, tx, y, { width: 140 });
      doc.text(value, tx + 140, y, { width: 110, align: 'right' });
      y += opts.gap || 18;
    };
    row('Trip amount (without GST)', rupees(taxable));
    row(`GST (${gst}%)`, rupees(total - taxable));
    doc.moveTo(tx, y - 2).lineTo(right, y - 2).strokeColor(PINE).lineWidth(1.5).stroke();
    y += 6;
    row('Total', rupees(total), { bold: true, size: 12, gap: 22 });
    row('Paid', rupees(b.amount_paid));
    if (refunded > 0.009) row('Refunded', `− ${rupees(refunded)}`);
    if (!cancelled) row('Balance due', rupees(balance), { bold: balance > 0.009, color: balance > 0.009 ? '#8A4A08' : '#1D2A27' });

    /* ---------- Payments received ---------- */
    const history = [
      ...(online > 0.009 ? [{ date: b.paid_at || b.booked_at, how: 'PhonePe (online)', ref: b.merchant_order_id, amount: online }] : []),
      ...payments.map((p) => ({ date: p.paid_at, how: METHOD[p.method] || p.method, ref: p.reference, amount: Number(p.amount) })),
    ];
    if (history.length) {
      y += 16;
      label('Payments received', left, y);
      y += 16;
      doc.rect(left, y, width, 22).fill('#F2F5F1');
      doc.font('bold').fontSize(9).fillColor('#4B5B56')
        .text('Date', left + 10, y + 6)
        .text('Paid by', left + 110, y + 6)
        .text('Reference', left + 240, y + 6)
        .text('Amount', left + width - 120, y + 6, { width: 110, align: 'right' });
      y += 28;
      for (const h of history) {
        doc.font('regular').fontSize(9).fillColor('#1D2A27')
          .text(date(h.date), left + 10, y)
          .text(h.how || '—', left + 110, y, { width: 125 })
          .text(h.ref || '—', left + 240, y, { width: width - 370 })
          .text(rupees(h.amount), left + width - 120, y, { width: 110, align: 'right' });
        y = Math.max(doc.y, y + 14) + 6;
      }
    }

    /* ---------- Note ---------- */
    y += 14;
    const note = cancelled
      ? 'This booking has been cancelled.'
      : balance > 0.009
        ? `Please pay the balance of ${rupees(balance)} before the trip. Reply to us on WhatsApp for payment details.`
        : 'Thank you! Your booking is fully paid. See you on the trail.';
    doc.roundedRect(left, y, width, 46, 8).fill('#F6F8F5');
    doc.font('regular').fontSize(9).fillColor('#55645F').text(`${note}  Prices include ${gst}% GST.`, left + 12, y + 10, { width: width - 24 });

    // Footer inside the bottom margin, so it stays on this page
    doc.page.margins.bottom = 0;
    doc.font('regular').fontSize(8).fillColor(MUTED)
      .text('This is a computer-generated invoice.', left, doc.page.height - 34, { width, align: 'center', lineBreak: false });
    doc.end();
  });
}

module.exports = { buildInvoicePdf };
