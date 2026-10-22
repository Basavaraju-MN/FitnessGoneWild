import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '../api';
import { siteUrl } from '../assets';
import { useAdmin } from '../context';
import { useToast } from './ui';
import RichTextEditor, { plainText } from './RichTextEditor';

const MAX_PHOTOS = 5;
const PHOTO_MAX_WIDTH = 1600;
const MIN_PICKUP_POINTS = 2;
const BLURB_MAX = 300; // characters of text (formatting not counted)

const STEPS = [
  { title: 'Trek details', hint: 'Name, price, category' },
  { title: 'Description & itinerary', hint: 'The trek page text' },
  { title: 'Inclusions & pickup', hint: 'What is included, where we pick up' },
  { title: 'Photos & brochure', hint: 'Cover, slideshow, PDF' },
];

const DIFFICULTIES = ['Easy', 'Moderate', 'Hard'];

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// "2 days" -> 2, "1 Day" -> 1 (saved as duration_days)
const daysFrom = (label) => Math.max(1, parseInt(String(label || '').match(/\d+/)?.[0] || '1', 10));

const emptyPickup = (cityId = '') => ({ name: '', address: '', city_id: cityId });

// Shrinks a photo to PHOTO_MAX_WIDTH wide JPEG so the website stays fast
function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, PHOTO_MAX_WIDTH / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not a photo the browser can read'));
    };
    img.src = url;
  });
}

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

/* ---------- Drop zone (click or drag a file onto it) ---------- */
function DropZone({ accept, onFile, className = '', children }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`dropzone ${over ? 'over' : ''} ${className}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

/**
 * Centered pop-up to add or edit a trip, in 4 steps. Everything is saved
 * together when you press Save:
 *   details, inclusions/exclusions, pickup points -> database
 *   photos   -> website folder images/treks/<slug>/1.jpg … 5.jpg (1 = cover)
 *   brochure -> brochures/<slug>/<file>.pdf
 */
// Brochures are kept only on Hostinger (File Manager → public_html/public/brochures/<slug>/).
// Shown here: where to put this trek's PDF and whether it is there.
function BrochureOnHostinger({ tripId, slug }) {
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const { data } = await api(`/trips/${tripId}/brochure-check`);
      setCheck(data);
    } catch {
      setCheck(null);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    run();
  }, [run]);

  const folder = check?.folder || 'public/brochures';
  const place = `${folder}/${slug || '<slug>'}/`;
  return (
    <div className="brochure-host">
      <p>
        Brochures are managed in <b>Hostinger File Manager</b> → <code>public_html/{place}</code>.
        Put this trek's PDF in that folder (any file name; replace the file to update it).
      </p>
      {!tripId ? (
        <p className="muted">Save the trip first, then upload the PDF on Hostinger.</p>
      ) : check && !check.configured ? (
        <p className="brochure-status warn">
          Hostinger FTP is not set up on the server (<code>HOSTINGER_FTP_HOST</code>, <code>HOSTINGER_FTP_USER</code>, <code>HOSTINGER_FTP_PASSWORD</code>), so brochures cannot be downloaded.
        </p>
      ) : check ? (
        <p className={`brochure-status ${check.found ? 'ok' : 'missing'}`}>
          {check.found
            ? <>✓ Found on Hostinger: <code>{check.fileName}</code>{check.size ? ` · ${Math.round(check.size / 1024)} KB` : ''}</>
            : <>✕ Not found: upload the PDF to <code>public_html/{place}</code></>}
        </p>
      ) : null}
      {tripId && <button type="button" className="btn alt small" onClick={run} disabled={loading}>{loading ? 'Checking…' : 'Check again'}</button>}
    </div>
  );
}

export default function TripModal({ tripId, categories, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !tripId;

  const [step, setStep] = useState(0);
  const [values, setValues] = useState(null);
  const [photos, setPhotos] = useState({}); // number -> saved photo
  const [photoChanges, setPhotoChanges] = useState({}); // number -> { dataUrl } | { remove: true }
  const [brochure, setBrochure] = useState(null); // saved file name
  const [brochureChange, setBrochureChange] = useState(null); // { name, dataUrl } | { remove: true }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Regions & Cities (Management menu); empty before regions_cities.sql has run
  const { lookups } = useAdmin();
  const regions = (lookups?.regions || []).filter((r) => Number(r.is_active) || String(r.id) === String(values?.region_id));
  const cities = (lookups?.departureCities || []).filter((c) => Number(c.is_active) || values?.pickup_points?.some((p) => String(p.city_id) === String(c.id)));
  const hasRegions = (lookups?.regions || []).length > 0;
  const firstCityId = cities[0]?.id || '';

  // Load the trip (or start a blank one)
  useEffect(() => {
    if (isNew) {
      setValues({
        status: 'draft', difficulty: 'Easy', badge_style: 'plain',
        category_id: categories[0]?.id || '', is_featured: 0,
        region_id: (lookups?.regions || []).find((r) => Number(r.is_active))?.id || '',
        pickup_points: [emptyPickup(firstCityId), emptyPickup(firstCityId)],
      });
      return;
    }

    api(`/trips/${tripId}`)
      .then(({ data }) => {
        const pickups = (data.pickup_points || []).map((p) => ({ id: p.id, name: p.name, address: p.address || '', city_id: p.city_id || '' }));
        while (pickups.length < MIN_PICKUP_POINTS) pickups.push(emptyPickup(firstCityId));
        setValues({ ...data, pickup_points: pickups });
        setPhotos(Object.fromEntries((data.images || []).map((img) => [img.number, img])));
        setBrochure(data.brochure_file);
      })
      .catch((err) => {
        toast(err.message, 'error');
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, isNew, categories, toast, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  if (!values) return null;

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));
  const slug = isNew ? slugify(values.name) : values.slug;

  const input = (name, props = {}) => (
    <input value={values[name] ?? ''} onChange={(e) => set(name, e.target.value)} {...props} />
  );

  /* ---------- Pickup points ---------- */
  const setPickup = (index, key, value) =>
    set('pickup_points', values.pickup_points.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  // A new row takes the city of the row above it
  const addPickup = () => set('pickup_points', [
    ...values.pickup_points,
    emptyPickup(values.pickup_points[values.pickup_points.length - 1]?.city_id || firstCityId),
  ]);
  const removePickup = (index) => set('pickup_points', values.pickup_points.filter((_, i) => i !== index));
  const movePickup = (index, delta) => {
    const list = [...values.pickup_points];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    set('pickup_points', list);
  };

  /* ---------- Photos & brochure ---------- */
  const photoAt = (n) => {
    const change = photoChanges[n];
    if (change?.remove) return null;
    if (change?.dataUrl) return change.dataUrl;
    return photos[n] ? siteUrl(photos[n].url) : null;
  };

  const pickPhoto = async (n, file) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast('Please choose a JPG, PNG or WebP photo', 'error');
      return;
    }
    try {
      setPhotoChanges((c) => ({ ...c, [n]: { dataUrl: null } }));
      const dataUrl = await resizePhoto(file);
      setPhotoChanges((c) => ({ ...c, [n]: { dataUrl } }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const removePhoto = (n) =>
    setPhotoChanges((c) => {
      const next = { ...c };
      if (photos[n]) next[n] = { remove: true };
      else delete next[n];
      return next;
    });

  const pickBrochure = async (file) => {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast('The brochure must be a PDF file', 'error');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast('Brochure is too large (max 20 MB)', 'error');
      return;
    }
    setBrochureChange({ name: file.name, dataUrl: await readAsDataUrl(file) });
  };

  /* ---------- Checks per step ---------- */
  const problemIn = (index) => {
    if (index === 0) {
      if (!String(values.name || '').trim()) return 'Enter the trek name';
      if (!plainText(values.blurb)) return 'Enter a short description';
      if (plainText(values.blurb).length > BLURB_MAX) return `Short description: keep it under ${BLURB_MAX} characters (now ${plainText(values.blurb).length})`;
      if (!values.category_id) return 'Choose a category';
      if (hasRegions && !values.region_id) return 'Choose a region';
      if (!String(values.duration_label || '').trim()) return 'Enter the duration, e.g. 2 days';
      if (values.price === '' || values.price === undefined || values.price === null) return 'Enter the price per person';
      if (isNew && !slug) return 'The trek name needs some letters or numbers (used for the web address)';
    }
    if (index === 2) {
      const named = values.pickup_points.filter((p) => String(p.name || '').trim());
      if (named.length < MIN_PICKUP_POINTS) return `Add at least ${MIN_PICKUP_POINTS} pickup points`;
      if (cities.length && named.some((p) => !p.city_id)) return 'Choose the departure city of every pickup point';
    }
    return '';
  };

  const goTo = (target) => {
    // Moving forward checks the steps you are leaving
    for (let i = step; i < target; i += 1) {
      const problem = problemIn(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }
    setError('');
    setStep(target);
  };

  const save = async () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const problem = problemIn(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }

    setSaving(true);
    setError('');

    const body = {
      ...values,
      duration_days: daysFrom(values.duration_label),
      pickup_points: values.pickup_points.filter((p) => String(p.name || '').trim()),
    };
    if (isNew) body.slug = slug;
    else delete body.slug; // existing trips keep their web address and folders

    try {
      let id = tripId;
      if (isNew) {
        ({ data: { id } } = await api('/trips', { method: 'POST', body }));
      } else {
        await api(`/trips/${id}`, { method: 'PUT', body });
      }

      for (const [n, change] of Object.entries(photoChanges)) {
        if (change.remove) {
          await api(`/trips/${id}/images/${n}`, { method: 'DELETE' });
        } else if (change.dataUrl) {
          await api(`/trips/${id}/images`, { method: 'POST', body: { number: Number(n), dataUrl: change.dataUrl } });
        }
      }

      if (brochureChange?.remove) {
        await api(`/trips/${id}/brochure`, { method: 'DELETE' });
      } else if (brochureChange?.dataUrl) {
        await api(`/trips/${id}/brochure`, {
          method: 'POST',
          body: { fileName: brochureChange.name, dataUrl: brochureChange.dataUrl },
        });
      }

      toast(isNew ? 'Trip added' : 'Trip saved');
      onSaved(id);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const cover = photoAt(1);
  const shownBrochure = brochureChange?.remove ? null : brochureChange?.name || brochure;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="trip-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="trip-modal" role="dialog" aria-label={isNew ? 'Add new trip' : `Edit ${values.name}`}>
        <div className="trip-modal-head">
          <div>
            <h2>{isNew ? 'Add new trip' : values.name}</h2>
            <small>{isNew ? 'Fill in each step, then save' : 'Change anything, then save'}</small>
          </div>
          <button type="button" className="btn alt" onClick={onClose} disabled={saving} aria-label="Close">✕</button>
        </div>

        {/* ---------- Steps ---------- */}
        <ol className="trip-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className={`${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                onClick={() => goTo(i)}
                disabled={saving}
              >
                <span className="step-num">{i < step ? '✓' : i + 1}</span>
                <span className="step-text">
                  <b>{s.title}</b>
                  <small>{s.hint}</small>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="trip-modal-body">
          {/* ===== Step 1: details ===== */}
          {step === 0 && (
            <div className="trip-step-grid">
              <div className="field full">
                <label>Trek name *</label>
                {input('name', { autoFocus: true, placeholder: 'Kudremukh Peak Trek' })}
              </div>

              <div className="field full">
                <label>Short description *</label>
                <RichTextEditor
                  simple
                  value={values.blurb ?? ''}
                  onChange={(html) => set('blurb', html)}
                  placeholder="Shown on the trek card and at the top of the trek page"
                />
                <small>Up to {BLURB_MAX} characters · now {plainText(values.blurb).length}</small>
              </div>

              <div className="field">
                <label>Category *</label>
                <select value={values.category_id ?? ''} onChange={(e) => set('category_id', e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {hasRegions && (
                <div className="field">
                  <label>Region *</label>
                  <select value={values.region_id ?? ''} onChange={(e) => set('region_id', e.target.value)}>
                    <option value="">Select…</option>
                    {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <small>“Select region” on the website</small>
                </div>
              )}
              <div className="field">
                <label>Difficulty</label>
                <select value={values.difficulty ?? 'Easy'} onChange={(e) => set('difficulty', e.target.value)}>
                  {DIFFICULTIES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Duration *</label>
                {input('duration_label', { placeholder: '2 days' })}
              </div>
              <div className="field">
                <label>Distance or stay</label>
                {input('distance_label', { placeholder: '14 km' })}
              </div>

              <div className="field">
                <label>Price per person (₹) *</label>
                {input('price', { type: 'number', min: 0, step: '0.01' })}
              </div>
              <div className="field">
                <label>Price note</label>
                {input('price_note', { placeholder: 'per person, transport incl.' })}
              </div>

              <div className="field">
                <label>Without transport (₹)</label>
                {input('without_transport_price', { type: 'number', min: 0, step: '0.01' })}
              </div>
              <div className="field">
                <label>With transport (₹)</label>
                {input('with_transport_price', { type: 'number', min: 0, step: '0.01' })}
              </div>

              <div className="field">
                <label>Corner badge</label>
                {input('badge_text', { placeholder: 'Best for first-timers' })}
              </div>
              <div className="field">
                <label>Badge style</label>
                <select value={values.badge_style ?? 'plain'} onChange={(e) => set('badge_style', e.target.value)}>
                  <option value="plain">Plain white</option>
                  <option value="amber">Orange</option>
                </select>
              </div>

              <div className="field">
                <label>Status</label>
                <select value={values.status ?? 'draft'} onChange={(e) => set('status', e.target.value)}>
                  <option value="published">Published (live on website)</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="field">
                <label>Web address (automatic)</label>
                <input value={slug || ''} disabled placeholder="Filled from the trek name" />
              </div>

              <div className="field check full featured-row">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(Number(values.is_featured))}
                    onChange={(e) => set('is_featured', e.target.checked ? 1 : 0)}
                  />
                  ★ Show in Featured trips
                </label>
              </div>
              {Boolean(Number(values.is_featured)) && (
                <>
                  <div className="field">
                    <label>Featured label</label>
                    {input('featured_label', { placeholder: 'Most booked' })}
                  </div>
                  <div className="field">
                    <label>Featured order</label>
                    {input('featured_order', { type: 'number', min: 0 })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ===== Step 2: description & itinerary ===== */}
          {step === 1 && (
            <div className="trip-step-grid">
              <div className="field full">
                <label>Description</label>
                <RichTextEditor
                  value={values.description ?? ''}
                  onChange={(html) => set('description', html)}
                  placeholder="About the trek: what makes it special, the trail, the views…"
                  height={300}
                />
              </div>
              <div className="field full">
                <label>Itinerary</label>
                <RichTextEditor
                  value={values.itinerary ?? ''}
                  onChange={(html) => set('itinerary', html)}
                  placeholder="Day 1 — 10:00 PM Pickup from Bangalore…"
                  height={380}
                />
              </div>
            </div>
          )}

          {/* ===== Step 3: inclusions, exclusions, pickup points ===== */}
          {step === 2 && (
            <div className="trip-step-grid">
              <div className="field">
                <label>✓ Inclusions</label>
                <textarea
                  rows={8}
                  value={values.inclusions ?? ''}
                  onChange={(e) => set('inclusions', e.target.value)}
                  placeholder={'Return transport from Bangalore\nHomestay on sharing basis\nAll meals (veg)'}
                />
                <small>One item per line</small>
              </div>
              <div className="field">
                <label>✕ Exclusions</label>
                <textarea
                  rows={8}
                  value={values.exclusions ?? ''}
                  onChange={(e) => set('exclusions', e.target.value)}
                  placeholder={'Personal expenses\nMeals not listed above'}
                />
                <small>One item per line</small>
              </div>

              <div className="field full">
                <label>Pickup points * <span className="muted">(at least {MIN_PICKUP_POINTS}, in pickup order)</span></label>
                <div className="pickup-list">
                  {values.pickup_points.map((p, i) => (
                    <div key={p.id || `new-${i}`} className="pickup-row">
                      <span className="pickup-num">{i + 1}</span>
                      {cities.length > 0 && (
                        <select
                          className="pickup-city"
                          value={p.city_id ?? ''}
                          onChange={(e) => setPickup(i, 'city_id', e.target.value)}
                          aria-label="Departure city"
                        >
                          <option value="">City…</option>
                          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      <input
                        value={p.name}
                        onChange={(e) => setPickup(i, 'name', e.target.value)}
                        placeholder="Name, e.g. Indiranagar"
                      />
                      <input
                        value={p.address}
                        onChange={(e) => setPickup(i, 'address', e.target.value)}
                        placeholder="Landmark, e.g. Karachi Bakery"
                      />
                      <div className="pickup-actions">
                        <button type="button" onClick={() => movePickup(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                        <button type="button" onClick={() => movePickup(i, 1)} disabled={i === values.pickup_points.length - 1} aria-label="Move down">↓</button>
                        <button
                          type="button"
                          className="remove"
                          onClick={() => removePickup(i)}
                          disabled={values.pickup_points.length <= MIN_PICKUP_POINTS}
                          aria-label="Remove pickup point"
                          title={values.pickup_points.length <= MIN_PICKUP_POINTS ? `At least ${MIN_PICKUP_POINTS} needed` : 'Remove'}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="add-pickup" onClick={addPickup}>＋ Add pickup point</button>
                <small>Shown in the website booking form for this trek. The name is saved with each booking.{cities.length > 0 && ' The trek shows as leaving from every city used here.'}</small>
              </div>
            </div>
          )}

          {/* ===== Step 4: photos & brochure ===== */}
          {step === 3 && (
            <div className="trip-step-grid">
              <div className="field full">
                <label>Cover photo</label>
                <DropZone accept="image/jpeg,image/png,image/webp" onFile={(f) => pickPhoto(1, f)} className="cover-drop">
                  {cover ? (
                    <>
                      <img src={cover} alt="Cover" />
                      <span className="drop-change">Click or drop to change</span>
                    </>
                  ) : (
                    <div className="drop-empty">
                      <b>Drop a photo here</b>
                      <span>or click to choose · JPG, PNG or WebP · landscape works best</span>
                    </div>
                  )}
                </DropZone>
                {cover && (
                  <button type="button" className="link danger-link" onClick={() => removePhoto(1)}>Remove cover photo</button>
                )}
                <small>Photos are resized to {PHOTO_MAX_WIDTH}px wide automatically so the website stays fast.</small>
              </div>

              <div className="field full">
                <label>More photos (slideshow)</label>
                <div className="photo-slots">
                  {Array.from({ length: MAX_PHOTOS - 1 }, (_, i) => i + 2).map((n) => {
                    const src = photoAt(n);
                    return (
                      <div key={n} className="photo-slot">
                        <DropZone accept="image/jpeg,image/png,image/webp" onFile={(f) => pickPhoto(n, f)} className="slot-drop">
                          {src ? <img src={src} alt={`Photo ${n}`} /> : <span>＋<br />{n}</span>}
                        </DropZone>
                        {src && (
                          <button type="button" className="slot-remove" onClick={() => removePhoto(n)} aria-label={`Remove photo ${n}`}>✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="field full">
                <label>Brochure (PDF)</label>
                <BrochureOnHostinger tripId={tripId} slug={slug} />
              </div>
            </div>
          )}

          {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}
        </div>

        <div className="trip-modal-foot">
          <span className="muted">Step {step + 1} of {STEPS.length}</span>
          <div className="foot-buttons">
            <button type="button" className="btn alt" onClick={onClose} disabled={saving}>Cancel</button>
            {step > 0 && (
              <button type="button" className="btn alt" onClick={() => goTo(step - 1)} disabled={saving}>← Back</button>
            )}
            {!isLast && (
              <button type="button" className="btn alt" onClick={() => goTo(step + 1)} disabled={saving}>Next →</button>
            )}
            {(isLast || !isNew) && (
              <button type="button" className="btn" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : isNew ? 'Add trip' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
