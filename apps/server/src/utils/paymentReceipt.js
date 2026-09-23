const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(
  __dirname,
  'templates',
  'payment-receipt.html'
);

const HEADER_LOGO_PATH = path.join(
  __dirname,
  'templates',
  'fitness-gone-wild-logo.png'
);

/**
 * Escape HTML values
 */
function escapeHtml(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replace {{key}} placeholders
 */
function replaceTemplateValues(template, data) {
  return template.replace(
    /{{\s*([\w]+)\s*}}/g,
    (_, key) => escapeHtml(data[key])
  );
}

/**
 * Convert image to Base64
 */
function imageToDataUrl(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Header logo image not found: ${filePath}`
    );
  }

  const imageBuffer = fs.readFileSync(filePath);

  return `data:image/png;base64,${imageBuffer.toString(
    'base64'
  )}`;
}

/**
 * Generate populated HTML
 */
async function generatePaymentReceiptHtml(data) {
  console.log('======================================');
  console.log('Reading payment receipt HTML template');

  const template = await fs.promises.readFile(
    TEMPLATE_PATH,
    'utf8'
  );

  // Logo
  const headerLogoDataUrl =
    imageToDataUrl(HEADER_LOGO_PATH);

  // Transportation
  const hasTransportation =
    data.transportation === true ||
    data.transportation === 1 ||
    data.transportation === '1' ||
    String(data.transportation).toLowerCase() === 'with' ||
    String(data.transportation).toLowerCase() === 'true' ||
    String(data.transportation).toLowerCase() === 'yes';

  // Pickup location
  const pickupLocation =
    data.pickupLocation ??
    data.pickup_location ??
    data.pickupPoint ??
    data.pickup_point ??
    '-';

  // Transportation amount
  const transportationAmount = Number(
    data.transportationAmount ??
    data.transportation_amount ??
    data.transportAmount ??
    data.transport_amount ??
    0
  );

  // Without transportation
  const withoutTransportTickets = Number(
    data.withoutTransportTickets ??
    data.without_transport_tickets ??
    data.withoutTransportationTickets ??
    data.without_transportation_tickets ??
    0
  );

  const withoutTransportPrice = Number(
    data.withoutTransportPrice ??
    data.without_transport_price ??
    data.withoutTransportationPrice ??
    data.without_transportation_price ??
    0
  );

  const withoutTransportAmount = Number(
    data.withoutTransportAmount ??
    data.without_transport_amount ??
    data.withoutTransportationAmount ??
    data.without_transportation_amount ??
    0
  );

  // With transportation
  const withTransportTickets = Number(
    data.withTransportTickets ??
    data.with_transport_tickets ??
    data.withTransportationTickets ??
    data.with_transportation_tickets ??
    data.transportTickets ??
    data.transport_tickets ??
    0
  );

  const withTransportPrice = Number(
    data.withTransportPrice ??
    data.with_transport_price ??
    data.withTransportationPrice ??
    data.with_transportation_price ??
    data.transportPrice ??
    data.transport_price ??
    0
  );

  const withTransportAmount = Number(
    data.withTransportAmount ??
    data.with_transport_amount ??
    data.withTransportationAmount ??
    data.with_transportation_amount ??
    data.transportAmount ??
    data.transport_amount ??
    transportationAmount
  );

  const templateData = {
    ...data,

    headerLogoDataUrl,

    pickupLocation,
    transportationAmount,

    withoutTransportTickets,
    withoutTransportPrice,
    withoutTransportAmount,

    withTransportTickets,
    withTransportPrice,
    withTransportAmount,

    transportation: hasTransportation
      ? 'With Transportation'
      : 'Without Transportation',
  };

  const html = replaceTemplateValues(
    template,
    templateData
  );

  console.log(
    'Payment receipt HTML populated successfully'
  );

  return html;
}

/**
 * Generate HTML file
 */
async function generatePaymentReceiptFile(data) {
  console.log('======================================');
  console.log('Generating payment receipt HTML file');

  const html =
    await generatePaymentReceiptHtml(data);

  const receiptNumber =
    data.receiptNumber || `receipt-${Date.now()}`;

  const fileName =
    `Payment-Receipt-${receiptNumber}.html`;

  const outputDirectory = path.join(
    __dirname,
    'generated-receipts'
  );

  // Create directory if it doesn't exist
  await fs.promises.mkdir(
    outputDirectory,
    {
      recursive: true,
    }
  );

  const filePath = path.join(
    outputDirectory,
    fileName
  );

  await fs.promises.writeFile(
    filePath,
    html,
    'utf8'
  );

  console.log(
    'Payment receipt HTML generated successfully'
  );

  console.log(
    'HTML file:',
    filePath
  );

  return {
    filePath,
    fileName,
    html,
  };
}

module.exports = {
  generatePaymentReceiptHtml,
  generatePaymentReceiptFile,
};