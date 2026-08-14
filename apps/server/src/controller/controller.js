
const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');

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


exports.getTrekDetails = async (req, res) => {
    try {
        const result = await component.getTrekDetails();
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

