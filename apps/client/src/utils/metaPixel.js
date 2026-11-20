// Meta (Facebook / Instagram) Pixel events. The pixel itself is loaded in
// index.html; these helpers do nothing if it is blocked or not loaded.

const CURRENCY = 'INR';

export function trackMeta(event, params = {}, eventId) {
  try {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
    if (eventId) {
      window.fbq('track', event, params, { eventID: String(eventId) });
    } else {
      window.fbq('track', event, params);
    }
  } catch {
    // Tracking must never break the website
  }
}

const tripParams = (trip, value) => ({
  content_ids: trip?.id ? [String(trip.id)] : [],
  content_name: trip?.name || trip?.trekName || '',
  content_type: 'product',
  ...(Number(value) > 0 ? { value: Number(value), currency: CURRENCY } : {}),
});

// Someone opened a trip's details
export const trackViewTrip = (trip, price) =>
  trackMeta('ViewContent', tripParams(trip, price));

// Someone filled the brochure form (name + phone): a lead
export const trackBrochureLead = (trip) =>
  trackMeta('Lead', { ...tripParams(trip), lead_type: 'brochure_download' });

// Someone tapped WhatsApp / call to talk to us
export const trackContact = (method, trip) =>
  trackMeta('Contact', { ...(trip ? tripParams(trip) : {}), contact_method: method });

// Someone opened the booking pop-up
export const trackStartBooking = (trip) =>
  trackMeta('InitiateCheckout', tripParams(trip));

// Someone pressed Pay (before going to PhonePe)
export const trackPaymentStart = (booking) =>
  trackMeta('AddPaymentInfo', {
    ...tripParams({ id: booking?.trekId, name: booking?.trekName }, booking?.total),
    num_items: peopleCount(booking),
  });

function peopleCount(booking) {
  const options = Array.isArray(booking?.ticketOptions) ? booking.ticketOptions : [];
  const fromOptions = options.reduce((sum, option) => sum + (Number(option?.people) || 0), 0);
  const fromTickets =
    (Number(booking?.transportTickets) || 0) + (Number(booking?.withoutTransportTickets) || 0);
  return fromOptions || fromTickets || 1;
}

// Payment confirmed: a sale. Sent once per order, even if the page is reloaded.
export function trackPurchase(orderId, booking) {
  const key = `metaPurchase:${orderId}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: still send it; the event ID lets Meta drop duplicates
  }
  trackMeta(
    'Purchase',
    {
      ...tripParams({ id: booking?.trekId, name: booking?.trekName }),
      value: Number(booking?.total) || 0,
      currency: CURRENCY,
      num_items: peopleCount(booking),
      payment_type: booking?.paymentType || 'full',
    },
    orderId
  );
}
