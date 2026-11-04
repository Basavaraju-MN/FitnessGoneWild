// A coupon's discount on the booking pop-up, so the price updates as tickets
// change. Same rules as the server (apps/server/src/components/coupon/couponRules.js),
// which checks again before the payment.
const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * { discount } or { problem } for the tickets chosen (subtotal before GST).
 * GST is added first; the coupon comes off the total with GST.
 */
export function couponDiscount(coupon, { people, subtotal, gstRate = 0.05 }) {
  if (!coupon) return { discount: 0 };
  if (coupon.min_people != null && people < coupon.min_people) {
    return { problem: `Needs at least ${coupon.min_people} people in the booking.` };
  }
  if (coupon.min_amount != null && subtotal < coupon.min_amount) {
    return { problem: `Needs a booking of at least ₹${coupon.min_amount.toLocaleString('en-IN')} (before GST).` };
  }
  const withGst = subtotal * (1 + gstRate);
  let discount = coupon.discount_type === 'percent'
    ? (withGst * coupon.discount_value) / 100
    : coupon.discount_value;
  if (coupon.discount_type === 'percent' && coupon.max_discount != null) {
    discount = Math.min(discount, coupon.max_discount);
  }
  discount = toMoney(Math.min(Math.max(0, discount), withGst));
  return discount > 0 ? { discount } : { problem: 'No discount on this booking.' };
}

// Conditions in a few words: "10+ people · bookings from ₹5,000 · till 30 Nov"
export function couponConditions(coupon) {
  return [
    coupon.min_people ? `${coupon.min_people}+ people` : null,
    coupon.min_amount ? `bookings from ₹${coupon.min_amount.toLocaleString('en-IN')}` : null,
    coupon.valid_to
      ? `till ${new Date(`${coupon.valid_to}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      : null,
  ].filter(Boolean).join(' · ');
}
