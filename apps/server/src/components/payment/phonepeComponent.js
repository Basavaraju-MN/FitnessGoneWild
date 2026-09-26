const { randomUUID } = require('crypto');
const { StandardCheckoutPayRequest } = require('@phonepe-pg/pg-sdk-node');

const paymentDbOps = require('../../db/paymentDbops');
const { phonePeClient } = require('../../config/config');

/**
 * Parse booking details returned from MySQL.
 * MySQL JSON columns may return an object or a JSON string.
 */
const parseBookingDetails = (transaction) => {
  let bookingDetails =
    transaction?.booking_details ||
    transaction?.bookingDetails ||
    {};

  if (typeof bookingDetails === 'string') {
    try {
      bookingDetails = JSON.parse(bookingDetails);
    } catch (error) {
      console.error('Failed to parse booking details:', error);
      bookingDetails = {};
    }
  }

  return bookingDetails &&
    typeof bookingDetails === 'object' &&
    !Array.isArray(bookingDetails)
    ? bookingDetails
    : {};
};

/**
 * Convert PhonePe state to internal payment status.
 */
const getPaymentStatus = (state) => {
  switch (String(state || '').toUpperCase()) {
    case 'COMPLETED':
      return 'SUCCESS';

    case 'FAILED':
      return 'FAILED';

    default:
      return 'PROCESSING';
  }
};

/**
 * CREATE PAYMENT
 *
 * Saves the booking details in the transaction table
 * before redirecting the customer to PhonePe.
 */
exports.createPayment = async ({
  amount,
  bookingDetails,
}) => {
  if (
    amount === undefined ||
    amount === null ||
    amount === ''
  ) {
    throw new Error('Amount is required');
  }

  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error('Invalid payment amount');
  }

  if (
    !bookingDetails ||
    typeof bookingDetails !== 'object' ||
    Array.isArray(bookingDetails)
  ) {
    throw new Error('Valid booking details are required');
  }

  const amountInPaise = Math.round(numericAmount * 100);

  const merchantOrderId = `FGW_${Date.now()}_${randomUUID()
    .replace(/-/g, '')
    .substring(0, 12)}`;

  // Use your deployed frontend URL in production.
  const frontendUrl =
    process.env.FRONTEND_URL ||
    'http://localhost:5173';

  const redirectUrl =
    `${frontendUrl}/payment-result?merchantOrderId=${
      encodeURIComponent(merchantOrderId)
    }`;

  // Save transaction and booking details in MySQL.
  await paymentDbOps.createTransaction(
    merchantOrderId,
    amountInPaise,
    'INR',
    redirectUrl,
    bookingDetails
  );

  // Create PhonePe checkout request.
  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(amountInPaise)
    .redirectUrl(redirectUrl)
    .build();

  const response = await phonePeClient.pay(request);

  if (!response?.redirectUrl) {
    throw new Error(
      'PhonePe checkout URL was not generated'
    );
  }

  return {
    success: true,
    merchantOrderId,
    amount: amountInPaise,
    redirectUrl: response.redirectUrl,
    status: 'PROCESSING',
  };
};

/**
 * CHECK PAYMENT STATUS
 *
 * Gets the transaction and saved booking details from MySQL,
 * verifies payment status with PhonePe, and returns both.
 */
exports.checkPaymentStatus = async (merchantOrderId) => {
  if (!merchantOrderId) {
    throw new Error('merchantOrderId is required');
  }

  // 1. Get transaction from MySQL.
  const transaction =
    await paymentDbOps.getTransactionByOrderId(
      merchantOrderId
    );

  if (!transaction) {
    throw new Error('Payment transaction not found');
  }

  // 2. Read the booking details saved during createPayment.
  const bookingDetails =
    parseBookingDetails(transaction);

  // 3. Verify payment status directly with PhonePe.
  const response =
    await phonePeClient.getOrderStatus(
      merchantOrderId
    );

  const state = response.state;
  let status = getPaymentStatus(state);

  // 4. Do not downgrade an already successful transaction.
  if (
    String(transaction.status || '').toUpperCase() ===
      'SUCCESS' &&
    status !== 'SUCCESS'
  ) {
    status = 'SUCCESS';
  }

  // 5. Update transaction status and PhonePe response details.
  await paymentDbOps.updateTransactionStatus({
    merchantOrderId,
    status,
    phonepeState: state,
    responseCode: response.responseCode,
    responseMessage: response.responseMessage,
    phonepeOrderId: response.orderId,
    transactionId: response.transactionId,
    providerReferenceId: response.providerReferenceId,
    paymentMethod: response.paymentInstrument?.type,
    paymentTimestamp: response.paymentTimestamp,
  });

  // 6. Return saved booking details along with payment status.
  return {
    merchantOrderId,
    status,
    phonepeState: state,
    phonepeResponse: response,

    // These are the original booking details saved in MySQL.
    bookingDetails,
  };
};

/**
 * PROCESS PHONEPE WEBHOOK
 *
 * Validates PhonePe callback and updates the transaction.
 */
exports.processWebhook = async ({
  authorization,
  rawBody,
}) => {
  if (!authorization) {
    throw new Error(
      'PhonePe Authorization header missing'
    );
  }

  if (!rawBody) {
    throw new Error(
      'PhonePe webhook body missing'
    );
  }

  let callback;

  try {
    callback = phonePeClient.validateCallback(
      process.env.PHONEPE_WEBHOOK_USERNAME,
      process.env.PHONEPE_WEBHOOK_PASSWORD,
      authorization,
      rawBody
    );
  } catch (error) {
    console.error(
      'PhonePe callback validation failed:',
      error
    );

    throw new Error('Invalid PhonePe webhook');
  }

  const payload = callback.payload || {};

  const merchantOrderId = payload.orderId;
  const state = payload.state;

  const webhookId =
    await paymentDbOps.insertWebhookLog({
      merchantOrderId,
      eventType: callback.type || callback.event,
      authorization,
      requestBody: JSON.parse(rawBody),
      paymentStatus: state,
      signatureValid: true,
      processingStatus: 'RECEIVED',
    });

  try {
    let status = getPaymentStatus(state);

    // Get transaction and saved booking details.
    const transaction =
      await paymentDbOps.getTransactionByOrderId(
        merchantOrderId
      );

    if (!transaction) {
      throw new Error(
        `Transaction not found: ${merchantOrderId}`
      );
    }

    // Preserve a successful transaction.
    if (
      String(transaction.status || '').toUpperCase() ===
        'SUCCESS' &&
      status !== 'SUCCESS'
    ) {
      status = 'SUCCESS';
    }

    // Update transaction with PhonePe callback data.
    await paymentDbOps.updateTransactionStatus({
      merchantOrderId,
      status,
      phonepeState: state,
      responseCode: payload.responseCode,
      responseMessage: payload.responseMessage,
      phonepeOrderId: payload.orderId,
      transactionId: payload.transactionId,
      providerReferenceId: payload.providerReferenceId,
      paymentMethod: payload.paymentInstrument?.type,
      paymentTimestamp: payload.paymentTimestamp,
    });

    await paymentDbOps.updateWebhookLog(
      webhookId,
      'PROCESSED',
      null
    );

    return {
      success: true,
      merchantOrderId,
      status,
      state,
    };
  } catch (error) {
    await paymentDbOps.updateWebhookLog(
      webhookId,
      'FAILED',
      error.message
    );

    throw error;
  }
};