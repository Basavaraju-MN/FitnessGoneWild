import { lazy, Suspense, useMemo } from 'react';

// Jodit (MIT) is large, so it loads only when a trip form opens
const JoditEditor = lazy(() => import('jodit-react'));

// Full toolbar (description, itinerary) — like a word processor
const FULL = [
  'bold', 'italic', 'underline', 'strikethrough', '|',
  'copyformat', 'eraser', '|',
  'find', '|',
  'cut', 'copy', 'paste', 'selectall', '|',
  'undo', 'redo', '|',
  'ol', 'ul', 'outdent', 'indent', '|',
  'left', 'center', 'right', 'justify', '|',
  'link', 'table', 'hr', 'symbols', '|',
  'paragraph', 'fontsize', 'brush', '|',
  'source', 'fullsize',
];

// Short text (trek card blurb): just text styling
const SIMPLE = ['bold', 'italic', 'underline', 'strikethrough', '|', 'brush', 'eraser', '|', 'link', '|', 'undo', 'redo'];

// Old trips were plain text: keep their line breaks when first opened
const toHtml = (value) => {
  const text = String(value || '');
  if (!text || /<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split(/\n{2,}/).map((part) => `<p>${part.replace(/\n/g, '<br>')}</p>`).join('');
};

// Empty editor ("<p><br></p>") is saved as empty
const clean = (html) => (String(html || '').replace(/<[^>]*>|&nbsp;|\s/g, '') ? html : '');

/**
 * Rich text box. Saves HTML; the website shows it with the same formatting.
 * simple: small toolbar for short text.
 */
export default function RichTextEditor({ value, onChange, placeholder, simple = false, height = 320 }) {
  const dark = document.documentElement.dataset.theme === 'dark';
  const config = useMemo(() => ({
    readonly: false,
    theme: dark ? 'dark' : 'default',
    placeholder: placeholder || 'Start typing…',
    height: simple ? 140 : height,
    minHeight: simple ? 110 : 200,
    toolbarAdaptive: false,
    toolbarSticky: false,
    buttons: simple ? SIMPLE : FULL,
    showCharsCounter: simple,
    showWordsCounter: !simple,
    showXPathInStatusbar: false,
    // Pasting from Word / Google Docs keeps bold, lists, colours
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_clear_html',
    enter: 'p',
    uploader: { insertImageAsBase64URI: false },
    link: { noFollowCheckbox: false, openInNewTabCheckbox: true },
    style: { fontFamily: 'Noto Sans, system-ui, sans-serif', fontSize: '14px' },
  }), [placeholder, simple, height, dark]);

  const start = useMemo(() => toHtml(value), [value]);

  return (
    <div className="rich-editor">
      <Suspense fallback={<div className="rich-editor-loading" style={{ height: simple ? 140 : height }}>Loading editor…</div>}>
        <JoditEditor
          value={start}
          config={config}
          // onBlur (not onChange) keeps the cursor steady while typing
          onBlur={(html) => onChange(clean(html))}
        />
      </Suspense>
    </div>
  );
}

// Plain text of saved HTML (counts, cards, search)
export const plainText = (html) => {
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
};
