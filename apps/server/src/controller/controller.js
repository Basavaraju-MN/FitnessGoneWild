
const crypto = require('crypto');

const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');
const brochureComponent = require('../components/broucher/broucher')
const {  generatePaymentReceiptFile,} = require('../utils/paymentReceipt');

const {
  sendPaymentReceiptMail,
} = require('../utils/mail');

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
        const { amount } = req.body;
        const result = await phonepeComponent.createPayment({ amount});
        return res.status(200).json({ success: true, message: 'PhonePe payment created successfully', data: result });
    } catch (error) {
        console.error('Create PhonePe Payment Error:', error);
        if (error?.httpStatusCode === 401 || error?.code === '401') {
            return res.status(502).json({
                success: false,
                message: 'PhonePe rejected the configured credentials. Verify the client ID, client secret, client version, and environment in the server .env file.',
            });
        }
        return res.status(500).json({ success: false, message: error.message || 'Unable to create PhonePe payment' });
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
    const {
      merchantOrderId,
      customerName,
      customerEmail,
      customerMobile,
      trekName,
      trekDate,
      pickupLocation,

      transportTickets,
      transportPrice,
      transportAmount,

      withoutTransportTickets,
      withoutTransportPrice,
      withoutTransportAmount,
    } = req.body;

    if (!merchantOrderId) {
      return res.status(400).json({
        success: false,
        message:
          'merchantOrderId is required',
      });
    }
    const paymentResult =
      await phonepeComponent.checkPaymentStatus(
        merchantOrderId
      );
    const paymentStatus =
      paymentResult?.status ||
      paymentResult?.state ||
      paymentResult?.data?.status ||
      paymentResult?.data?.state;

    if (
      paymentStatus !== 'SUCCESS' &&
      paymentStatus !== 'COMPLETED'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Payment is not successful',
        status: paymentStatus,
      });
    }
    const receiptNumber =
      `FGW-${Date.now()}-${crypto
        .randomBytes(3)
        .toString('hex')
        .toUpperCase()}`;

    const amountInPaise = Number(
      paymentResult
        ?.phonepeResponse
        ?.amount || 0
    );

    const totalAmount = Number(
      (amountInPaise / 100).toFixed(2)
    );

    // GST 5% included in total
    const gst = Number(
      (totalAmount * 5 / 105).toFixed(2)
    );

    const subtotal = Number(
      (totalAmount - gst).toFixed(2)
    );

    
    const transactionId =
      paymentResult
        ?.phonepeResponse
        ?.orderId ||
      merchantOrderId;

    const receiptData = {
      companyName:
        'Fitness Gone Wild',

      companyAddress:
        process.env.COMPANY_ADDRESS ||
        'Bengaluru, Karnataka, India',

      companyEmail:
        process.env.GMAIL_USER || '',

      companyPhone:
        process.env.COMPANY_PHONE || '',

      receiptNumber,

      paymentDate:
        new Date().toLocaleString(
          'en-IN',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        ),

      paymentStatus:
        'SUCCESS',

      merchantOrderId,

      transactionId,

      paymentMethod:
        'PhonePe',

      customerName:
        customerName || '',

      customerEmail:
        customerEmail || '',

      customerMobile:
        customerMobile || '',

      trekName:
        trekName || '',

      trekDate:
        trekDate || '',

      pickupLocation:
        pickupLocation || '',

      transportTickets:
        transportTickets || 0,

      transportPrice:
        transportPrice || 0,

      transportAmount:
        transportAmount || 0,

      withoutTransportTickets:
        withoutTransportTickets || 0,

      withoutTransportPrice:
        withoutTransportPrice || 0,

      withoutTransportAmount:
        withoutTransportAmount || 0,

      subtotal,

      gst,

      totalAmount,
    };

const receiptFile =
  await generatePaymentReceiptFile(receiptData);

const mailResult = await sendPaymentReceiptMail({
  customerEmail,
  customerName,
  receiptNumber,
  htmlFilePath: receiptFile.filePath,
  htmlFileName: receiptFile.fileName,
});


    return res.status(200).json({
      success: true,

      message:
        'Payment successful and receipt email sent',

      receiptNumber,
    });

  } catch (error) {

    console.error(
      'PAYMENT SUCCESS ERROR'
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to process payment success',
    });
  }
};