const fs = require('fs');
const { Resend } = require('resend');

const resend = new Resend(
  process.env.RESEND_API_KEY
);

async function verifyMailConnection() {
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return false;
  }

  console.log('Resend API key is configured');
  return true;
}

async function sendPaymentReceiptMail({
  customerEmail,
  customerName,
  receiptNumber,
  htmlFilePath,
  htmlFileName,
}) {
  try {
    if (!customerEmail) {
      throw new Error('Customer email is missing');
    }

    if (!fs.existsSync(htmlFilePath)) {
      throw new Error(
        `Receipt file not found: ${htmlFilePath}`
      );
    }

    const receiptBuffer =
      await fs.promises.readFile(htmlFilePath);

    const { data, error } = await resend.emails.send({
      from: 'The Fitness Gone Wild <onboarding@resend.dev>',

      to: [customerEmail],

      subject: `Payment Receipt - ${receiptNumber}`,

      html: `
        <p>Dear ${customerName || 'Customer'},</p>

        <p>
          Thank you for your booking with
          <strong>The Fitness Gone Wild</strong>.
        </p>

        <p>Your payment was successful.</p>

        <p>
          Please find your payment receipt attached.
        </p>

        <p>
          Regards,<br>
          The Fitness Gone Wild
        </p>
      `,

      attachments: [
        {
          filename: htmlFileName,
          content: receiptBuffer.toString('base64'),
        },
      ],
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(error.message);
    }

    console.log(
      'Receipt email accepted by Resend:',
      data.id
    );

    return data;

  } catch (error) {
    console.error(
      'Receipt email failed:',
      error.message
    );

    throw error;
  }
}

module.exports = {
  resend,
  verifyMailConnection,
  sendPaymentReceiptMail,
};