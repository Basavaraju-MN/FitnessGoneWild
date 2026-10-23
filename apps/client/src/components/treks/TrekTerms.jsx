import { useState } from 'react';
import RichText from '../common/RichText';

const WHATSAPP = '918762350551';

// Plain words in a section, for "3 points" next to a closed heading
const countItems = (html) => (String(html || '').match(/<li[\s>]/gi) || []).length;

/**
 * Terms & Policies tab: key points as chips, then one fold-out section per
 * heading written in the admin (the first one open).
 * terms: { highlights: [text], sections: [{ id, title, body }], updated_at }
 */
export default function TrekTerms({ trek, terms }) {
  const [open, setOpen] = useState(() => new Set(terms.sections[0] ? [terms.sections[0].id] : []));

  const toggle = (id) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const ask = () => {
    const message = `Hi, I have a question about the terms for ${trek.name}.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="details-tab-content trek-terms">
      <div className="terms-top">
        <h2>Terms &amp; Conditions</h2>
        {terms.highlights.length > 0 && (
          <ul className="terms-chips" aria-label="Key points">
            {terms.highlights.map((point, i) => (
              <li key={point} className={`terms-chip tone-${i % 3}`}>{point}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="terms-accordion">
        {terms.sections.map((section, i) => {
          const isOpen = open.has(section.id);
          const items = countItems(section.body);
          const panelId = `terms-panel-${section.id}`;
          return (
            <div key={section.id} className={`terms-item ${isOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="terms-head"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(section.id)}
              >
                <span className="terms-num">{i + 1}</span>
                <span className="terms-title">{section.title}</span>
                {!isOpen && items > 1 && <span className="terms-count">{items} points</span>}
                <svg className="terms-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <div id={panelId} className="terms-body">
                  <RichText html={section.body} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="terms-help">
        <span>Questions about these terms? We reply on WhatsApp.</span>
        <button type="button" onClick={ask}>Ask on WhatsApp</button>
      </div>
    </div>
  );
}
