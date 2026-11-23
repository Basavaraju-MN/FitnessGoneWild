// WhatsApp messages from customers become leads in the admin's
// Enquiries & Leads (source: whatsapp).
//
// A customer who taps an Instagram / Facebook "Send WhatsApp message" ad
// arrives with the ad attached (message.referral), so the lead shows
// "Came from: Instagram ad · <ad headline>". Other first messages show
// "WhatsApp".
//
// One lead per number per LEAD_DAYS: a conversation of many messages is
// one lead, not many.
const { executeQuery } = require('../../db/connection');

const LEAD_DAYS = 30;

const queries = {
  recentLead: `SELECT id FROM enquiries WHERE phone = ? AND source = 'whatsapp'
               AND received_at >= NOW() - INTERVAL ${LEAD_DAYS} DAY ORDER BY id DESC LIMIT 1`,
  findCustomer: 'SELECT id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1',
  trips: "SELECT id, name, slug FROM trips WHERE status = 'published'",
  create: `INSERT INTO enquiries (customer_id, trip_id, name, phone, people, note, status, source)
           VALUES (?, ?, ?, ?, 1, ?, 'new', 'whatsapp')`,
  setTraffic: 'UPDATE enquiries SET traffic_source = ?, traffic_campaign = ? WHERE id = ?',
  // An ad click into a conversation that is already a lead: show the ad on it
  setTrafficIfEmpty: `UPDATE enquiries SET traffic_source = ?, traffic_campaign = ?
                      WHERE id = ? AND (traffic_source IS NULL OR traffic_source IN ('WhatsApp', 'Direct / unknown'))`,
};

// WhatsApp sends 919876543210; the website saves Indian numbers as 9876543210
function localPhone(waId) {
  const digits = String(waId || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits ? `+${digits}` : '';
}

// What the customer wrote (or what kind of message it was)
function messageText(message) {
  switch (message.type) {
    case 'text': return message.text?.body || '';
    case 'button': return message.button?.text || '';
    case 'interactive': return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
    case 'image': case 'video': case 'document': return message[message.type]?.caption || `(${message.type})`;
    default: return `(${message.type || 'message'})`;
  }
}

// "Instagram ad" / "Facebook post", and the ad's headline as the campaign
function adSource(referral) {
  if (!referral) return { source: 'WhatsApp', campaign: null };
  const where = /instagram/i.test(referral.source_url || '') ? 'Instagram' : 'Facebook';
  const kind = referral.source_type === 'post' ? 'post' : 'ad';
  const campaign = referral.headline || (referral.source_id ? `Ad ${referral.source_id}` : null);
  return { source: `${where} ${kind}`, campaign: campaign ? String(campaign).slice(0, 150) : null };
}

// The trek named in the message or the ad (longest name wins: "Kudremukh
// Sunrise" before "Kudremukh"), or null
async function findTrip(text) {
  const haystack = String(text || '').toLowerCase();
  if (!haystack.trim()) return null;
  const trips = (await executeQuery(queries.trips).catch(() => [])) || [];
  const found = trips
    .filter((t) => [t.name, t.slug && t.slug.replace(/-/g, ' ')]
      .some((n) => n && n.length >= 4 && haystack.includes(String(n).toLowerCase())))
    .sort((a, b) => b.name.length - a.name.length)[0];
  return found?.id || null;
}

async function saveTraffic(sql, id, { source, campaign }) {
  try {
    await executeQuery(sql, [source, campaign, id]);
  } catch (error) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
    console.warn('WhatsApp lead: "Came from" not saved (run admin-server/sql/traffic_source.sql)');
  }
}

/**
 * One incoming message (from the webhook's value.messages) with the
 * sender's profile (value.contacts). Creates the lead, or adds the ad to
 * the lead this conversation already has.
 */
async function recordWhatsAppLead(message, contacts = []) {
  const phone = localPhone(message.from);
  if (!phone) return null;

  const traffic = adSource(message.referral);
  const recent = (await executeQuery(queries.recentLead, [phone]))?.[0];
  if (recent) {
    if (message.referral) await saveTraffic(queries.setTrafficIfEmpty, recent.id, traffic);
    return recent.id;
  }

  const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0];
  const name = String(contact?.profile?.name || 'WhatsApp customer').slice(0, 120);
  const text = messageText(message);
  const tripId = await findTrip(`${text} ${message.referral?.headline || ''} ${message.referral?.body || ''}`);
  const customerId = (await executeQuery(queries.findCustomer, [phone]))?.[0]?.id || null;
  const note = `WhatsApp: ${text}`.slice(0, 500);

  const { insertId } = await executeQuery(queries.create, [customerId, tripId, name, phone, note]);
  await saveTraffic(queries.setTraffic, insertId, traffic);
  console.log(`WhatsApp lead ${insertId} from ${traffic.source}${traffic.campaign ? ` (${traffic.campaign})` : ''}`);
  return insertId;
}

module.exports = { recordWhatsAppLead, localPhone, adSource };
