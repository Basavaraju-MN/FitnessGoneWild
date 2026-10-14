// Cleans rich text (HTML from the trip editor) before it is saved:
// keeps formatting, drops scripts, event handlers and unknown tags.
const sanitizeHtml = require('sanitize-html');

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i];

const OPTIONS = {
  allowedTags: [
    'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'sub', 'sup',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'hr',
    'ul', 'ol', 'li', 'a',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['style'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedStyles: {
    '*': {
      color: COLOR,
      'background-color': COLOR,
      'text-align': [/^(left|right|center|justify)$/],
      'font-size': [/^\d+(\.\d+)?(px|em|rem|%)$/],
      'font-weight': [/^(bold|normal|[1-9]00)$/],
      'font-style': [/^(italic|normal)$/],
      'text-decoration': [/^[a-z\s-]+$/],
      'padding-left': [/^\d+(\.\d+)?(px|em)$/],
      'margin-left': [/^\d+(\.\d+)?(px|em)$/],
      width: [/^\d+(\.\d+)?(px|%)$/],
    },
  },
  transformTags: {
    // Links open in a new tab safely
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, rel: 'noopener noreferrer', ...(attribs.target ? { target: '_blank' } : {}) },
    }),
  },
};

// Empty editor content ("<p><br></p>") becomes null
function cleanRichText(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const html = sanitizeHtml(String(value), OPTIONS).trim();
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;|\s/g, '');
  return text ? html : null;
}

// Text only (length checks)
const plainText = (value) =>
  sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

module.exports = { cleanRichText, plainText };
