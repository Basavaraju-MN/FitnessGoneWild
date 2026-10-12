const nodemailer = require('nodemailer');

// Gmail account that sends the emails (GMAIL_APP_PASSWORD is a Google
// "App password", not the normal Gmail password).
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Who gets admin alerts; comma separated for several people
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

let transporter = null;

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Emails the admin when someone downloads a brochure.
 * Returns false (and logs why) instead of throwing, so it never
 * affects the visitor's download.
 */
async function sendBrochureDownloadAlert({ name, phone, email, tripName }) {
  const mailer = getTransporter();

  if (!mailer || !ADMIN_EMAIL) {
    console.warn('Brochure alert email skipped: GMAIL_USER, GMAIL_APP_PASSWORD or ADMIN_EMAIL not set');
    return false;
  }

  const digits = String(phone || '').replace(/\D/g, '');
  const whatsapp = `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  try {
    await mailer.sendMail({
      from: `"The Fitness Gone Wild" <${GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New brochure download: ${name} · ${tripName}`,
      text: [
        'Someone downloaded a brochure on the website.',
        '',
        `Name:  ${name}`,
        `Phone: ${phone}`,
        `Email: ${email || '—'}`,
        `Trek:  ${tripName}`,
        `Time:  ${when}`,
        '',
        `WhatsApp: ${whatsapp}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#16211E;max-width:520px">
          <h2 style="color:#0F3D36;margin:0 0 6px">New brochure download</h2>
          <p style="margin:0 0 16px;color:#56655F">Follow up while they are interested.</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 0;color:#56655F;width:80px">Name</td><td><b>${escapeHtml(name)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Phone</td><td><b>${escapeHtml(phone)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Email</td><td>${escapeHtml(email || '—')}</td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Trek</td><td>${escapeHtml(tripName)}</td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Time</td><td>${escapeHtml(when)}</td></tr>
          </table>
          <p style="margin:20px 0 0">
            <a href="${whatsapp}" style="background:#E4881F;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Message on WhatsApp</a>
          </p>
        </div>`,
    });
    return true;
  } catch (error) {
    console.error('Brochure alert email failed:', error?.message || error);
    return false;
  }
}

// "Interested" clicks are anonymous and can repeat, so at most one
// email per trip in this window (the email shows the running total).
const INTEREST_EMAIL_GAP_MS = 15 * 60 * 1000;
const lastInterestEmail = new Map(); // tripId -> time of last email

/**
 * Emails the admin when someone clicks "Interested" on a trip.
 * Returns false instead of throwing; never affects the visitor.
 */
async function sendTripInterestAlert({ tripId, tripName, total }) {
  const mailer = getTransporter();

  if (!mailer || !ADMIN_EMAIL) {
    console.warn('Interest alert email skipped: GMAIL_USER, GMAIL_APP_PASSWORD or ADMIN_EMAIL not set');
    return false;
  }

  const now = Date.now();
  if (now - (lastInterestEmail.get(tripId) || 0) < INTEREST_EMAIL_GAP_MS) {
    return false; // emailed about this trip recently
  }
  lastInterestEmail.set(tripId, now);

  const when = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  try {
    await mailer.sendMail({
      from: `"The Fitness Gone Wild" <${GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New interest: ${tripName} (${total} interested)`,
      text: [
        `Someone clicked "Interested" on ${tripName} on the website.`,
        '',
        `Trek:              ${tripName}`,
        `Interested so far: ${total}`,
        `Time:              ${when}`,
        '',
        'Visitors do not leave contact details for this button.',
        'You get at most one of these emails per trek every 15 minutes.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#16211E;max-width:520px">
          <h2 style="color:#0F3D36;margin:0 0 6px">New interest in a trek</h2>
          <p style="margin:0 0 16px;color:#56655F">Someone clicked <b>Interested</b> on the website.</p>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:6px 0;color:#56655F;width:140px">Trek</td><td><b>${escapeHtml(tripName)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Interested so far</td><td><b>${escapeHtml(total)}</b></td></tr>
            <tr><td style="padding:6px 0;color:#56655F">Time</td><td>${escapeHtml(when)}</td></tr>
          </table>
          <p style="margin:18px 0 0;color:#56655F;font-size:12px">
            Visitors do not leave contact details for this button.
            You get at most one of these emails per trek every 15 minutes.
          </p>
        </div>`,
    });
    return true;
  } catch (error) {
    console.error('Interest alert email failed:', error?.message || error);
    return false;
  }
}

const rupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const shortDate = (value) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

/**
 * Emails the admin when a customer completes a booking online.
 * Returns false instead of throwing; never affects the booking.
 */
async function sendBookingAlert(booking) {
  const mailer = getTransporter();

  if (!mailer || !ADMIN_EMAIL) {
    console.warn('Booking alert email skipped: GMAIL_USER, GMAIL_APP_PASSWORD or ADMIN_EMAIL not set');
    return false;
  }

  const {
    bookingRef, name, phone, email, tripName, startDate, endDate, isCustomTrip,
    people, withTransport, withoutTransport, pickupLocation,
    tripTotal, amountPaid, balance, isAdvance,
  } = booking;

  const dates = endDate && endDate !== startDate
    ? `${shortDate(startDate)} → ${shortDate(endDate)}`
    : shortDate(startDate);
  const transport = [
    withTransport ? `${withTransport} with transport` : '',
    withoutTransport ? `${withoutTransport} without transport` : '',
  ].filter(Boolean).join(', ');
  const payment = isAdvance
    ? `Advance ${rupees(amountPaid)} paid · balance ${rupees(balance)} to collect`
    : `Paid in full ${rupees(amountPaid)}`;

  const digits = String(phone || '').replace(/\D/g, '');
  const whatsapp = `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;

  const rows = [
    ['Booking', bookingRef || '—'],
    ['Customer', name],
    ['Phone', phone],
    ['Email', email || '—'],
    ['Trek', `${tripName || '—'}${isCustomTrip ? ' (customised)' : ''}`],
    ['Dates', dates],
    ['People', `${people} (${transport || '—'})`],
    ['Pickup', pickupLocation || '—'],
    ['Trip total', rupees(tripTotal)],
    ['Payment', payment],
  ];

  try {
    await mailer.sendMail({
      from: `"The Fitness Gone Wild" <${GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New booking ${bookingRef || ''}: ${name} · ${tripName || ''} · ${people} ${people === 1 ? 'person' : 'people'}`,
      text: [
        'A customer booked on the website.',
        '',
        ...rows.map(([label, value]) => `${label.padEnd(11)} ${value}`),
        '',
        `WhatsApp: ${whatsapp}`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;color:#16211E;max-width:560px">
          <h2 style="color:#0F3D36;margin:0 0 6px">🎉 New booking</h2>
          <p style="margin:0 0 16px;color:#56655F">A customer booked and paid on the website.</p>
          <table style="border-collapse:collapse;width:100%">
            ${rows.map(([label, value]) => `
              <tr>
                <td style="padding:6px 0;color:#56655F;width:110px;vertical-align:top">${escapeHtml(label)}</td>
                <td style="padding:6px 0"><b>${escapeHtml(value)}</b></td>
              </tr>`).join('')}
          </table>
          <p style="margin:20px 0 0">
            <a href="${whatsapp}" style="background:#E4881F;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Message on WhatsApp</a>
          </p>
        </div>`,
    });
    return true;
  } catch (error) {
    console.error('Booking alert email failed:', error?.message || error);
    return false;
  }
}

module.exports = {
  sendBrochureDownloadAlert,
  sendTripInterestAlert,
  sendBookingAlert,
};
