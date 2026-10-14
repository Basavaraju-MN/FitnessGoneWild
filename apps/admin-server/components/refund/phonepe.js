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
    throw new HttpError(502, `PhonePe: ${errorText(error)}`);
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
