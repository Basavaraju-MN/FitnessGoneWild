// Small lists used by dropdowns across the admin.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const { ensureSchema } = require('../trekLead/trekLeadSchema');
const { couponLabel } = require('../../../server/src/components/coupon/couponRules');

// Active coupons for the New booking form (empty before coupons.sql has run)
async function activeCoupons() {
  try {
    return (await dbops.getCoupons())
      .filter((c) => Number(c.is_active))
      .map((c) => ({
        id: c.id,
        code: c.code,
        title: c.title,
        label: couponLabel(c),
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        max_discount: c.max_discount == null ? null : Number(c.max_discount),
        applies_to: c.applies_to,
        trip_ids: c.trip_ids ? String(c.trip_ids).split(',').map(Number) : [],
      }));
  } catch (error) {
    if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) return [];
    throw error;
  }
}

const getLookups = async () => {
  await ensureSchema(); // guides.admin_user_id (has_login)
  const [lookups, coupons] = await Promise.all([dbops.getLookups(), activeCoupons()]);
  return { ...lookups, coupons };
};

module.exports = {
  getLookups,
};
