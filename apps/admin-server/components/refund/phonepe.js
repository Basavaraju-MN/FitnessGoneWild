// PhonePe client for refunds: the same client and credentials as the
// website's payments (apps/server/src/config/config.js).
const path = require('path');
const { HttpError } = require('../../utils/http');

const serverDir = path.resolve(__dirname, '../../../server');
let sdk = null;

function load() {
  if (sdk) return sdk;
  // Standalone admin (local): PHONEPE_* live in the website's .env
  require('dotenv').config({ path: path.join(serverDir, '.env'), quiet: true });
  try {
    const { phonePeClient } = require(path.join(serverDir, 'src/config/config'));
    const { RefundRequest } = require(require.resolve('@phonepe-pg/pg-sdk-node', { paths: [serverDir] }));
    sdk = { client: phonePeClient, RefundRequest };
    return sdk;
  } catch (error) {
    throw new HttpError(503, `PhonePe is not set up on this server: ${error.message}`);
  }
}

// PhonePe state -> our state
const toState = (state) => {
  const value = String(state || '').toUpperCase();
  if (value === 'COMPLETED') return 'completed';
  if (value === 'FAILED') return 'failed';
  return 'pending'; // PENDING / CONFIRMED: PhonePe is still processing
};

const errorText = (error) =>
  error?.data?.message || error?.message || error?.code || 'PhonePe refund request failed';

// amount in rupees; PhonePe wants paise
async function startRefund({ merchantRefundId, merchantOrderId, amount }) {
  const { client, RefundRequest } = load();
  const request = RefundRequest.builder()
    .merchantRefundId(merchantRefundId)
    .originalMerchantOrderId(merchantOrderId)
    .amount(Math.round(amount * 100))
    .build();

  try {
    const response = await client.refund(request);
    return { phonepeRefundId: response.refundId || null, state: toState(response.state) };
  } catch (error) {
    // Full PhonePe answer in the server log (Render → Logs)
    console.error('PhonePe refund failed:', JSON.stringify({
      merchantOrderId,
      merchantRefundId,
      amountPaise: Math.round(amount * 100),
      env: process.env.PHONEPE_ENV || 'SANDBOX (not set)',
      httpStatus: error?.httpStatusCode,
      code: error?.code,
      data: error?.data,
      message: error?.message,
    }));

    if (!/authori[sz]/i.test(errorText(error))) throw new HttpError(502, `PhonePe: ${errorText(error)}`);

    // "Authorization failed": the same login reads this payment's status?
    // Yes = keys are fine, PhonePe does not allow refunds on the account.
    // No = the keys / environment on the server do not match this payment.
    let hint;
    try {
      const order = await client.getOrderStatus(merchantOrderId);
      hint = `the same PhonePe keys can read this payment (status ${order?.state || 'known'}), so PhonePe is not allowing refunds on this account yet — ask PhonePe to enable the Refund API (PG Checkout V2) for your Merchant ID, and finish any pending KYC.`;
    } catch (statusError) {
      console.error('PhonePe order status check failed too:', errorText(statusError));
      hint = `the PhonePe keys on the server cannot read this payment either (${errorText(statusError)}). Check PHONEPE_CLIENT_ID / SECRET / VERSION and PHONEPE_ENV (PRODUCTION for live keys) on Render, and that this payment was made with those keys.`;
    }
    throw new HttpError(502, `PhonePe: ${errorText(error)} — ${hint}`);
  }
}

async function refundStatus(merchantRefundId) {
  const { client } = load();
  try {
    const response = await client.getRefundStatus(merchantRefundId);
    const detail = (response.paymentDetails || []).slice(-1)[0];
    return {
      state: toState(response.state),
      phonepeRefundId: detail?.transactionId || null,
      error: detail?.errorCode || detail?.detailedErrorCode || null,
    };
  } catch (error) {
    throw new HttpError(502, `PhonePe: ${errorText(error)}`);
  }
}

module.exports = { startRefund, refundStatus };
