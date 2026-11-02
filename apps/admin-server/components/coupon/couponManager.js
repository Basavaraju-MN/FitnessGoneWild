// Coupons screen: create, edit, switch off and delete coupons, and choose the
// treks each one is for. Customers apply them on the website booking pop-up
// (rules: apps/server/src/components/coupon/couponRules.js).
const dbops = require('../../db/dbops');
const { couponLabel } = require('../../../server/src/components/coupon/couponRules');
const { badRequest, notFound, isDate, logActivity } = require('../../utils/http');

const text = (value, max) => {
  const v = String(value ?? '').trim();
  return v ? v.slice(0, max) : null;
};

// Empty = no limit / no condition
const optionalNumber = (value, name, { min = 0, integer = false } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || (integer && !Number.isInteger(n))) {
    throw badRequest(`${name} must be ${integer ? 'a whole number' : 'a number'}${min ? ` of at least ${min}` : ''}`);
  }
  return n;
};

const flag = (value, fallback) => (value === undefined ? fallback : value === true || Number(value) === 1 || value === '1' ? 1 : 0);

function cleanCoupon(body) {
  const code = String(body.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) {
    throw badRequest('Code: 3 to 40 letters or numbers (also - and _), e.g. FAMILY500');
  }
  const title = text(body.title, 120);
  if (!title) throw badRequest('Enter a title customers will see, e.g. "₹500 off for families"');

  const type = body.discount_type === 'percent' ? 'percent' : 'flat';
  const value = optionalNumber(body.discount_value, 'Discount', { min: 1 });
  if (value == null) throw badRequest('Enter the discount');
  if (type === 'percent' && value > 100) throw badRequest('A percentage discount cannot be more than 100');

  const validFrom = text(body.valid_from, 10);
  const validTo = text(body.valid_to, 10);
  for (const d of [validFrom, validTo]) if (d && !isDate(d)) throw badRequest('Dates must be YYYY-MM-DD');
  if (validFrom && validTo && validTo < validFrom) throw badRequest('"Valid until" cannot be before "Valid from"');

  const appliesTo = body.applies_to === 'selected' ? 'selected' : 'all';
  const tripIds = [...new Set((Array.isArray(body.trip_ids) ? body.trip_ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (appliesTo === 'selected' && !tripIds.length) throw badRequest('Choose at least one trek, or make the coupon for all treks');

  return {
    data: {
      code,
      title,
      description: text(body.description, 300),
      discount_type: type,
      discount_value: value,
      max_discount: type === 'percent' ? optionalNumber(body.max_discount, 'Maximum discount', { min: 1 }) : null,
      min_people: optionalNumber(body.min_people, 'Minimum people', { min: 1, integer: true }),
      min_amount: optionalNumber(body.min_amount, 'Minimum booking amount', { min: 1 }),
      valid_from: validFrom,
      valid_to: validTo,
      usage_limit: optionalNumber(body.usage_limit, 'Usage limit', { min: 1, integer: true }),
      applies_to: appliesTo,
      is_public: flag(body.is_public, 1),
      is_active: flag(body.is_active, 1),
    },
    tripIds: appliesTo === 'selected' ? tripIds : [],
  };
}

const withLabel = (c) => ({ ...c, label: couponLabel(c), trip_ids: c.trip_ids ? String(c.trip_ids).split(',').map(Number) : [] });

async function getCoupons() {
  return (await dbops.getCoupons()).map(withLabel);
}

async function findCoupon(id) {
  const coupon = (await dbops.getCoupons(id))[0];
  if (!coupon) throw notFound('Coupon not found');
  return withLabel(coupon);
}

async function createCoupon(admin, body = {}) {
  const { data, tripIds } = cleanCoupon(body);
  if (await dbops.couponCodeTaken(data.code)) throw badRequest(`The code ${data.code} is already used by another coupon`);
  const id = await dbops.createCoupon({ ...data, created_by: admin.id || null });
  await dbops.setCouponTrips(id, tripIds);
  await logActivity(admin, 'create', 'coupon', id, `${data.code} · ${couponLabel(data)}`);
  return findCoupon(id);
}

async function updateCoupon(admin, id, body = {}) {
  const coupon = await findCoupon(id);
  const { data, tripIds } = cleanCoupon({ ...coupon, ...body, trip_ids: body.trip_ids ?? coupon.trip_ids });
  if (data.code !== coupon.code && (await dbops.couponCodeTaken(data.code, coupon.id))) {
    throw badRequest(`The code ${data.code} is already used by another coupon`);
  }
  await dbops.updateCoupon(coupon.id, data);
  await dbops.setCouponTrips(coupon.id, tripIds);
  await logActivity(admin, 'update', 'coupon', coupon.id, data.code);
  return findCoupon(coupon.id);
}

// Used coupons stay on their bookings: they can be switched off, not deleted
async function deleteCoupon(admin, id) {
  const coupon = await findCoupon(id);
  if (Number(coupon.used_count) > 0 || Number(coupon.bookings) > 0) {
    throw badRequest('This coupon has been used on bookings. Switch it off instead (Active: off).');
  }
  await dbops.deleteCoupon(coupon.id);
  await logActivity(admin, 'delete', 'coupon', coupon.id, coupon.code);
  return true;
}

module.exports = { getCoupons, createCoupon, updateCoupon, deleteCoupon };
