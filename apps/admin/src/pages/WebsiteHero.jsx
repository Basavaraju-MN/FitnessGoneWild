import { useEffect, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { siteUrl, SITE_URL } from '../assets';
import { Modal, PageHead, useToast } from '../components/ui';
import { CachedImg, useCachedPhoto } from '../imageCache';

const PHOTO_MAX_WIDTH = 1920;
const MAX_HEROES = 8;
const TARGET_LABELS = {
  trips: 'Treks section',
  featured: 'Trips section',
  why: 'Why us',
  reviews: 'Reviews',
  faq: 'FAQ',
  contact: 'Talk to us (contact)',
};
const EMPTY_HERO = {
  eyebrow: '',
  headline_line1: '',
  headline_line2: '',
  message: '',
  primary_label: "See this month's treks",
  primary_target: 'trips',
  secondary_label: 'Read reviews',
  secondary_target: 'reviews',
  facts: [],
  is_active: true,
};
const FACT_HINTS = [['25', 'max group size'], ['4.9', 'average rating'], ['300+', 'trips completed'], ['0', 'hidden charges']];

// Full-width background: shrink to 1920px JPEG so the home page stays fast
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('That file is not a picture'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('The file could not be read'));
    reader.readAsDataURL(file);
  });
}

const photoOf = (hero) => hero?.dataUrl || siteUrl(hero?.image_path) || '';

/* ---------- How the hero looks on the website ---------- */
function HeroPreview({ hero, large = false }) {
  const facts = (hero.facts || []).filter((f) => f.value || f.label);
  const photo = useCachedPhoto(photoOf(hero)) || '';
  return (
    <div
      className={`hero-preview ${large ? 'large' : ''}`}
      style={{ backgroundImage: `linear-gradient(180deg, rgba(10,43,38,.78), rgba(10,43,38,.55) 45%, rgba(10,43,38,.92)), url("${photo}")` }}
    >
      <div className="hero-preview-inner">
        {hero.eyebrow && <small>{hero.eyebrow}</small>}
        <h2>
          {hero.headline_line1 || 'Your headline'}
          {hero.headline_line2 && <><br />{hero.headline_line2}</>}
        </h2>
        {hero.message && <p>{hero.message}</p>}
        <div className="hero-preview-buttons">
          {hero.primary_label && <span className="hp-btn">{hero.primary_label}</span>}
          {hero.secondary_label && <span className="hp-link">{hero.secondary_label} →</span>}
        </div>
        {facts.length > 0 && (
          <ul>
            {facts.map((f, i) => <li key={i}><b>{f.value}</b><span>{f.label}</span></li>)}
          </ul>
        )}
      </div>
      <span className="hero-preview-tag">Preview</span>
    </div>
  );
}

/* ---------- Create / edit one hero ---------- */
// Optional parts: removed ones are saved empty and not shown on the website
const PARTS = [
  { key: 'eyebrow', label: 'Small label', fields: ['eyebrow'] },
  { key: 'headline_line2', label: 'Headline line 2', fields: ['headline_line2'] },
  { key: 'message', label: 'Line under the headline', fields: ['message'] },
  { key: 'primary', label: 'Main button', fields: ['primary_label'] },
  { key: 'secondary', label: 'Second link', fields: ['secondary_label'] },
];

function HeroEditor({ hero, targets, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !hero.id;
  const [values, setValues] = useState(() => ({ ...EMPTY_HERO, ...hero, facts: [...(hero.facts || [])] }));
  // Which optional parts are in use: a new hero starts with all of them
  const [shown, setShown] = useState(() => new Set(
    PARTS.filter((part) => isNew || part.fields.some((f) => String(hero[f] || '').trim())).map((part) => part.key)
  ));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const fileInput = useRef(null);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const setFact = (i, key, value) =>
    setValues((v) => ({ ...v, facts: v.facts.map((f, n) => (n === i ? { ...f, [key]: value } : f)) }));
  const addFact = () => setValues((v) => ({ ...v, facts: [...v.facts, { value: '', label: '' }] }));
  const removeFact = (i) => setValues((v) => ({ ...v, facts: v.facts.filter((_, n) => n !== i) }));

  const has = (key) => shown.has(key);
  const removePart = (part) => {
    setShown((s) => { const next = new Set(s); next.delete(part.key); return next; });
    setValues((v) => ({ ...v, ...Object.fromEntries(part.fields.map((f) => [f, ''])) }));
  };
  const addPart = (part) => setShown((s) => new Set(s).add(part.key));
  const hidden = PARTS.filter((part) => !has(part.key));

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      set('dataUrl', await resizePhoto(file));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const save = async () => {
    setProblem('');
    if (!values.headline_line1.trim()) return setProblem('Enter the first line of the headline');
    if (isNew && !values.dataUrl) return setProblem('Choose a background photo');
    if (has('primary') && !values.primary_label.trim()) return setProblem('Type the main button text, or remove the button');
    if (has('secondary') && !values.secondary_label.trim()) return setProblem('Type the second link text, or remove the link');

    setSaving(true);
    try {
      const body = {
        ...values,
        // Removed parts are sent empty, so they disappear from the website
        ...Object.fromEntries(PARTS.filter((p) => !has(p.key)).flatMap((p) => p.fields.map((f) => [f, '']))),
        facts: values.facts.filter((f) => f.value.trim() || f.label.trim()),
      };
      if (isNew) await api('/hero', { method: 'POST', body });
      else await api(`/hero/${hero.id}`, { method: 'PUT', body });
      toast(isNew ? 'Hero created' : 'Hero saved');
      onSaved();
    } catch (err) {
      setProblem(err.message);
      setSaving(false);
    }
  };

  const targetSelect = (name) => (
    <select value={values[name]} onChange={(e) => set(name, e.target.value)}>
      {targets.map((t) => <option key={t} value={t}>{TARGET_LABELS[t] || t}</option>)}
    </select>
  );
  const removeButton = (key, title) => (
    <button type="button" className="part-remove" onClick={() => removePart(PARTS.find((p) => p.key === key))} title={`Remove ${title}`}>
      ✕ Remove
    </button>
  );

  return (
    <Modal
      wide
      title={isNew ? 'Create hero' : 'Edit hero'}
      onClose={onClose}
      footer={
        <>
          {problem && <span className="form-error" style={{ marginRight: 'auto' }}>{problem}</span>}
          <button className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create hero' : 'Save hero'}</button>
        </>
      }
    >
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />

      <div className="modal-section">
        <HeroPreview hero={values} />
        <div className="hero-photo-pick">
          <button type="button" className="btn alt" onClick={() => { fileInput.current.value = ''; fileInput.current.click(); }}>
            {photoOf(values) ? 'Change photo' : 'Choose photo *'}
          </button>
          <small>JPG, PNG or WebP · resized to {PHOTO_MAX_WIDTH}px wide</small>
          <label className="hero-slide-on">
            <input type="checkbox" checked={values.is_active} onChange={(e) => set('is_active', e.target.checked)} />
            Show on the website
          </label>
        </div>
      </div>

      <div className="form">
        {has('eyebrow') && (
          <div className="field full">
            <div className="part-head"><label>Small label above the headline</label>{removeButton('eyebrow', 'small label')}</div>
            <input value={values.eyebrow} maxLength={150} onChange={(e) => set('eyebrow', e.target.value)} placeholder="Leaving Bangalore every Friday, 10:30 PM" />
          </div>
        )}

        <div className={`field ${has('headline_line2') ? '' : 'full'}`}>
          <label>Headline — line 1 *</label>
          <input value={values.headline_line1} maxLength={120} onChange={(e) => set('headline_line1', e.target.value)} placeholder="Escape the routine." />
        </div>
        {has('headline_line2') && (
          <div className="field">
            <div className="part-head"><label>Headline — line 2</label>{removeButton('headline_line2', 'headline line 2')}</div>
            <input value={values.headline_line2} maxLength={120} onChange={(e) => set('headline_line2', e.target.value)} placeholder="Sleep under the Ghats." />
          </div>
        )}

        {has('message') && (
          <div className="field full">
            <div className="part-head"><label>Line under the headline</label>{removeButton('message', 'line under the headline')}</div>
            <input value={values.message} maxLength={200} onChange={(e) => set('message', e.target.value)} placeholder="Chase the sunrise. Find your next adventure." />
          </div>
        )}

        {has('primary') && (
          <div className="field full part-box">
            <div className="part-head"><label>Main button</label>{removeButton('primary', 'main button')}</div>
            <div className="part-row">
              <input value={values.primary_label} maxLength={60} onChange={(e) => set('primary_label', e.target.value)} placeholder="See this month's treks" aria-label="Main button text" />
              {targetSelect('primary_target')}
            </div>
            <small>Button text · goes to</small>
          </div>
        )}

        {has('secondary') && (
          <div className="field full part-box">
            <div className="part-head"><label>Second link</label>{removeButton('secondary', 'second link')}</div>
            <div className="part-row">
              <input value={values.secondary_label} maxLength={80} onChange={(e) => set('secondary_label', e.target.value)} placeholder="Read 1,200+ reviews" aria-label="Second link text" />
              {targetSelect('secondary_target')}
            </div>
            <small>Link text (an arrow → is added) · goes to</small>
          </div>
        )}

        <div className="field full">
          <div className="part-head">
            <label>Stats under the buttons {values.facts.length > 0 && <span className="muted">({values.facts.length} of 4)</span>}</label>
            {values.facts.length < 4 && <button type="button" className="part-add" onClick={addFact}>＋ Add stat</button>}
          </div>
          {values.facts.length === 0 ? (
            <p className="muted part-empty">No stats on this hero.</p>
          ) : (
            <div className="hero-facts-edit">
              {values.facts.map((fact, i) => (
                <div className="hero-fact-row with-remove" key={i}>
                  <input value={fact.value} maxLength={20} onChange={(e) => setFact(i, 'value', e.target.value)} placeholder={FACT_HINTS[i]?.[0] || '10'} aria-label={`Stat ${i + 1} number`} />
                  <input value={fact.label} maxLength={40} onChange={(e) => setFact(i, 'label', e.target.value)} placeholder={FACT_HINTS[i]?.[1] || 'label'} aria-label={`Stat ${i + 1} label`} />
                  <button type="button" className="fact-remove" onClick={() => removeFact(i)} aria-label={`Remove stat ${i + 1}`} title="Remove this stat">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {hidden.length > 0 && (
          <div className="field full part-addback">
            <label>Add back</label>
            <div>
              {hidden.map((part) => (
                <button type="button" key={part.key} className="part-add" onClick={() => addPart(part)}>＋ {part.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Page: one card per hero ---------- */
export default function WebsiteHero() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/hero');
  const [editing, setEditing] = useState(null); // null | {} (new) | hero
  const [previewing, setPreviewing] = useState(null);
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    if (data?.slide_seconds) setSeconds(data.slide_seconds);
  }, [data]);

  const heroes = data?.heroes || [];
  const targets = data?.targets || Object.keys(TARGET_LABELS);
  const showing = heroes.filter((h) => h.is_active).length;

  const run = async (action, message) => {
    try {
      await action();
      if (message) toast(message);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggle = (hero) =>
    run(() => api(`/hero/${hero.id}`, { method: 'PUT', body: { ...hero, is_active: !hero.is_active } }),
      hero.is_active ? 'Hidden from the website' : 'Showing on the website');

  const move = (index, step) => {
    const ids = heroes.map((h) => h.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + step, 0, id);
    run(() => api('/hero/order', { method: 'PUT', body: { ids } }), 'Order saved');
  };

  const remove = (hero) => {
    if (!window.confirm(`Delete the hero "${hero.headline_line1}"? Its photo is removed too.`)) return;
    run(() => api(`/hero/${hero.id}`, { method: 'DELETE' }), 'Hero deleted');
  };

  const saveSeconds = () =>
    run(() => api('/hero/timing', { method: 'PUT', body: { slide_seconds: seconds } }), 'Timing saved');

  if (error) return <div className="error-box">{error}</div>;
  if (loading && !data) return <div className="loading">Loading…</div>;

  return (
    <>
      <PageHead title="Website Hero" subtitle="The big banners at the top of the home page. Each hero has its own photo, texts, buttons and stats; the website shows them one after another.">
        <a className="btn alt" href={SITE_URL || '/'} target="_blank" rel="noreferrer">View website</a>
        <button className="btn" onClick={() => setEditing({})} disabled={heroes.length >= MAX_HEROES}>＋ Create hero</button>
      </PageHead>

      <div className="card hero-timing">
        <div>
          <b>{showing} of {heroes.length} heroes showing</b>
          <span className="muted"> · up to {MAX_HEROES}</span>
        </div>
        <label>
          Change hero every
          <input type="number" min={2} max={15} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
          seconds
        </label>
        <button className="btn alt small" onClick={saveSeconds} disabled={Number(seconds) === Number(data?.slide_seconds)}>Save</button>
      </div>

      {heroes.length === 0 ? (
        <div className="trip-empty"><b>No heroes yet</b><span>Create the first one with “＋ Create hero”.</span></div>
      ) : (
        <div className="hero-grid">
          {heroes.map((hero, index) => (
            <div className={`card hero-card ${hero.is_active ? '' : 'off'}`} key={hero.id}>
              <button type="button" className="hero-card-photo" onClick={() => setPreviewing(hero)} title="Preview">
                <CachedImg src={photoOf(hero)} alt="" />
                <span className="hero-card-order">#{index + 1}</span>
                <span className={`pill ${hero.is_active ? '' : 'grey'} hero-card-status`}>{hero.is_active ? 'Showing' : 'Hidden'}</span>
              </button>
              <div className="hero-card-body">
                {hero.eyebrow && <small>{hero.eyebrow}</small>}
                <h3>{hero.headline_line1}{hero.headline_line2 ? ` ${hero.headline_line2}` : ''}</h3>
                {hero.message && <p>{hero.message}</p>}
                <div className="hero-card-meta">
                  {hero.primary_label && <span>▣ {hero.primary_label}</span>}
                  {hero.secondary_label && <span>→ {hero.secondary_label}</span>}
                  {hero.facts.length > 0 && <span>{hero.facts.length} stats</span>}
                </div>
              </div>
              <div className="hero-card-actions">
                <button className="btn alt small" onClick={() => setPreviewing(hero)}>Preview</button>
                <button className="btn small" onClick={() => setEditing(hero)}>Edit</button>
                <button className="btn alt small" onClick={() => toggle(hero)}>{hero.is_active ? 'Hide' : 'Show'}</button>
                <span className="hero-card-move">
                  <button className="btn alt small" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move earlier">↑</button>
                  <button className="btn alt small" onClick={() => move(index, 1)} disabled={index === heroes.length - 1} aria-label="Move later">↓</button>
                </span>
                <button className="btn danger small" onClick={() => remove(hero)} aria-label="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <HeroEditor
          hero={editing}
          targets={targets}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {previewing && (
        <Modal
          wide
          title={`Preview · hero #${heroes.findIndex((h) => h.id === previewing.id) + 1}`}
          onClose={() => setPreviewing(null)}
          footer={
            <>
              <button className="btn alt" onClick={() => setPreviewing(null)}>Close</button>
              <button className="btn" onClick={() => { setEditing(previewing); setPreviewing(null); }}>Edit this hero</button>
            </>
          }
        >
          <div className="modal-section"><HeroPreview hero={previewing} large /></div>
        </Modal>
      )}
    </>
  );
}
