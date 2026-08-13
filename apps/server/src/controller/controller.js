const component = require('../components/trekDetails');

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
