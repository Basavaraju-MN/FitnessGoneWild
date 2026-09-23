const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function verifyMailConnection() {
  try {
    await transporter.verify();

    console.log('Gmail mail transporter is ready');

    return true;
  } catch (error) {
    console.error(
      'Gmail transporter verification failed:',
      error.message
    );

    return false;
  }
}

async function sendPaymentReceiptMail({
  customerEmail,
  customerName,
  receiptNumber,
  htmlFilePath,
  htmlFileName,
}) {
  const mailOptions = {
    from: process.env.GMAIL_USER,

    to: customerEmail,

    subject:
      `Payment Receipt - ${receiptNumber}`,

    html: `
      <p>Dear ${customerName || 'Customer'},</p>

      <p>
        Thank you for your booking with
        <strong>Fitness Gone Wild</strong>.
      </p>

      <p>
        Your payment was successful.
      </p>

      <p>
        Please find your payment receipt attached.
      </p>

      <p>
        Regards,<br>
        Fitness Gone Wild
      </p>
    `,

    attachments: [
      {
        filename: htmlFileName,
        path: htmlFilePath,
        contentType: 'text/html',
      },
    ],
  };

  return await transporter.sendMail(mailOptions);
}
module.exports = {
  transporter,
  verifyMailConnection,
  sendPaymentReceiptMail,
};