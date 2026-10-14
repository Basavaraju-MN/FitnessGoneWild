import DOMPurify from 'dompurify';

// Trip texts are written in the admin's rich text editor and saved as HTML.
// Shown here with the same bold, colours, lists, tables… (cleaned again in
// the browser). Older trips saved as plain text keep their line breaks.
const looksLikeHtml = (value) => /<[a-z][\s\S]*>/i.test(value);

const escape = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const plainToHtml = (text) =>
  text.split(/\n{2,}/).map((part) => `<p>${escape(part).replace(/\n/g, '<br>')}</p>`).join('');

// Links from the editor open in a new tab safely
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export default function RichText({ html, className = '', as: Tag = 'div' }) {
  const value = String(html || '').trim();
  if (!value) return null;

  const safe = DOMPurify.sanitize(looksLikeHtml(value) ? value : plainToHtml(value), {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
  });

  return <Tag className={`rich-text ${className}`.trim()} dangerouslySetInnerHTML={{ __html: safe }} />;
}
