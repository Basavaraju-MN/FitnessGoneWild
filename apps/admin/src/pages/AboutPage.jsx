import { useEffect, useMemo, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { siteUrl, SITE_URL } from '../assets';
import { Modal, PageHead, useToast } from '../components/ui';
import RichTextEditor, { plainText } from '../components/RichTextEditor';

// About Page screen: everything on the website's /about page.
// Photos are saved at once when chosen; texts are saved with "Save texts".
const MAX_STATS = 4;
const MAX_VALUES = 6;

// Shrinks a photo to maxWidth wide WebP (JPEG if the browser cannot make
// WebP), so the page stays light for visitors
function resizePhoto(file, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const webp = canvas.toDataURL('image/webp', 0.78);
      resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not a photo the browser can read'));
    };
    img.src = url;
  });
}

// Click to choose a photo; calls onPick(dataUrl) with the resized photo
function usePhotoPicker(maxWidth, onPick) {
  const input = useRef(null);
  const toast = useToast();
  const element = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          onPick(await resizePhoto(file, maxWidth));
        } catch (err) {
          toast(err.message, 'error');
        }
      }}
    />
  );
  const open = () => {
    input.current.value = '';
    input.current.click();
  };
  return [element, open];
}

/* ---------- Banner / story / founder photo ---------- */
function PagePhoto({ slot, label, url, maxWidth, round, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async (request, message) => {
    setBusy(true);
    try {
      const result = await request();
      onChanged(result.data);
      toast(message);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const [picker, choose] = usePhotoPicker(maxWidth, (dataUrl) =>
    run(() => api(`/about/photos/${slot}`, { method: 'PUT', body: { dataUrl } }), `${label} saved`));

  const remove = () => {
    if (!window.confirm(`Remove the ${label.toLowerCase()}?`)) return;
    run(() => api(`/about/photos/${slot}`, { method: 'DELETE' }), `${label} removed`);
  };

  return (
    <div className={`about-photo ${round ? 'round' : ''}`}>
      {picker}
      <div className="about-photo-box">
        {url ? <img src={siteUrl(url)} alt="" /> : <span>No photo</span>}
      </div>
      <div className="about-photo-actions">
        <button type="button" className="btn alt small" onClick={choose} disabled={busy}>
          {busy ? 'Saving…' : url ? 'Change photo' : 'Choose photo'}
        </button>
        {url && <button type="button" className="btn alt small" onClick={remove} disabled={busy}>Remove</button>}
      </div>
      <small className="muted">Saved as soon as you choose it · resized to {maxWidth}px</small>
    </div>
  );
}

/* ---------- Team member editor ---------- */
const EMPTY_MEMBER = { name: '', role: '', intro: '', fact: '', is_active: true, photo: null };

function MemberEditor({ member, onClose, onSaved }) {
  const isNew = !member.id;
  const [values, setValues] = useState({ ...EMPTY_MEMBER, ...member });
  const [dataUrl, setDataUrl] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [picker, choose] = usePhotoPicker(900, (url) => { setDataUrl(url); setRemovePhoto(false); });

  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  const photo = dataUrl || (!removePhoto && values.photo ? siteUrl(values.photo) : null);

  const save = async () => {
    setProblem('');
    if (!values.name.trim()) return setProblem('Enter the name');
    setSaving(true);
    try {
      const body = { ...values, dataUrl, removePhoto };
      const result = isNew
        ? await api('/about/team', { method: 'POST', body })
        : await api(`/about/team/${member.id}`, { method: 'PUT', body });
      toast(isNew ? 'Team member added' : 'Team member saved');
      onSaved(result.data);
    } catch (err) {
      setProblem(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isNew ? 'Add team member' : `Edit ${member.name}`}
      onClose={onClose}
      footer={
        <>
          {problem && <span className="form-error" style={{ marginRight: 'auto' }}>{problem}</span>}
          <button className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add member' : 'Save'}</button>
        </>
      }
    >
      {picker}
      <div className="modal-section about-member-photo">
        <div className="about-avatar large">
          {photo ? <img src={photo} alt="" /> : <span>{initials(values.name) || '?'}</span>}
        </div>
        <div>
          <button type="button" className="btn alt small" onClick={choose}>{photo ? 'Change photo' : 'Choose photo'}</button>
          {photo && (
            <button type="button" className="btn alt small" onClick={() => { setDataUrl(null); setRemovePhoto(true); }}>Remove photo</button>
          )}
          <small className="muted">Square or upright photos with the face in the middle look best (shown round) · without a photo the initials are shown</small>
        </div>
      </div>
      <div className="form">
        <div className="field">
          <label>Name *</label>
          <input value={values.name} maxLength={100} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={values.role} maxLength={100} onChange={(e) => set('role', e.target.value)} placeholder="Trek Leader" />
        </div>
        <div className="field full">
          <label>Short intro</label>
          <textarea rows={3} value={values.intro} maxLength={300} onChange={(e) => set('intro', e.target.value)} placeholder="One or two lines about this person" />
        </div>
        <div className="field full">
          <label>Highlight</label>
          <input value={values.fact} maxLength={100} onChange={(e) => set('fact', e.target.value)} placeholder="80+ treks led · Favourite trek: Kumara Parvatha" />
        </div>
        <div className="field check full">
          <label><input type="checkbox" checked={values.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Show on the website</label>
        </div>
      </div>
    </Modal>
  );
}

const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/* ---------- Small field helpers ---------- */
function TextField({ label, value, onChange, max, placeholder, full, rows, hint }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label>{label}</label>
      {rows
        ? <textarea rows={rows} value={value || ''} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        : <input value={value || ''} maxLength={max} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="card about-card">
      <div className="cardhead">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------- Page ---------- */
export default function AboutPage() {
  const toast = useToast();
  const { data, loading, error } = useApi('/about');
  const [page, setPage] = useState(null); // { content, photos, team } as last saved
  const [content, setContent] = useState(null); // texts being edited
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // null | {} (new) | member

  // Loaded or saved: the screen shows what the server has
  const apply = (next) => {
    setPage(next);
    setContent((current) => current || structuredClone(next.content));
  };
  useEffect(() => {
    if (data) {
      setPage(data);
      setContent(structuredClone(data.content));
    }
  }, [data]);

  const changed = useMemo(
    () => Boolean(page && content && JSON.stringify(content) !== JSON.stringify(page.content)),
    [page, content],
  );

  // Leaving with unsaved texts: ask first
  useEffect(() => {
    if (!changed) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [changed]);

  if (error) return <div className="error-box">{error}</div>;
  if (!page || !content) return <div className="loading">{loading ? 'Loading…' : ''}</div>;

  const set = (part, key, value) => setContent((c) => ({ ...c, [part]: { ...c[part], [key]: value } }));
  const setList = (key, list) => setContent((c) => ({ ...c, [key]: list }));
  const setValues = (items) => set('values', 'items', items);

  const saveTexts = async () => {
    setSaving(true);
    try {
      const result = await api('/about', { method: 'PUT', body: content });
      setPage(result.data);
      setContent(structuredClone(result.data.content));
      toast('About page saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const teamAction = async (request, message) => {
    try {
      const result = await request();
      apply(result.data);
      toast(message);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleMember = (member) => teamAction(
    () => api(`/about/team/${member.id}`, { method: 'PUT', body: { ...member, is_active: !member.is_active } }),
    member.is_active ? 'Hidden from the website' : 'Showing on the website',
  );
  const moveMember = (index, step) => {
    const ids = page.team.map((m) => m.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + step, 0, id);
    teamAction(() => api('/about/team/order', { method: 'PUT', body: { ids } }), 'Order saved');
  };
  const removeMember = (member) => {
    if (!window.confirm(`Remove ${member.name} from the team? Their photo is removed too.`)) return;
    teamAction(() => api(`/about/team/${member.id}`, { method: 'DELETE' }), 'Team member removed');
  };

  const { founder } = content;
  const credentialsText = (founder.credentials || []).join('\n');

  return (
    <>
      <PageHead title="About Page" subtitle="The website's About us page: your story, the founder and the team. Photos save as soon as you choose them; texts save with “Save texts”.">
        <a className="btn alt" href={`${SITE_URL || ''}/about`} target="_blank" rel="noreferrer">View page</a>
        <button className="btn" onClick={saveTexts} disabled={!changed || saving}>{saving ? 'Saving…' : 'Save texts'}</button>
      </PageHead>

      {changed && (
        <div className="about-unsaved">
          <span>You have unsaved text changes.</span>
          <button className="btn alt small" onClick={() => setContent(structuredClone(page.content))}>Undo changes</button>
          <button className="btn small" onClick={saveTexts} disabled={saving}>{saving ? 'Saving…' : 'Save texts'}</button>
        </div>
      )}

      <div className="about-admin">
        <Section title="1. Banner" subtitle="The big photo and heading at the top of the page">
          <div className="about-split">
            <PagePhoto slot="banner" label="Banner photo" url={page.photos.banner} maxWidth={1600} onChanged={apply} />
            <div className="form">
              <TextField label="Small label" value={content.banner.eyebrow} max={60} onChange={(v) => set('banner', 'eyebrow', v)} placeholder="About us" full />
              <TextField label="Heading *" value={content.banner.title} max={120} onChange={(v) => set('banner', 'title', v)} full />
              <TextField label="Line under the heading" value={content.banner.subtitle} max={200} onChange={(v) => set('banner', 'subtitle', v)} full />
            </div>
          </div>
        </Section>

        <Section title="2. Our story" subtitle="How the company started and what makes it different">
          <div className="about-split">
            <PagePhoto slot="story" label="Story photo" url={page.photos.story} maxWidth={1200} onChanged={apply} />
            <div className="form">
              <TextField label="Small label" value={content.story.eyebrow} max={60} onChange={(v) => set('story', 'eyebrow', v)} placeholder="Our story" />
              <TextField label="Heading" value={content.story.title} max={120} onChange={(v) => set('story', 'title', v)} />
              <div className="field full">
                <label>Story *</label>
                <RichTextEditor
                  value={content.story.text}
                  onChange={(html) => set('story', 'text', html)}
                  placeholder="How the company started, what you do, what makes you different…"
                  height={420}
                />
                <small>Bold, lists, headings and links show on the website as here · up to 8,000 characters · now {plainText(content.story.text).length}</small>
              </div>
            </div>
          </div>
        </Section>

        <Section title="3. Numbers" subtitle={`The green strip with numbers (up to ${MAX_STATS})`}>
          <div className="form">
            <div className="field full">
              {content.stats.map((stat, i) => (
                <div className="about-row" key={i}>
                  <input value={stat.value} maxLength={20} placeholder="300+" aria-label={`Number ${i + 1}`}
                    onChange={(e) => setList('stats', content.stats.map((s, j) => (j === i ? { ...s, value: e.target.value } : s)))} />
                  <input value={stat.label} maxLength={40} placeholder="Trips organised" aria-label={`Label ${i + 1}`}
                    onChange={(e) => setList('stats', content.stats.map((s, j) => (j === i ? { ...s, label: e.target.value } : s)))} />
                  <button type="button" className="btn alt small" aria-label={`Remove number ${i + 1}`}
                    onClick={() => setList('stats', content.stats.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              {content.stats.length < MAX_STATS && (
                <button type="button" className="btn alt small" onClick={() => setList('stats', [...content.stats, { value: '', label: '' }])}>＋ Add number</button>
              )}
              {content.stats.length === 0 && <small>No numbers: the strip is not shown.</small>}
            </div>
          </div>
        </Section>

        <Section title="4. Founder" subtitle="Photo, name and a personal note">
          <div className="form" style={{ paddingBottom: 0 }}>
            <div className="field check full">
              <label><input type="checkbox" checked={founder.show} onChange={(e) => set('founder', 'show', e.target.checked)} /> Show the founder section on the website</label>
            </div>
          </div>
          <div className={`about-split ${founder.show ? '' : 'about-off'}`}>
            <PagePhoto slot="founder" label="Founder photo" url={page.photos.founder} maxWidth={900} onChanged={apply} />
            <div className="form">
              <TextField label="Small label" value={founder.eyebrow} max={60} onChange={(v) => set('founder', 'eyebrow', v)} placeholder="Meet the founder" />
              <TextField label={`Name${founder.show ? ' *' : ''}`} value={founder.name} max={100} onChange={(v) => set('founder', 'name', v)} />
              <TextField label="Role" value={founder.role} max={100} onChange={(v) => set('founder', 'role', v)} placeholder="Founder & Lead Trek Leader" />
              <TextField label="Instagram link" value={founder.instagram} max={200} onChange={(v) => set('founder', 'instagram', v)} placeholder="https://instagram.com/…" />
              <div className="field full">
                <label>Personal note</label>
                <RichTextEditor
                  value={founder.note}
                  onChange={(html) => set('founder', 'note', html)}
                  placeholder="A few lines in the founder's own words"
                  height={240}
                />
                <small>Up to 2,000 characters · now {plainText(founder.note).length}</small>
              </div>
              <TextField label="Certificates & highlights" value={credentialsText} rows={3} full
                onChange={(v) => set('founder', 'credentials', v.split('\n').slice(0, 6))}
                hint="One per line, up to 6 (e.g. Basic Mountaineering Course)" />
            </div>
          </div>
        </Section>

        <Section title="5. Team" subtitle="The people shown on the page, in this order">
          <div className="form">
            <TextField label="Small label" value={content.team.eyebrow} max={60} onChange={(v) => set('team', 'eyebrow', v)} placeholder="Our team" />
            <TextField label="Heading" value={content.team.title} max={120} onChange={(v) => set('team', 'title', v)} />
            <TextField label="Line under the heading" value={content.team.subtitle} max={300} onChange={(v) => set('team', 'subtitle', v)} full />
          </div>
          <div className="about-team">
            {page.team.length === 0 && (
              <div className="trip-empty"><b>No team members yet</b><span>Add the first one with “＋ Add team member”. The team section is shown once someone is added.</span></div>
            )}
            {page.team.map((member, index) => (
              <div className={`about-member ${member.is_active ? '' : 'off'}`} key={member.id}>
                <div className="about-avatar">
                  {member.photo ? <img src={siteUrl(member.photo)} alt="" /> : <span>{initials(member.name)}</span>}
                </div>
                <div className="about-member-text">
                  <b>{member.name}</b>
                  <span className="muted">{member.role || '—'}</span>
                  {!member.is_active && <span className="pill grey">Hidden</span>}
                </div>
                <div className="about-member-actions">
                  <button className="btn small" onClick={() => setEditing(member)}>Edit</button>
                  <button className="btn alt small" onClick={() => toggleMember(member)}>{member.is_active ? 'Hide' : 'Show'}</button>
                  <button className="btn alt small" onClick={() => moveMember(index, -1)} disabled={index === 0} aria-label="Move up">↑</button>
                  <button className="btn alt small" onClick={() => moveMember(index, 1)} disabled={index === page.team.length - 1} aria-label="Move down">↓</button>
                  <button className="btn danger small" onClick={() => removeMember(member)} aria-label="Remove">✕</button>
                </div>
              </div>
            ))}
            <button className="btn alt" onClick={() => setEditing({})}>＋ Add team member</button>
          </div>
        </Section>

        <Section title="6. What we stand for" subtitle={`Short points with an icon (up to ${MAX_VALUES})`}>
          <div className="form">
            <TextField label="Small label" value={content.values.eyebrow} max={60} onChange={(v) => set('values', 'eyebrow', v)} placeholder="What we stand for" />
            <TextField label="Heading" value={content.values.title} max={120} onChange={(v) => set('values', 'title', v)} />
            <div className="field full">
              {content.values.items.map((item, i) => {
                const update = (key, value) => setValues(content.values.items.map((v, j) => (j === i ? { ...v, [key]: value } : v)));
                return (
                  <div className="about-row values" key={i}>
                    <input value={item.icon} maxLength={8} onChange={(e) => update('icon', e.target.value)} placeholder="🛟" aria-label="Icon (emoji)" />
                    <input value={item.title} maxLength={60} onChange={(e) => update('title', e.target.value)} placeholder="Safety first" aria-label="Title" />
                    <input value={item.text} maxLength={300} onChange={(e) => update('text', e.target.value)} placeholder="One line about it" aria-label="Text" />
                    <button type="button" className="btn alt small" aria-label="Remove point" onClick={() => setValues(content.values.items.filter((_, j) => j !== i))}>✕</button>
                  </div>
                );
              })}
              {content.values.items.length < MAX_VALUES && (
                <button type="button" className="btn alt small" onClick={() => setValues([...content.values.items, { icon: '', title: '', text: '' }])}>＋ Add point</button>
              )}
              <small>Icon: paste an emoji (🛟 👥 🌿 💯 🧭 ⛰️). Points without a title are not shown.</small>
            </div>
          </div>
        </Section>

        <Section title="7. Call to action" subtitle="The green box at the end of the page (also has a WhatsApp button)">
          <div className="form">
            <TextField label="Heading" value={content.cta.title} max={120} onChange={(v) => set('cta', 'title', v)} />
            <TextField label="Button text" value={content.cta.button_label} max={40} onChange={(v) => set('cta', 'button_label', v)} placeholder="See upcoming trips" />
          </div>
        </Section>
      </div>

      {editing && (
        <MemberEditor
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setEditing(null);
            apply(next);
          }}
        />
      )}
    </>
  );
}
