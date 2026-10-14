import { useCallback, useMemo, useState } from 'react';

import { api, useApi } from '../api';
import { siteUrl } from '../assets';
import { useAdmin } from '../context';
import { exportCsv, money } from '../format';
import { Modal, PageHead, useToast } from '../components/ui';
import MasterTable, { activeField } from '../components/MasterTable';
import TripModal from '../components/TripModal';
import { plainText } from '../components/RichTextEditor';

const toSlug = (text) =>
  String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Trip categories = the tabs here and on the website (inactive ones are hidden there)
function CategoriesModal({ onClose }) {
  return (
    <Modal wide title="Trip categories" onClose={onClose}>
      <MasterTable
        type="categories"
        title="Categories"
        note="Tabs on the website. Inactive categories are hidden there."
        singular="Category"
        fields={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Weekend treks', hint: 'Tab name' },
          { name: 'label', label: 'Label', placeholder: 'Weekend trek', hint: 'Shown on trip cards (defaults to the name)' },
          { name: 'slug', label: 'Slug', placeholder: 'weekend-treks', hint: 'Left empty: made from the name' },
          { name: 'sort_order', label: 'Order', type: 'number', min: 0, hint: 'Lower numbers come first' },
          activeField,
        ]}
        prepare={(values) => ({
          ...values,
          label: values.label || values.name,
          slug: toSlug(values.slug || values.name),
        })}
        columns={[
          { key: 'sort_order', label: 'Order' },
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'label', label: 'Label' },
          { key: 'slug', label: 'Slug' },
        ]}
      />
    </Modal>
  );
}

// Same price the website shows on cards: backpacking (category 3) is sold
// with transport only, everything else shows the without-transport price
const displayPrice = (trip) =>
  Number(trip.category_id) === 3
    ? Number(trip.with_transport_price || trip.price)
    : Number(trip.without_transport_price || trip.price);

function TripCard({ trip, onEdit }) {
  const cover = siteUrl(trip.cover_url);
  const dates = Number(trip.upcoming_departures);

  return (
    <article className={`trip-card ${trip.status !== 'published' ? 'is-hidden' : ''}`}>
      <div className="trip-cover">
        {cover ? <img src={cover} alt={trip.name} loading="lazy" /> : <div className="trip-cover-empty">No photo yet</div>}
        {Number(trip.is_featured) === 1 && <span className="trip-star" title="Featured">★</span>}
        {trip.status !== 'published' && <span className="trip-status">{trip.status}</span>}
        {trip.image_count > 1 && <span className="trip-photos">{trip.image_count} photos</span>}
      </div>

      <div className="trip-body">
        <span className="trip-category">{trip.category_label || trip.category_name || 'No category'}</span>
        <h3>{trip.name}</h3>
        <p className="trip-blurb">{plainText(trip.blurb)}</p>

        <div className="trip-tags">
          {trip.duration_label && <span>{trip.duration_label}</span>}
          {trip.difficulty && Number(trip.category_id) !== 3 && <span>{trip.difficulty}</span>}
          <span className="price">{money(displayPrice(trip))}</span>
        </div>

        <div className="trip-meta">
          <span className={trip.brochure_file ? 'ok' : 'missing'} title={trip.brochure_file || ''}>
            {trip.brochure_file ? '📄 Brochure' : '✕ No brochure'}
          </span>
          {dates > 0 && <span className="chip">{dates} upcoming date{dates > 1 ? 's' : ''}</span>}
          {trip.badge_text && <span className="chip">{trip.badge_text}</span>}
        </div>

        <div className="trip-actions">
          <button type="button" className="btn alt" onClick={() => onEdit(trip.id)}>Edit trip</button>
        </div>
      </div>
    </article>
  );
}

export default function Packages() {
  const toast = useToast();
  const { lookups, reloadLookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/trips');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(null); // tab: category id or 'all'
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(null); // null | 'new' | trip id
  const [managingCategories, setManagingCategories] = useState(false);

  const categories = useMemo(() => lookups?.categories || [], [lookups]);

  // Open the first category's tab once the categories are known
  const activeTab = category ?? (categories[0] ? String(categories[0].id) : 'all');

  // Trips matching the search + status (before picking a tab), for the tab counts
  const matching = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || [])
      .filter((t) => status === 'all' || t.status === status)
      .filter((t) => !term || `${t.name} ${t.slug} ${t.blurb}`.toLowerCase().includes(term));
  }, [data, search, status]);

  const countFor = (id) =>
    id === 'all' ? matching.length : matching.filter((t) => String(t.category_id) === id).length;

  const trips = useMemo(
    () =>
      matching
        .filter((t) => activeTab === 'all' || String(t.category_id) === activeTab)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [matching, activeTab]
  );

  const closeDrawer = useCallback(() => setEditing(null), []);
  const onSaved = useCallback(() => {
    setEditing(null);
    reload();
    reloadLookups();
  }, [reload, reloadLookups]);

  const exportTrips = () =>
    exportCsv('fgw-trips.csv', [
      { key: 'name', label: 'Trip' },
      { key: 'slug', label: 'Slug' },
      { key: 'category_name', label: 'Category' },
      { key: 'duration_label', label: 'Duration' },
      { key: 'difficulty', label: 'Difficulty' },
      { key: 'price', label: 'Price' },
      { key: 'without_transport_price', label: 'Without transport' },
      { key: 'with_transport_price', label: 'With transport' },
      { key: 'status', label: 'Status' },
      { key: 'is_featured', label: 'Featured', csv: (r) => (Number(r.is_featured) ? 'Yes' : 'No') },
      { key: 'image_count', label: 'Photos' },
      { key: 'brochure_file', label: 'Brochure' },
      { key: 'upcoming_departures', label: 'Upcoming dates' },
    ], trips);

  return (
    <>
      <PageHead title="Treks & Trips" subtitle="Add a trip, swap its photos, change the price or attach a brochure.">
        <button className="btn alt" onClick={exportTrips} disabled={!trips.length}>Export data</button>
      </PageHead>

      <div className="trip-toolbar">
        <input
          className="trip-search"
          placeholder="Search trips by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button className="btn alt" onClick={() => setManagingCategories(true)}>＋ Category</button>
        <button className="btn" onClick={() => setEditing('new')}>＋ Add new trip</button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading && !data && <div className="loading">Loading…</div>}

      <div className="tabs trip-tabs" role="tablist">
        {categories.map((c) => {
          const id = String(c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? 'active' : ''}
              onClick={() => setCategory(id)}
            >
              {c.name} <span>{countFor(id)}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setCategory('all')}
        >
          All <span>{countFor('all')}</span>
        </button>
      </div>

      {data && trips.length === 0 ? (
        <div className="trip-empty">
          <b>No trips in this tab{search || status !== 'all' ? ' match your search' : ''}</b>
          <span>Try another tab, or add one with “＋ Add new trip”.</span>
        </div>
      ) : (
        <div className="trip-grid">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onEdit={setEditing} />
          ))}
        </div>
      )}

      {managingCategories && <CategoriesModal onClose={() => setManagingCategories(false)} />}

      {editing && (
        <TripModal
          tripId={editing === 'new' ? null : editing}
          categories={categories}
          onClose={closeDrawer}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
