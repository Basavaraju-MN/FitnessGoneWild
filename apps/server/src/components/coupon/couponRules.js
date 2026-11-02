// Coupon rules: whether a coupon applies to a booking and how much it takes
// off. No database here: used by the website's payment check (coupon.js) and
// the admin. The booking pop-up repeats couponDiscount() to show the price;
// the server always works it out again before taking the payment.

const GST_RATE = 0.05;
// Advance to reserve a slot, per ticket (plus GST), as on the booking pop-up
const ADVANCE_PER_TICKET = 1500;
// Backpacking (category 3) is sold only with transportation
const WITH_TRANSPORT_ONLY_CATEGORY_IDS = [3];

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const count = (value) => Math.max(0, Math.floor(Number(value) || 0));

// YYYY-MM-DD today in India (booking dates are Indian dates)
const todayInIndia = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const dateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

/** Trip price before GST, from the trek's own prices (never the browser's). */
function tripPrice(trip, withTransport, withoutTransport) {
  const without = Number(trip.without_transport_price ?? trip.price ?? 0);
  const withT = Number(trip.with_transport_price ?? without) || without;
  const transportOnly = WITH_TRANSPORT_ONLY_CATEGORY_IDS.includes(Number(trip.category_id));
  const w = count(withTransport);
  const wo = transportOnly ? 0 : count(withoutTransport);
  return { people: w + wo, withTransport: w, withoutTransport: wo, subtotal: toMoney(w * withT + wo * without) };
}

/**
 * { discount } when the coupon applies, else { problem } (a sentence for the customer).
 *   coupon   row from `coupons` (+ trip_ids for applies_to = 'selected')
 *   tripId, people, subtotal (before GST), today (YYYY-MM-DD)
 */
function couponDiscount(coupon, { tripId, people, subtotal, today = todayInIndia() }) {
  if (!coupon || !Number(coupon.is_active)) return { problem: 'This coupon code is not valid.' };

  const from = dateOnly(coupon.valid_from);
  const to = dateOnly(coupon.valid_to);
  if (from && today < from) return { problem: `This coupon can be used from ${from}.` };
  if (to && today > to) return { problem: 'This coupon has expired.' };

  if (coupon.usage_limit != null && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
    return { problem: 'This coupon has been fully used.' };
  }

  if (coupon.applies_to === 'selected' && !(coupon.trip_ids || []).map(Number).includes(Number(tripId))) {
    return { problem: 'This coupon is not for this trek.' };
  }

  if (coupon.min_people != null && people < Number(coupon.min_people)) {
    return { problem: `This coupon needs at least ${Number(coupon.min_people)} people in the booking.` };
  }

  if (coupon.min_amount != null && subtotal < Number(coupon.min_amount)) {
    return { problem: `This coupon needs a booking of at least ₹${Number(coupon.min_amount).toLocaleString('en-IN')} (before GST).` };
  }

  let discount = coupon.discount_type === 'percent'
    ? (subtotal * Number(coupon.discount_value)) / 100
    : Number(coupon.discount_value);
  if (coupon.discount_type === 'percent' && coupon.max_discount != null) {
    discount = Math.min(discount, Number(coupon.max_discount));
  }
  discount = toMoney(Math.min(Math.max(0, discount), subtotal));
  if (discount <= 0) return { problem: 'This coupon gives no discount on this booking.' };

  return { discount };
}

/**
 * What the customer pays: trip price, coupon discount, GST on the rest, and
 * the advance (₹1500 a ticket + GST) when they chose to reserve a slot.
 */
function bookingAmounts({ subtotal, discount = 0, people, paymentType }) {
  const afterDiscount = toMoney(subtotal - discount);
  const gst = toMoney(afterDiscount * GST_RATE);
  const total = toMoney(afterDiscount + gst);
  const advanceSubtotal = ADVANCE_PER_TICKET * people;
  const isAdvance = paymentType === 'advance' && people > 0 && advanceSubtotal < afterDiscount;
  const payableNow = isAdvance ? toMoney(advanceSubtotal * (1 + GST_RATE)) : total;
  return { afterDiscount, gst, total, isAdvance, payableNow, balanceDue: toMoney(total - payableNow) };
}

// "₹500 off", "10% off (up to ₹1,000)"
function couponLabel(coupon) {
  const value = Number(coupon.discount_value);
  if (coupon.discount_type === 'percent') {
    const cap = coupon.max_discount != null ? ` (up to ₹${Number(coupon.max_discount).toLocaleString('en-IN')})` : '';
    return `${value}% off${cap}`;
  }
  return `₹${value.toLocaleString('en-IN')} off`;
}

module.exports = {
  GST_RATE,
  ADVANCE_PER_TICKET,
  toMoney,
  todayInIndia,
  dateOnly,
  tripPrice,
  couponDiscount,
  bookingAmounts,
  couponLabel,
};
