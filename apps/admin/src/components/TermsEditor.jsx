import { useEffect, useState } from 'react';

import { api } from '../api';
import { useToast } from './ui';
import RichTextEditor, { plainText } from './RichTextEditor';

// Headings offered as one-click starters (any heading can be typed)
const SUGGESTED = ['Cancellation & refund policy', 'Trek rules', 'Health & fitness', 'Things to carry', 'Weather & route changes', 'General terms & conditions'];
const MAX_SECTIONS = 30;

/**
 * Trek form → Terms & policies: as many sections as you like, each a
 * heading + rich text, in the order shown on the website (one fold-out row
 * each), plus optional key points shown as chips above them.
 * sections: [{ title, body }]; highlights: text, one key point per line.
 */
export default function TermsEditor({ tripId, sections, highlights, onSections, onHighlights }) {
  const toast = useToast();
  const [sources, setSources] = useState([]);
  const [copyFrom, setCopyFrom] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    api('/trip-terms-sources')
      .then(({ data }) => setSources((data || []).filter((t) => t.id !== tripId)))
      .catch(() => setSources([]));
  }, [tripId]);

  const list = sections || [];
  const setAt = (index, key, value) => onSections(list.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  const add = (title = '') => onSections([...list, { title, body: '' }]);
  const remove = (index) => onSections(list.filter((_, i) => i !== index));
  const move = (index, delta) => {
    const next = [...list];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onSections(next);
  };

  const copy = async () => {
    if (!copyFrom) return;
    if (list.length && !window.confirm('Replace the sections below with the ones from the other trek?')) return;
    setCopying(true);
    try {
      const { data } = await api(`/trips/${copyFrom}/terms`);
      onSections((data.terms_sections || []).map((s) => ({ title: s.title, body: s.body })));
      if (data.terms_highlights) onHighlights(data.terms_highlights);
      toast('Copied. Change anything for this trek, then save.');
      setCopyFrom('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCopying(false);
    }
  };

  const unused = SUGGESTED.filter((title) => !list.some((s) => s.title.trim().toLowerCase() === title.toLowerCase()));

  return (
    <div className="trip-step-grid">
      <div className="field full">
        <p className="muted" style={{ margin: 0 }}>
          Shown on the trek page in the <b>Terms &amp; Policies</b> tab, one fold-out section each, in this order.
          Leave it empty to hide the tab for this trek.
        </p>
      </div>

      {sources.length > 0 && (
        <div className="field full terms-copy">
          <label htmlFor="terms-copy">Start from another trek&apos;s terms</label>
          <div className="terms-copy-row">
            <select id="terms-copy" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} disabled={copying}>
              <option value="">Choose a trek…</option>
              {sources.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.sections} section{Number(t.sections) === 1 ? '' : 's'})</option>)}
            </select>
            <button type="button" className="btn alt" onClick={copy} disabled={!copyFrom || copying}>
              {copying ? 'Copying…' : 'Copy sections'}
            </button>
          </div>
        </div>
      )}

      <div className="field full">
        <label htmlFor="terms-points">Key points <span className="muted">(optional, one per line, up to 6)</span></label>
        <textarea
          id="terms-points"
          rows={3}
          value={highlights ?? ''}
          onChange={(e) => onHighlights(e.target.value)}
          placeholder={'Free cancellation up to 15 days before\nCarry a government photo ID'}
        />
        <small>Shown as small chips at the top of the tab.</small>
      </div>

      <div className="field full">
        <label>Sections <span className="muted">({list.length})</span></label>
        <div className="terms-list">
          {list.length === 0 && <div className="terms-empty">No sections yet. Add one below, or copy from another trek.</div>}
          {list.map((section, i) => (
            <div key={i} className="terms-section">
              <div className="terms-section-head">
                <span className="terms-num">{i + 1}</span>
                <input
                  value={section.title}
                  onChange={(e) => setAt(i, 'title', e.target.value)}
                  placeholder="Heading, e.g. Cancellation & refund policy"
                  maxLength={150}
                  aria-label={`Section ${i + 1} heading`}
                />
                <div className="pickup-actions">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down">↓</button>
                  <button type="button" className="remove" onClick={() => remove(i)} aria-label="Remove section">✕</button>
                </div>
              </div>
              <RichTextEditor
                value={section.body ?? ''}
                onChange={(html) => setAt(i, 'body', html)}
                placeholder="Write this section: lists, bold text and tables are fine"
                height={200}
              />
            </div>
          ))}
        </div>

        {list.length < MAX_SECTIONS && (
          <div className="terms-add">
            <button type="button" className="add-pickup" onClick={() => add('')}>＋ Add section</button>
            {unused.length > 0 && (
              <div className="terms-suggest">
                <span className="muted">Quick add:</span>
                {unused.map((title) => (
                  <button key={title} type="button" className="terms-chip" onClick={() => add(title)}>＋ {title}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// For the form's checks: '' when fine, else what to fix
export function termsProblem(sections) {
  const list = (sections || []).filter((s) => String(s.title || '').trim() || plainText(s.body));
  const untitled = list.findIndex((s) => !String(s.title || '').trim());
  if (untitled >= 0) return `Terms: section ${untitled + 1} needs a heading`;
  const empty = list.find((s) => !plainText(s.body));
  if (empty) return `Terms: write the text of "${empty.title}"`;
  return '';
}
