// WhatsApp Business (Cloud) API: sends the invoice PDF as an attachment to
// the customer's number, from the business number, using an approved
// "utility" message template that has a DOCUMENT header.
//
// Environment (Render + local .env):
//   WHATSAPP_TOKEN            permanent access token (System User in Meta Business)
//   WHATSAPP_PHONE_NUMBER_ID  "Phone number ID" from WhatsApp → API Setup
//   WHATSAPP_TEMPLATE_NAME    template name (default: booking_invoice)
//   WHATSAPP_TEMPLATE_LANG    template language code (default: en)
//   WHATSAPP_API_VERSION      Graph API version (default: v21.0)
//   WHATSAPP_VERIFY_TOKEN     any secret text, also typed into the webhook setup
//   WHATSAPP_APP_SECRET       app secret, to check webhook signatures (optional)
const crypto = require('crypto');
const path = require('path');
const { executeQuery } = require('../../db/connection');

// The admin can run on its own locally: WHATSAPP_* live in apps/server/.env
require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });

const env = () => ({
  token: process.env.WHATSAPP_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  template: process.env.WHATSAPP_TEMPLATE_NAME || 'booking_invoice',
  lang: process.env.WHATSAPP_TEMPLATE_LANG || 'en',
  version: process.env.WHATSAPP_API_VERSION || 'v21.0',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
});

const isConfigured = () => Boolean(env().token && env().phoneNumberId);

const queries = {
  insert: 'INSERT INTO whatsapp_messages SET ?',
  update: 'UPDATE whatsapp_messages SET ? WHERE id = ?',
  byWaId: 'UPDATE whatsapp_messages SET status = ?, error = COALESCE(?, error) WHERE wa_message_id = ? AND status <> \'read\'',
  forBooking: `SELECT id, to_phone, status, error, wa_message_id, created_at, updated_at
               FROM whatsapp_messages WHERE booking_id = ? ORDER BY id DESC LIMIT 20`,
};

// 10-digit Indian numbers get 91 in front; WhatsApp wants digits only
function toWaNumber(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) throw Object.assign(new Error('The customer phone number is not valid for WhatsApp'), { status: 400 });
  return digits;
}

const graphUrl = (path) => `https://graph.facebook.com/${env().version}/${path}`;

async function graph(path, options) {
  const response = await fetch(graphUrl(path), {
    ...options,
    headers: { Authorization: `Bearer ${env().token}`, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const e = body.error || {};
    const detail = e.error_data?.details || e.message || response.statusText;
    throw Object.assign(new Error(`WhatsApp: ${detail}`), { status: 502, code: e.code });
  }
  return body;
}

// Upload the PDF to WhatsApp; returns the media id
async function uploadPdf(pdf, fileName) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), fileName);
  const { id } = await graph(`${env().phoneNumberId}/media`, { method: 'POST', body: form });
  return id;
}

/**
 * Sends the invoice PDF with the template.
 * params: the template's body values in order ({{1}}, {{2}}, …)
 * Returns { id (our row), waMessageId }.
 */
async function sendInvoiceDocument({ bookingId, invoiceId, phone, pdf, fileName, params, sentBy }) {
  if (!isConfigured()) throw Object.assign(new Error('WhatsApp Business API is not set up yet'), { status: 400 });
  const to = toWaNumber(phone);
  const { template, lang } = env();

  const { insertId } = await executeQuery(queries.insert, [{
    booking_id: bookingId, invoice_id: invoiceId, to_phone: to, template, status: 'sending', sent_by: sentBy || null,
  }]);

  try {
    const mediaId = await uploadPdf(pdf, fileName);
    const result = await graph(`${env().phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: lang },
          components: [
            { type: 'header', parameters: [{ type: 'document', document: { id: mediaId, filename: fileName } }] },
            { type: 'body', parameters: params.map((text) => ({ type: 'text', text: String(text ?? '').slice(0, 900) || '-' })) },
          ],
        },
      }),
    });
    const waMessageId = result.messages?.[0]?.id || null;
    await executeQuery(queries.update, [{ status: 'sent', wa_message_id: waMessageId, error: null }, insertId]);
    return { id: insertId, waMessageId, to };
  } catch (error) {
    await executeQuery(queries.update, [{ status: 'failed', error: String(error.message).slice(0, 500) }, insertId]).catch(() => {});
    throw error;
  }
}

const messagesForBooking = (bookingId) => executeQuery(queries.forBooking, [bookingId]);

/* ---------- Webhook: delivery status from WhatsApp ---------- */

// GET: Meta checks the webhook once when you set it up
function verifyWebhook(req, res) {
  const { verifyToken } = env();
  if (verifyToken && req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === verifyToken) {
    return res.status(200).send(String(req.query['hub.challenge'] || ''));
  }
  return res.sendStatus(403);
}

// POST: sent / delivered / read / failed for our messages (raw body for the signature)
async function receiveWebhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const { appSecret } = env();
  if (appSecret) {
    const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
    const given = String(req.get('x-hub-signature-256') || '');
    if (given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
      return res.sendStatus(401);
    }
  }
  res.sendStatus(200); // answer at once; WhatsApp retries slow webhooks

  try {
    const body = JSON.parse(raw.toString('utf8') || '{}');
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        for (const s of change.value?.statuses || []) {
          if (!['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue;
          const error = s.errors?.[0] ? `${s.errors[0].title || ''} ${s.errors[0].error_data?.details || ''}`.trim().slice(0, 500) : null;
          await executeQuery(queries.byWaId, [s.status, error, s.id]);
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp webhook failed:', error?.message || error);
  }
}

module.exports = {
  isConfigured,
  sendInvoiceDocument,
  messagesForBooking,
  verifyWebhook,
  receiveWebhook,
  templateName: () => env().template,
};
