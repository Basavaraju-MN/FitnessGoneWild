// Coupons on the website: the offers shown on a trek's booking pop-up, the
// "Apply" check, and the price check before a payment. Rules: couponRules.js.
const dbops = require('../../db/dbops');
const { tripPrice, couponDiscount, bookingAmounts, couponLabel, dateOnly } = require('./couponRules');

const cleanCode = (code) => String(code || '').trim().toUpperCase();

// A customer-facing error (sent with its message, status 400)
const problem = (message) => Object.assign(new Error(message), { status: 400 });

// What the booking pop-up needs to know about a coupon (and to repeat the maths)
const publicCoupon = (c) => ({
  code: c.code,
  title: c.title,
  description: c.description,
  label: couponLabel(c),
  discount_type: c.discount_type,
  discount_value: Number(c.discount_value),
  max_discount: c.max_discount == null ? null : Number(c.max_discount),
  min_people: c.min_people == null ? null : Number(c.min_people),
  min_amount: c.min_amount == null ? null : Number(c.min_amount),
  valid_to: dateOnly(c.valid_to),
});

/** Offers for a trek's booking pop-up (public, active, in date, not used up). */
async function couponsForTrip(tripId) {
  return (await dbops.getPublicCouponsForTrip(tripId)).map(publicCoupon);
}

// The trek's prices, with its price options (none = with / without transport)
async function loadTrip(tripId) {
  const trip = await dbops.getTripForPricing(tripId);
  if (!trip) throw problem('This trek could not be found.');
  return { ...trip, price_options: await dbops.getTripPriceOptions(trip.id) };
}

// tickets: { withTransport, withoutTransport } or { options: [{ id, people }] }
function priceOf(trip, tickets) {
  const price = tripPrice(trip, tickets);
  if (price.problem) throw problem(price.problem);
  return price;
}

/** "Apply": does the code work for this trek and these tickets? */
async function checkCoupon({ code, tripId, tickets }) {
  const trip = await loadTrip(tripId);
  const price = priceOf(trip, tickets);
  const coupon = cleanCode(code) ? await dbops.getCouponByCode(cleanCode(code)) : null;
  const result = couponDiscount(coupon, { tripId: trip.id, people: price.people, subtotal: price.subtotal });
  if (result.problem) throw problem(result.problem);
  return { coupon: publicCoupon(coupon), discount: result.discount, subtotal: price.subtotal };
}

/**
 * Before a payment: the price worked out here from the trek's prices and the
 * coupon (never trusted from the browser). Throws a customer-facing problem
 * when the coupon no longer applies.
 */
async function quoteBooking({ tripId, tickets, couponCode, paymentType }) {
  const trip = await loadTrip(tripId);
  const price = priceOf(trip, tickets);
  if (price.people < 1) throw problem('Please select at least one ticket.');

  let coupon = null;
  let discount = 0;
  if (cleanCode(couponCode)) {
    coupon = await dbops.getCouponByCode(cleanCode(couponCode));
    const result = couponDiscount(coupon, { tripId: trip.id, people: price.people, subtotal: price.subtotal });
    if (result.problem) throw problem(`Coupon ${cleanCode(couponCode)}: ${result.problem} Please remove it and try again.`);
    discount = result.discount;
  }

  return {
    ...price,
    coupon,
    discount,
    ...bookingAmounts({ subtotal: price.subtotal, discount, people: price.people, paymentType }),
  };
}

module.exports = { couponsForTrip, checkCoupon, quoteBooking, cleanCode };
