const fs = require('fs');
const path = require('path');
const wkhtmltopdf = require('wkhtmltopdf');

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

const WKHTMLTOPDF_PATH =
  process.env.WKHTMLTOPDF_PATH ||
  'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe';

wkhtmltopdf.command = WKHTMLTOPDF_PATH;

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

async function generatePaymentReceiptPdf(data) {
  const html = await generatePaymentReceiptHtml(data);

  return new Promise((resolve, reject) => {
    const chunks = [];

    const pdfStream = wkhtmltopdf(
      html,
      {
        pageSize: 'A4',
        orientation: 'Portrait',
        marginTop: '10mm',
        marginBottom: '10mm',
        marginLeft: '10mm',
        marginRight: '10mm',
        printMediaType: true,
        background: true,
        enableLocalFileAccess: true,
      }
    );

    pdfStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    pdfStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    pdfStream.on('error', (error) => {
      reject(error);
    });
  });
}

module.exports = {
  generatePaymentReceiptHtml,
  generatePaymentReceiptPdf,
};