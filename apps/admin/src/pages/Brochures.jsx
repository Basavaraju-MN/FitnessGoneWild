import { useEffect, useRef, useState } from 'react';

import { api } from '../api';
import DataTable from '../components/DataTable';
import { Modal, PageHead, useToast } from '../components/ui';

const MAX_BYTES = 20 * 1024 * 1024;

// Brochure list from Hostinger, read once and then kept in this browser
// (also across refreshes and tabs), so the screen opens at once. Uploads and
// deletes update the kept list. Only "Refresh" reads Hostinger again;
// logout forgets it.
const STORE_KEY = 'fgw-admin-brochures';

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
  } catch {
    return null;
  }
};
const writeStore = (value) => {
  try {
    if (value) localStorage.setItem(STORE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORE_KEY);
  } catch {
    // storage blocked: kept in memory only
  }
};

let kept = readStore();
let pending = null; // the request in progress, shared if the screen is reopened meanwhile

const keep = (value) => {
  kept = value;
  writeStore(value);
};

function loadList({ fresh = false } = {}) {
  if (!pending) {
    pending = api(`/brochures${fresh ? '?fresh=1' : ''}`)
      .then(({ data }) => {
        keep(data);
        return data;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

// Logout: forget the list
export const clearBrochureList = () => keep(null);

// A trek was added or renamed: show it at once, without reading Hostinger
// (a new trek has no brochure yet; an edited one keeps its brochure)
export const saveTrekInBrochureList = (trek) => {
  if (!kept) return;
  const exists = kept.trips.some((t) => t.id === trek.id);
  keep({
    ...kept,
    trips: exists
      ? kept.trips.map((t) => (t.id === trek.id ? { ...t, ...trek } : t))
      : [...kept.trips, { ...trek, brochure: null }],
  });
};

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

const sizeOf = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

// Problem with the chosen file, or '' when it can be uploaded
const fileProblem = (file) => {
  if (!file) return 'Choose the brochure PDF';
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) return 'The brochure must be a PDF file';
  if (file.size > MAX_BYTES) return 'Brochure is too large (max 20 MB)';
  return '';
};

// Sends the PDF to Hostinger; returns { file, size } as the website now finds it
async function sendPdf(trip, file) {
  const { data } = await api(`/trips/${trip.id}/brochure`, {
    method: 'POST',
    body: { fileName: file.name, dataUrl: await readAsDataUrl(file) },
  });
  return data.brochure;
}

// An older "<slug>…pdf" beside the trek folders still wins on Hostinger
const shownInstead = (brochure, file) =>
  brochure && !brochure.file.endsWith(file.name.replace(/[\\/:*?"<>|]+/g, '-').trim());

/* ---------- Add brochure: pick a trek that has none, then its PDF ---------- */
function AddBrochure({ trips, onClose, onSaved }) {
  const [tripId, setTripId] = useState(trips.length === 1 ? String(trips[0].id) : '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const trip = trips.find((t) => String(t.id) === tripId);
    const problem = !trip ? 'Choose the trek' : fileProblem(file);
    if (problem) return setError(problem);

    setSaving(true);
    setError('');
    try {
      onSaved(trip, file, await sendPdf(trip, file));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Add brochure" onClose={() => !saving && onClose()}>
      <form onSubmit={submit}>
        <div className="form">
          <div className="field full">
            <label htmlFor="brochure-trek">Trek *</label>
            <select id="brochure-trek" value={tripId} onChange={(e) => setTripId(e.target.value)} disabled={saving}>
              <option value="">Choose a trek without a brochure…</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.status !== 'published' ? ` (${t.status})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="brochure-file">Brochure PDF *</label>
            <input id="brochure-file" type="file" accept="application/pdf,.pdf" disabled={saving} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <small>Max 20 MB. Visitors download it under this file name.</small>
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Uploading…' : 'Save brochure'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Brochures() {
  const toast = useToast();
  const [list, setList] = useState(kept);
  const [busyLoading, setBusyLoading] = useState(!kept);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const fileInput = useRef(null);
  const replaceFor = useRef(null); // trek the chosen replacement file is for
  const mounted = useRef(true);

  const load = async (options) => {
    setBusyLoading(true);
    setError('');
    try {
      const data = await loadList(options);
      if (mounted.current) setList(data);
    } catch (err) {
      if (mounted.current) setError(err.message);
    } finally {
      if (mounted.current) setBusyLoading(false);
    }
  };

  // Read Hostinger only when nothing is kept yet (or a read is still running)
  useEffect(() => {
    mounted.current = true;
    if (!kept || pending) load();
    return () => {
      mounted.current = false;
    };
  }, []);

  // One trek's brochure changed: update that row only (no new FTP listing)
  const setBrochure = (id, brochure) => {
    setList((current) => {
      const next = { ...current, trips: current.trips.map((t) => (t.id === id ? { ...t, brochure } : t)) };
      keep(next);
      return next;
    });
  };

  const saved = (trip, file, brochure) => {
    setBrochure(trip.id, brochure);
    if (shownInstead(brochure, file)) {
      toast(`Saved, but Hostinger still shows "${brochure.file}" first for ${trip.name}. Delete it to use the new PDF.`, 'error');
    } else {
      toast(`Brochure saved for ${trip.name}`);
    }
  };

  const chooseReplacement = (trip) => {
    replaceFor.current = trip;
    fileInput.current.value = '';
    fileInput.current.click();
  };

  const replace = async (file) => {
    const trip = replaceFor.current;
    if (!file || !trip) return;
    const problem = fileProblem(file);
    if (problem) return toast(problem, 'error');

    setBusyId(trip.id);
    try {
      saved(trip, file, await sendPdf(trip, file));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (trip) => {
    if (!window.confirm(`Delete "${trip.brochure.file}" from Hostinger? Visitors can no longer download a brochure for ${trip.name}.`)) return;
    setBusyId(trip.id);
    try {
      const { data } = await api(`/trips/${trip.id}/brochure`, { method: 'DELETE' });
      setBrochure(trip.id, data.brochure);
      toast(data.brochure ? `Deleted. Another PDF is now used: ${data.brochure.file}` : 'Brochure deleted');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const trips = list?.trips || null;
  const withoutBrochure = trips ? trips.filter((t) => !t.brochure) : [];

  return (
    <>
      <PageHead
        title="Brochures"
        subtitle={`The PDF visitors download for each trek. Stored on Hostinger in public_html/${list?.folder || 'public/brochures'}/.`}
      >
        <button type="button" className="btn alt" onClick={() => load({ fresh: true })} disabled={busyLoading}>{busyLoading ? 'Loading…' : 'Refresh'}</button>
        <button
          type="button"
          className="btn"
          onClick={() => setAdding(true)}
          disabled={!list?.configured || !withoutBrochure.length}
          title={list && !withoutBrochure.length ? 'Every trek already has a brochure' : ''}
        >
          ＋ Add brochure
        </button>
      </PageHead>

      {list && !list.configured && (
        <div className="error-box" style={{ marginBottom: 14 }}>
          Hostinger FTP is not set up on the server (HOSTINGER_FTP_HOST, HOSTINGER_FTP_USER, HOSTINGER_FTP_PASSWORD), so brochures cannot be read or changed.
        </div>
      )}

      <input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => replace(e.target.files?.[0])} />

      <DataTable
        title="Treks"
        subtitle={trips ? `${trips.length - withoutBrochure.length} with a brochure · ${withoutBrochure.length} without` : ''}
        rows={trips}
        loading={busyLoading && !trips}
        error={error}
        exportName="fgw-brochures.csv"
        searchPlaceholder="Search treks…"
        initialSort={{ key: 'name', dir: 'asc' }}
        emptyText="No treks yet."
        columns={[
          { key: 'name', label: 'Trek', render: (t) => <b>{t.name}</b> },
          { key: 'status', label: 'Status', render: (t) => <span className={`pill ${t.status === 'published' ? '' : 'grey'}`}>{t.status}</span> },
          {
            key: 'file',
            label: 'Brochure',
            sortValue: (t) => t.brochure?.file || '',
            csv: (t) => t.brochure?.file || '',
            render: (t) => (t.brochure
              ? <span className="brochure-status ok">📄 {t.brochure.file}</span>
              : <span className="brochure-status missing">✕ No brochure</span>),
          },
          {
            key: 'size',
            label: 'Size',
            sortValue: (t) => t.brochure?.size || 0,
            csv: (t) => t.brochure?.size || '',
            render: (t) => (t.brochure?.size ? sizeOf(t.brochure.size) : '—'),
          },
          {
            key: 'actions',
            label: '',
            sortable: false,
            csv: () => '',
            render: (t) => t.brochure && (
              <div className="row-actions">
                <button type="button" className="btn alt small" disabled={!list?.configured || busyId !== null} onClick={() => chooseReplacement(t)}>
                  {busyId === t.id ? 'Saving…' : 'Replace'}
                </button>
                <button type="button" className="link danger-text" disabled={!list?.configured || busyId !== null} onClick={() => remove(t)}>Delete</button>
              </div>
            ),
          },
        ]}
      />

      {adding && (
        <AddBrochure
          trips={withoutBrochure}
          onClose={() => setAdding(false)}
          onSaved={(trip, file, brochure) => {
            setAdding(false);
            saved(trip, file, brochure);
          }}
        />
      )}
    </>
  );
}
