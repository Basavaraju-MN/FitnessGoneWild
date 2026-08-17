
const phonepeComponent = require('../components/payment/phonepeComponent');
const component = require('../components/trekDetails');
const googleAuthentication = require('../components/login/googleAuthentication');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

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

exports.googleAuthentication = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required',
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
    }

    const {
      sub,
      email,
      name,
      picture,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(401).json({
        success: false,
        message: 'Google email is not verified',
      });
    }

    console.log('Google user:', {
      googleId: sub,
      email,
      name,
    });

    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        googleId: sub,
        email,
        name,
        picture,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);

    return res.status(401).json({
      success: false,
      message: 'Google authentication failed',
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

