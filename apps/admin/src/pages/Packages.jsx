import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { money } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, useToast } from '../components/ui';

const DIFFICULTY = ['Easy', 'Moderate', 'Hard'].map((v) => ({ value: v, label: v }));
const STATUS = ['published', 'draft', 'archived'].map((v) => ({ value: v, label: v }));

const tripFields = (categories) => [
  { name: 'name', label: 'Trip name', required: true },
  {
    name: 'slug',
    label: 'Slug',
    required: true,
    hint: 'Lowercase, e.g. kudremukh. Also the image and brochure folder name.',
  },
  { name: 'category_id', label: 'Category', type: 'select', required: true, options: categories.map((c) => ({ value: c.id, label: c.name })) },
  { name: 'status', label: 'Status', type: 'select', options: STATUS, hint: 'Only published trips should be live' },
  { name: 'blurb', label: 'Short description (card)', required: true, full: true },
  { name: 'duration_label', label: 'Duration label', required: true, placeholder: '2D / 1N' },
  { name: 'duration_days', label: 'Duration (days)', type: 'number', min: 1 },
  { name: 'difficulty', label: 'Difficulty', type: 'select', options: DIFFICULTY },
  { name: 'distance_label', label: 'Distance', placeholder: '12 km' },
  { name: 'price', label: 'Base price (₹)', type: 'number', min: 0, step: '0.01', required: true },
  { name: 'without_transport_price', label: 'Without transport (₹)', type: 'number', min: 0, step: '0.01' },
  { name: 'with_transport_price', label: 'With transport (₹)', type: 'number', min: 0, step: '0.01' },
  { name: 'price_note', label: 'Price note', placeholder: 'per person' },
  { name: 'badge_text', label: 'Badge text', placeholder: 'Bestseller' },
  { name: 'badge_style', label: 'Badge style', type: 'select', options: [{ value: 'plain', label: 'Plain' }, { value: 'amber', label: 'Amber' }] },
  { name: 'is_featured', label: 'Show in Featured trips', type: 'checkbox' },
  { name: 'featured_label', label: 'Featured label', placeholder: 'Most booked' },
  { name: 'featured_order', label: 'Featured order', type: 'number', min: 0 },
  { name: 'description', label: 'Description', type: 'textarea', rows: 4, full: true },
  { name: 'itinerary', label: 'Itinerary', type: 'textarea', rows: 6, full: true },
];

export default function Packages() {
  const toast = useToast();
  const { lookups, reloadLookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/trips');
  const [editing, setEditing] = useState(null); // null | {} (new) | trip

  const openEdit = async (id) => {
    try {
      const { data: trip } = await api(`/trips/${id}`);
      setEditing(trip);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const save = async (values) => {
    if (editing.id) {
      await api(`/trips/${editing.id}`, { method: 'PUT', body: values });
      toast('Trip updated');
    } else {
      await api('/trips', { method: 'POST', body: values });
      toast('Trip added');
    }
    setEditing(null);
    reload();
    reloadLookups();
  };

  return (
    <>
      <PageHead title="Packages & Trips" subtitle="The treks shown on the website. Dates and seats are managed in Trip Coordination.">
        <button className="btn" onClick={() => setEditing({ status: 'draft', difficulty: 'Easy', badge_style: 'plain', duration_days: 1 })}>
          ＋ Add Package
        </button>
      </PageHead>

      <DataTable
        title="Master Packages"
        rows={data}
        loading={loading}
        error={error}
        exportName="fgw-packages.csv"
        searchPlaceholder="Search packages…"
        initialSort={{ key: 'name', dir: 'asc' }}
        columns={[
          { key: 'name', label: 'Package', render: (r) => <b>{r.name}</b> },
          { key: 'category_name', label: 'Category' },
          { key: 'difficulty', label: 'Difficulty' },
          { key: 'duration_label', label: 'Duration' },
          { key: 'without_transport_price', label: 'Without transport', render: (r) => money(r.without_transport_price || r.price) },
          { key: 'with_transport_price', label: 'With transport', render: (r) => money(r.with_transport_price) },
          { key: 'upcoming_departures', label: 'Upcoming dates' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'is_featured', label: 'Featured', render: (r) => (Number(r.is_featured) ? '★ Yes' : '—'), csv: (r) => (Number(r.is_featured) ? 'Yes' : 'No') },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          { key: 'actions', label: '', sortable: false, export: false, render: (r) => <button className="link" onClick={() => openEdit(r.id)}>Edit</button> },
        ]}
      />

      {editing && (
        <FormModal
          wide
          title={editing.id ? `Edit ${editing.name}` : 'Add Package'}
          fields={tripFields(lookups?.categories || [])}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
