
const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');
const brochureComponent = require('../components/broucher/broucher')

exports.processPhonePe = async (req, res) => {
  try {

    const action = req.params.action;

    let data = {
      ...req.body,
    };


    /*
     * Webhook needs Authorization Header
     * and original raw request body.
     */
    if (action === 'webhook') {

      data = {
        authorization:
          req.headers.authorization || '',

        rawBody:
          req.rawBody || '',
      };

    }


    const result =
      await phonepeComponent.executePhonePe(
        action,
        data
      );


    return res.status(200).json({
      success: true,
      data: result,
    });


  } catch (error) {

    console.error(
      'PhonePe Controller Error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'PhonePe payment failed',
    });

  }
};

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

exports.downloadBroucher = async (req, res) => {
  const { trip_id } = req.body;
  try {
    const result = await brochureComponent.getBrochure(trip_id);
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