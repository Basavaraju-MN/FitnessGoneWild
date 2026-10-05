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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function imageToDataUrl(imagePath) {
  if (!fs.existsSync(imagePath)) {
    return '';
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');

  return `data:image/png;base64,${base64}`;
}

function replaceTemplateValues(template, data) {
  return template.replace(
    /{{\s*([^{}]+?)\s*}}/g,
    (_, key) => escapeHtml(data[key.trim()] ?? '')
  );
}

async function generatePaymentReceiptHtml(data) {
  const template = await fs.promises.readFile(
    TEMPLATE_PATH,
    'utf8'
  );

  const headerLogoDataUrl = imageToDataUrl(
    HEADER_LOGO_PATH
  );

  const receiptData = {
    ...data,
    headerLogoDataUrl,
  };

  return replaceTemplateValues(
    template,
    receiptData
  );
}

module.exports = {
  generatePaymentReceiptHtml,
};
