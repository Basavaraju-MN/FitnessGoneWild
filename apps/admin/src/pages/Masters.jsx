import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, useToast } from '../components/ui';

const active = { name: 'is_active', label: 'Active', type: 'checkbox' };

const MASTERS = (lookups) => ({
  guides: {
    title: 'Guides',
    note: 'Trek leaders you assign to trips',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'phone', label: 'Phone' },
      { name: 'email', label: 'Email', type: 'email' },
      active,
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  vehicles: {
    title: 'Vehicles',
    note: 'Buses and tempo travellers',
    fields: [
      { name: 'vehicle_number', label: 'Vehicle number', required: true, placeholder: 'KA-01-AB-1234' },
      { name: 'vehicle_type', label: 'Type', placeholder: 'Tempo Traveller / Bus' },
      { name: 'seats', label: 'Seats', type: 'number', min: 1 },
      { name: 'provider', label: 'Provider' },
      { name: 'provider_phone', label: 'Provider phone' },
      active,
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'vehicle_number', label: 'Vehicle', render: (r) => <b>{r.vehicle_number}</b> },
      { key: 'vehicle_type', label: 'Type' },
      { key: 'seats', label: 'Seats' },
      { key: 'provider', label: 'Provider' },
      { key: 'provider_phone', label: 'Provider phone' },
    ],
  },
  drivers: {
    title: 'Drivers',
    note: 'Driver contacts and licence',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'phone', label: 'Phone' },
      { name: 'license_number', label: 'Licence number' },
      active,
      { name: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    columns: [
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'phone', label: 'Phone' },
      { key: 'license_number', label: 'Licence' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  'pickup-points': {
    title: 'Pickup points',
    note: 'Shown in the website booking form for each trip',
    fields: [
      { name: 'trip_id', label: 'Trip', type: 'select', required: true, full: true, options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) },
      { name: 'name', label: 'Name', required: true, placeholder: 'Indiranagar', hint: 'Saved with the booking and shown on the receipt' },
      { name: 'address', label: 'Landmark / address', placeholder: 'Karachi Bakery, Indiranagar' },
      { name: 'map_url', label: 'Google Maps link' },
      { name: 'sort_order', label: 'Order', type: 'number', min: 0 },
      active,
    ],
    columns: [
      { key: 'trip_name', label: 'Trip' },
      { key: 'sort_order', label: 'Order' },
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'address', label: 'Landmark / address' },
    ],
  },
  categories: {
    title: 'Categories',
    note: 'Trek tabs on the website (inactive ones are hidden)',
    fields: [
      { name: 'name', label: 'Name', required: true, placeholder: 'Weekend treks' },
      { name: 'label', label: 'Label', required: true, placeholder: 'Weekend trek' },
      { name: 'slug', label: 'Slug', required: true, placeholder: 'weekend' },
      { name: 'sort_order', label: 'Order', type: 'number', min: 0 },
      active,
    ],
    columns: [
      { key: 'sort_order', label: 'Order' },
      { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
      { key: 'label', label: 'Label' },
      { key: 'slug', label: 'Slug' },
    ],
  },
});

export default function Masters() {
  const toast = useToast();
  const { lookups, reloadLookups } = useAdmin();
  const [type, setType] = useState('guides');
  const [editing, setEditing] = useState(null);
  const { data, loading, error, reload } = useApi(`/masters/${type}`);

  const masters = MASTERS(lookups);
  const master = masters[type];

  const save = async (values) => {
    if (editing.id) {
      await api(`/masters/${type}/${editing.id}`, { method: 'PUT', body: values });
      toast(`${master.title} updated`);
    } else {
      await api(`/masters/${type}`, { method: 'POST', body: values });
      toast(`${master.title} added`);
    }
    setEditing(null);
    reload();
    reloadLookups();
  };

  return (
    <>
      <PageHead title="Master Data" subtitle="Reusable records used in trip coordination and on the website.">
        <button className="btn" onClick={() => setEditing({ is_active: 1 })}>＋ Add {master.title.replace(/s$/, '').toLowerCase()}</button>
      </PageHead>

      <div className="tabs">
        {Object.entries(masters).map(([key, m]) => (
          <button key={key} className={key === type ? 'active' : ''} onClick={() => setType(key)}>{m.title}</button>
        ))}
      </div>

      <DataTable
        key={type}
        title={master.title}
        subtitle={master.note}
        rows={data}
        loading={loading}
        error={error}
        exportName={`fgw-${type}.csv`}
        searchPlaceholder={`Search ${master.title.toLowerCase()}…`}
        columns={[
          ...master.columns,
          { key: 'is_active', label: 'Status', render: (r) => <Pill value={Number(r.is_active) ? 'active' : 'inactive'} />, csv: (r) => (Number(r.is_active) ? 'Active' : 'Inactive') },
          { key: 'actions', label: '', sortable: false, export: false, render: (r) => <button className="link" onClick={() => setEditing(r)}>Edit</button> },
        ]}
      />

      {editing && (
        <FormModal
          title={editing.id ? `Edit ${master.title.replace(/s$/, '').toLowerCase()}` : `Add ${master.title.replace(/s$/, '').toLowerCase()}`}
          fields={master.fields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
