
const crypto = require('crypto');

const { generatePaymentReceiptPdf, } = require('../utils/paymentReceipt');
const paymentDbOps = require('../db/paymentDbops');
const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');
const brochureComponent = require('../components/broucher/broucher')
const { generatePaymentReceiptFile, } = require('../utils/paymentReceipt');

exports.getTrekCategories = async (req, res) => {
  try {
    const result = await component.getTrekCategories();
    return res.status(200).json({
      success: true,
      message: 'Trek categories fetched successfully',
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching trek categories',
    });
  }
};

exports.getTrekDetails = async (req, res) => {
  const categoryId = req.query.category_id;
  try {
    const result = await component.getTrekDetails(categoryId);
    return res.status(200).json({
      success: true,
      message: 'Trek details fetched successfully',
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching trek details',
    });
  }
};

exports.getFeaturedTrips = async (req, res) => {
  try {
    const result = await component.getFeaturedTrips();
    return res.status(200).json({
      success: true,
      message: 'Featured trips fetched successfully',
      data: result.data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching featured trips',
    });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const result = await component.getReviews();
    return res.status(200).json({
      success: true,
      message: 'Reviews fetched successfully',
      data: result.data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
    });
  }
};

exports.getWhyUs = async (req, res) => {
  try {
    const result = await component.getWhyUs();
    return res.status(200).json({
      success: true,
      message: 'Why us items fetched successfully',
      data: result.data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching why us items',
    });
  }
};

exports.getFaq = async (req, res) => {
  try {
    const result = await component.getFaq();
    return res.status(200).json({
      success: true,
      message: 'FAQ items fetched successfully',
      data: result.data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching FAQ items',
    });
  }
};

exports.createTripInterest = async (req, res) => {
  const { trip_id, type = 'interested', source = 'website' } = req.body || {};

  try {
    const result = await component.createTripInterest({ trip_id, type, source });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Error saving trip interest',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Trip interest saved successfully',
      data: result.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error saving trip interest',
    });
  }
};

exports.downloadBroucher = async (req, res) => {
  const { trip_id, name, phone, email, city } = req.body;
  try {
    const result = await brochureComponent.getBrochure({
      trip_id,
      name,
      phone,
      email,
      city,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }

    const brochure = result.data;

    res.setHeader(
      'Content-Type',
      brochure.mime_type || 'application/pdf'
    );

    res.setHeader(
      'Content-Length',
      brochure.file_data.length
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${brochure.file_name}"`
    );

    return res.send(brochure.file_data);

  } catch (error) {
    console.error('getBrochure error:', error);

    return res.status(500).json({
      success: false,
      message: 'Error fetching brochure',
    });
  }
};

exports.createPhonePePayment = async (req, res) => {
  try {
    const {
      amount,
      customerName,
      customerEmail,
      customerMobile,
      customerPhone,
      trekName,
      trekDate,
      pickupLocation,
      transportation,
      transportationAmount,
      withoutTransportTickets,
      withoutTransportPrice,
      withoutTransportAmount,
      withTransportTickets,
      withTransportPrice,
      withTransportAmount,
      subtotal,
      gst,
      totalAmount,
      user_id,
      preferred_payment_method,
    } = req.body;

    // Validate payment amount
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount is required',
      });
    }

    // Create PhonePe payment
    const result = await phonepeComponent.createPayment({
      amount: Number(amount),

      bookingDetails: {
        customerName,
        customerEmail,

        // Save customer mobile number
        customerPhone: customerPhone || customerMobile || '',

        trekName,
        trekDate,
        pickupLocation,

        transportation,
        transportationAmount,

        withoutTransportTickets,
        withoutTransportPrice,
        withoutTransportAmount,

        withTransportTickets,
        withTransportPrice,
        withTransportAmount,

        subtotal,
        gst,
        totalAmount,

        user_id,
        preferred_payment_method,
      },
    });

    // Return successful payment response
    return res.status(200).json({
      success: true,
      message: 'PhonePe payment created successfully',
      data: result,
    });

  } catch (error) {
    // Log complete PhonePe error in backend
    console.error(
      '========== PHONEPE CREATE PAYMENT ERROR =========='
    );

    console.error('Message:', error?.message);
    console.error('Code:', error?.code);
    console.error('Status:', error?.status);
    console.error('HTTP Status:', error?.httpStatusCode);
    console.error('Tracking ID:', error?.trackingId);
    console.error('Response:', error?.response?.data);
    console.error('Full Error:', error);
    console.error('Stack:', error?.stack);

    console.error(
      '=================================================='
    );

    // PhonePe client not found
    if (
      error?.code === 'OIM007' ||
      error?.httpStatusCode === 404
    ) {
      return res.status(502).json({
        success: false,
        message:
          'PhonePe could not find the configured client. Verify the PhonePe Client ID and environment.',
      });
    }

    // PhonePe authentication failure
    if (
      error?.httpStatusCode === 401 ||
      error?.code === '401'
    ) {
      return res.status(502).json({
        success: false,
        message:
          'PhonePe rejected the configured credentials. Verify the Client ID, Client Secret, Client Version, and environment.',
      });
    }

    // Other payment errors
    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to create PhonePe payment. Please try again.',
    });
  }
};

exports.checkPhonePePaymentStatus = async (req, res) => {
  try {
    const { merchantOrderId } = req.params;
    const result = await phonepeComponent.checkPaymentStatus(merchantOrderId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('PhonePe Status Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to check PhonePe payment' });
  }
};

exports.phonePeWebhook = async (req, res) => {
  try {
    const authorization = req.headers.authorization || '';
    const rawBody = req.rawBody || '';
    const result = await phonepeComponent.processWebhook({ authorization, rawBody });
    return res.status(200).json({ success: true, message: 'Webhook processed successfully', data: result });
  } catch (error) {
    console.error('PhonePe Webhook Error:', error);
    return res.status(401).json({ success: false, message: error.message || 'Invalid PhonePe webhook' });
  }
};

exports.paymentSuccess = async (req, res) => {
  try {
    const { merchantOrderId } = req.body;

    if (!merchantOrderId) {
      return res.status(400).json({
        success: false,
        message: 'merchantOrderId is required',
      });
    }

    // 1. Get the transaction from MySQL
    const transaction =
      await paymentDbOps.getTransactionByOrderId(
        merchantOrderId
      );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Payment transaction not found',
      });
    }

    // 2. Get saved booking details
    let bookingDetails =
      transaction.booking_details ||
      transaction.bookingDetails ||
      {};

    if (typeof bookingDetails === 'string') {
      try {
        bookingDetails = JSON.parse(bookingDetails);
      } catch (error) {
        console.error(
          'Error parsing booking details:',
          error
        );

        bookingDetails = {};
      }
    }

    bookingDetails = bookingDetails || {};

    // 3. Verify payment directly with PhonePe
    const paymentResponse =
      await phonepeComponent.checkPaymentStatus(
        merchantOrderId
      );

    if (paymentResponse.status !== 'SUCCESS') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not successful',
        paymentStatus: paymentResponse.status,
      });
    }

    const phonepeData =
      paymentResponse.phonepeResponse || {};

    // 4. Get customer details
    const customerName =
      bookingDetails.customerName ||
      bookingDetails.name ||
      '';

    const customerEmail =
      bookingDetails.customerEmail ||
      bookingDetails.email ||
      '';

const customerPhone =
  bookingDetails.customerMobile ||
  bookingDetails.customerPhone ||
  bookingDetails.mobileNumber ||
  bookingDetails.mobile ||
  bookingDetails.phoneNumber ||
  bookingDetails.phone ||
  '';

    // 5. Get selected trek details
    const trekName =
      bookingDetails.trekName ||
      bookingDetails.tripName ||
      '';

    const trekDate =
      bookingDetails.trekDate ||
      bookingDetails.selectedTrekDate ||
      bookingDetails.selectedDate ||
      bookingDetails.bookingDate ||
      '';

    const pickupLocation =
      bookingDetails.pickupLocation ||
      bookingDetails.selectedPickupLocation ||
      bookingDetails.boardingPoint ||
      '';

    // 6. Get ticket quantities
    const withoutTransportTickets = Number(
      bookingDetails.withoutTransportTickets || 0
    );

    const withTransportTickets = Number(
      bookingDetails.withTransportTickets || 0
    );

    const tickets =
      withoutTransportTickets + withTransportTickets;

    // 7. Get stored prices and amounts
    const subtotal = Number(
      bookingDetails.subtotal || 0
    );

    const gst = Number(
      bookingDetails.gst || 0
    );

    const transportationAmount = Number(
      bookingDetails.transportationAmount || 0
    );

    let withoutTransportPrice = Number(
      bookingDetails.withoutTransportPrice || 0
    );

    let withTransportPrice = Number(
      bookingDetails.withTransportPrice || 0
    );

    let withoutTransportAmount = Number(
      bookingDetails.withoutTransportAmount || 0
    );

    let withTransportAmount = Number(
      bookingDetails.withTransportAmount || 0
    );

    // 8. Calculate missing ticket amounts
    //
    // The subtotal is assumed to include ticket charges
    // and transportation charges.
    //
    // Remove transportation from subtotal to get the
    // base ticket subtotal.
    const ticketSubtotal = Math.max(
      0,
      subtotal - transportationAmount
    );

    const totalTicketQuantity =
      withoutTransportTickets + withTransportTickets;

    // If both row amounts are missing, distribute the
    // base ticket subtotal based on ticket quantities.
    if (
      withoutTransportAmount <= 0 &&
      withTransportAmount <= 0
    ) {
      if (totalTicketQuantity > 0) {
        if (
          withoutTransportTickets > 0 &&
          withTransportTickets > 0
        ) {
          withoutTransportAmount =
            (ticketSubtotal *
              withoutTransportTickets) /
            totalTicketQuantity;

          withTransportAmount =
            (ticketSubtotal *
              withTransportTickets) /
            totalTicketQuantity;

          // Add transportation to the with-transport row.
          withTransportAmount += transportationAmount;
        } else if (withoutTransportTickets > 0) {
          withoutTransportAmount = ticketSubtotal;
        } else if (withTransportTickets > 0) {
          withTransportAmount =
            ticketSubtotal + transportationAmount;
        }
      }
    } else {
      // If one row amount is already stored, preserve it
      // and calculate the missing row from the remainder.
      if (
        withoutTransportTickets > 0 &&
        withoutTransportAmount <= 0
      ) {
        withoutTransportAmount = Math.max(
          0,
          subtotal -
            transportationAmount -
            Math.max(
              0,
              withTransportAmount - transportationAmount
            )
        );
      }

      if (
        withTransportTickets > 0 &&
        withTransportAmount <= 0
      ) {
        withTransportAmount = Math.max(
          0,
          subtotal - withoutTransportAmount
        );
      }
    }

    // 9. Calculate per-ticket prices if missing
    if (
      withoutTransportTickets > 0 &&
      withoutTransportPrice <= 0
    ) {
      withoutTransportPrice =
        withoutTransportAmount /
        withoutTransportTickets;
    }

    if (
      withTransportTickets > 0 &&
      withTransportPrice <= 0
    ) {
      withTransportPrice =
        withTransportAmount /
        withTransportTickets;
    }

    // 10. Determine transportation selection
    const transportation =
      bookingDetails.transportation ||
      (withTransportTickets > 0
        ? 'With Transportation'
        : 'Without Transportation');

    // 11. Get actual payment amount from transaction.
    // MySQL transaction amount is stored in paise.
    const paidAmount =
      Number(transaction.amount || 0) / 100;

    // 12. Generate receipt number
    const receiptNumber =
      `FGW-${Date.now()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

    // 13. Build final receipt data
    const receiptData = {
      receiptNumber,
      merchantOrderId,

      companyName: 'The Fitness Gone Wild',

      customerName,
      customerEmail,
      customerPhone,

      trekName,
      trekDate,
      pickupLocation,

      tickets,
      transportation,

      transportationAmount:
        subtotal.toFixed(2),

      withoutTransportTickets,
      withoutTransportPrice:
        withoutTransportPrice.toFixed(2),
      withoutTransportAmount:
        withoutTransportAmount.toFixed(2),

      withTransportTickets,
      withTransportPrice:
        withTransportPrice.toFixed(2),
      withTransportAmount:
        withTransportAmount.toFixed(2),

      subtotal: subtotal.toFixed(2),
      gst: gst.toFixed(2),
      totalAmount: paidAmount.toFixed(2),

      paymentStatus: 'SUCCESS',

      paymentMethod:
        phonepeData.paymentInstrument?.type ||
        'PhonePe',

      paymentDate: new Date().toLocaleString(
        'en-IN',
        {
          timeZone: 'Asia/Kolkata',
        }
      ),
    };

    // Debug: verify all fields before generating PDF
    console.log(
      'Final receipt data:',
      JSON.stringify(receiptData, null, 2)
    );

    // 14. Generate PDF
    const pdfBuffer =
      await generatePaymentReceiptPdf(receiptData);

    // 15. Return PDF to frontend
    return res.status(200).json({
      success: true,
      message: 'Payment successful',
      receiptNumber,
      merchantOrderId,

      receiptPdfBase64:
        pdfBuffer.toString('base64'),

      receiptFilename:
        `Payment-Receipt-${receiptNumber}.pdf`,
    });
  } catch (error) {
    console.error(
      'Payment success error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Unable to process payment receipt',
    });
  }
};