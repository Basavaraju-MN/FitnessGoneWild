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

// ticketLines: [{ label, quantity, price, amount }] (prices as "1999.00")
function ticketRowsHtml(lines = []) {
  return lines
    .map((line) => `<tr>
          <td>${escapeHtml(line.label)}</td>
          <td class="right">${escapeHtml(line.quantity)}</td>
          <td class="right">₹${escapeHtml(line.price)}</td>
          <td class="right">₹${escapeHtml(line.amount)}</td>
        </tr>`)
    .join('\n        ');
}

// Coupon applied: "Coupon FAMILY500  − ₹500.00" (taken off the total with GST)
function couponRowHtml({ couponCode, discount }) {
  if (!couponCode || !(Number(discount) > 0)) return '';
  return `<tr>
        <td>Coupon ${escapeHtml(couponCode)}</td>
        <td class="value">− ₹${escapeHtml(Number(discount).toFixed(2))}</td>
      </tr>`;
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

  // Ticket rows go in after the {{values}}, so a ticket name is never read as one
  return replaceTemplateValues(
    template,
    receiptData
  )
    .replace(/<!-- TICKET_ROWS:[^>]*-->/, () => ticketRowsHtml(data.ticketLines))
    .replace(/<!-- COUPON_ROW:[^>]*-->/, () => couponRowHtml(data));
}

module.exports = {
  generatePaymentReceiptHtml,
};
