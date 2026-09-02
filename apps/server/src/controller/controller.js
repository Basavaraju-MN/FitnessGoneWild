
const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');
const brochureComponent = require('../components/broucher/broucher')

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
