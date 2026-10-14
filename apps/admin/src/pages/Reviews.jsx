import { useEffect, useMemo, useState } from 'react';

import { api, useApi } from '../api';
import { date, dateTime } from '../format';
import DataTable from '../components/DataTable';
import { Modal, PageHead, Pill, Stats, useToast } from '../components/ui';
import { pagePath } from '../router';

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

const RESULT_MESSAGES = {
  connected: ['Google connected', 'success'],
  cancelled: ['Google sign-in was cancelled', 'error'],
  failed: ['Could not connect Google — see the message on the Google card', 'error'],
};

/* ---------- Google Business Profile connection ---------- */
function GoogleCard({ status, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [locations, setLocations] = useState(null);

  const run = async (name, action) => {
    setBusy(name);
    try {
      await action();
    } catch (error) {
      toast(error.message, 'error');
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const connect = () =>
    run('connect', async () => {
      const { data } = await api('/google/connect');
      window.location.href = data.url; // Google sign-in, then back here
    });

  const sync = () =>
    run('sync', async () => {
      const { data } = await api('/google/sync', { method: 'POST' });
      toast(`Synced ${data.total} Google reviews · ${data.added} new${data.removed ? ` · ${data.removed} removed` : ''}`);
      onChanged();
    });

  const chooseLocation = () =>
    run('locations', async () => {
      const { data } = await api('/google/locations');
      if (!data.length) throw new Error('No business locations found for this Google account');
      setLocations(data);
    });

  const pick = (location) =>
    run('pick', async () => {
      const { data } = await api('/google/location', { method: 'PUT', body: location });
      setLocations(null);
      toast(`${location.title} selected · ${data.total} reviews synced`);
      onChanged();
    });

  const disconnect = () => {
    if (!window.confirm('Disconnect Google? Synced reviews stay; new ones stop coming in.')) return;
    run('disconnect', async () => {
      await api('/google/disconnect', { method: 'POST' });
      toast('Google disconnected');
      onChanged();
    });
  };

  if (!status) return null;

  return (
    <div className="card google-card">
      <div className="cardhead">
        <div>
          <h2>Google Business Profile</h2>
          <p>
            {!status.configured
              ? 'Not set up yet: add the Google OAuth client on the server (see below).'
              : !status.connected
                ? 'Connect the Google account that manages your business listing to sync every review.'
                : status.locationTitle
                  ? `${status.locationTitle} · ${status.email || 'connected'} · syncs every ${status.syncHours} h`
                  : `Connected as ${status.email || 'Google account'} — choose your business location.`}
          </p>
        </div>
        <div className="toolbar">
          {status.configured && !status.connected && (
            <button className="btn" onClick={connect} disabled={!!busy}>{busy === 'connect' ? 'Opening Google…' : 'Connect Google'}</button>
          )}
          {status.connected && (
            <>
              <button className="btn alt" onClick={chooseLocation} disabled={!!busy}>{status.locationTitle ? 'Change location' : 'Choose location'}</button>
              {status.locationTitle && (
                <button className="btn" onClick={sync} disabled={!!busy}>{busy === 'sync' ? 'Syncing…' : '↻ Sync now'}</button>
              )}
              <button className="btn alt" onClick={disconnect} disabled={!!busy}>Disconnect</button>
            </>
          )}
        </div>
      </div>

      {status.connected && status.locationTitle && (
        <div className="details">
          <div><small>Google rating</small><b>{status.averageRating != null ? `${status.averageRating} ★` : '—'}</b></div>
          <div><small>Reviews on Google</small><b>{status.totalReviews ?? '—'}</b></div>
          <div><small>Last synced</small><b>{status.lastSyncedAt ? dateTime(status.lastSyncedAt) : 'Not yet'}</b></div>
          <div><small>Signed in as</small><b>{status.email || '—'}</b></div>
        </div>
      )}

      {status.lastError && <div className="error-box" style={{ margin: '0 14px 12px' }}>Last problem: {status.lastError}</div>}

      {!status.configured && (
        <div className="body google-setup">
          <ol>
            <li>In Google Cloud, enable the <b>My Business Account Management</b>, <b>My Business Business Information</b> and <b>Google My Business</b> APIs (needs Business Profile API access approved by Google).</li>
            <li>Create an <b>OAuth client ID</b> (Web application) with this redirect URI: <code>{status.redirectUri}</code></li>
            <li>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to the server environment and restart it.</li>
          </ol>
        </div>
      )}

      {locations && (
        <Modal title="Choose your business location" onClose={() => setLocations(null)}>
          <div className="body">
            {locations.map((l) => (
              <button key={l.location_name} type="button" className="location-option" onClick={() => pick(l)} disabled={!!busy}>
                <b>{l.title}</b>
                <small>{l.address || l.location_name}</small>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function Reviews() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/reviews');
  const google = useApi('/google/status');
  const [source, setSource] = useState('all');
  const [reading, setReading] = useState(null);

  // Back from Google sign-in: /reviews?google=connected
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('google');
    if (!result) return;
    const [message, type] = RESULT_MESSAGES[result] || RESULT_MESSAGES.failed;
    toast(message, type);
    window.history.replaceState(null, '', pagePath('reviews'));
    reload();
  }, [toast, reload]);

  const all = useMemo(() => data || [], [data]);
  const rows = source === 'all' ? all : all.filter((r) => r.source === source);
  const count = (s) => all.filter((r) => r.source === s).length;
  const published = rows.filter((r) => r.status === 'published');
  const average = published.length ? (published.reduce((s, r) => s + Number(r.rating), 0) / published.length).toFixed(1) : '—';

  const setStatus = async (review, status) => {
    try {
      await api(`/reviews/${review.id}`, { method: 'PATCH', body: { status } });
      toast(status === 'published' ? 'Shown on the website' : 'Hidden from the website');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const refreshAll = () => {
    reload();
    google.reload();
  };

  return (
    <>
      <PageHead title="Reviews" subtitle="Google reviews (synced automatically) and website reviews. Choose which ones show on the website." />

      <GoogleCard status={google.data} onChanged={refreshAll} />

      <div className="tabs lead-tabs" role="tablist">
        {[['all', 'All', all.length], ['google', 'Google', count('google')], ['website', 'Website', count('website')]].map(([value, text, n]) => (
          <button key={value} type="button" role="tab" aria-selected={source === value} className={source === value ? 'active' : ''} onClick={() => setSource(value)}>
            {text} <span>{n}</span>
          </button>
        ))}
      </div>

      <Stats
        items={[
          ['Reviews', rows.length, source === 'all' ? 'Google + website' : `From ${source}`],
          ['On the website', published.length, 'Published'],
          ['Average rating', average, 'Of published reviews'],
          ['Hidden / pending', rows.length - published.length, 'Not shown on the website'],
        ]}
      />

      <DataTable
        key={source}
        title={source === 'all' ? 'All reviews' : source === 'google' ? 'Google reviews' : 'Website reviews'}
        rows={rows}
        loading={loading}
        error={error}
        exportName={`fgw-reviews${source === 'all' ? '' : `-${source}`}.csv`}
        searchPlaceholder="Search reviews…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        emptyText={source === 'google' ? 'No Google reviews yet — connect Google above.' : 'No reviews yet.'}
        onRowClick={setReading}
        columns={[
          { key: 'source', label: 'Source', render: (r) => <span className={`source-pill source-${r.source}`}>{r.source === 'google' ? 'G Google' : '🌐 Website'}</span>, csv: (r) => r.source },
          { key: 'author_name', label: 'Reviewer', render: (r) => <b>{r.author_name}</b> },
          { key: 'rating', label: 'Rating', render: (r) => <span className="review-stars">{stars(Number(r.rating))}</span>, csv: (r) => r.rating },
          { key: 'body', label: 'Review', render: (r) => (r.body ? <span className="review-text">{r.body}</span> : <span className="muted">Rating only</span>) },
          { key: 'owner_reply', label: 'Reply', render: (r) => (r.owner_reply ? <Pill value="replied" /> : <span className="muted">—</span>), csv: (r) => r.owner_reply || '' },
          { key: 'trip_name', label: 'Trip', render: (r) => r.trip_name || <span className="muted">—</span> },
          { key: 'created_at', label: 'Date', render: (r) => date(r.created_at) },
          { key: 'status', label: 'Website', render: (r) => <Pill value={r.status} /> },
          {
            key: 'actions', label: '', sortable: false, export: false,
            render: (r) =>
              r.status === 'published'
                ? <button className="link" onClick={() => setStatus(r, 'hidden')}>Hide</button>
                : <button className="link" onClick={() => setStatus(r, 'published')}>Show</button>,
          },
        ]}
      />

      {reading && (
        <Modal
          title={`${reading.author_name} · ${stars(Number(reading.rating))}`}
          onClose={() => setReading(null)}
          footer={
            reading.status === 'published'
              ? <button className="btn alt" onClick={() => { setStatus(reading, 'hidden'); setReading(null); }}>Hide from website</button>
              : <button className="btn" onClick={() => { setStatus(reading, 'published'); setReading(null); }}>Show on website</button>
          }
        >
          <div className="body review-full">
            <small className="muted">{reading.source === 'google' ? 'Google review' : 'Website review'} · {dateTime(reading.created_at)}{reading.trip_name ? ` · ${reading.trip_name}` : ''}</small>
            <p>{reading.body || <span className="muted">No text, rating only.</span>}</p>
            {reading.owner_reply && (
              <div className="review-reply">
                <small>Your reply</small>
                <p>{reading.owner_reply}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
