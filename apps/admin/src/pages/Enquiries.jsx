import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { dateTime, label, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Stats, useToast } from '../components/ui';

const STATUSES = ['new', 'contacted', 'interested', 'booked', 'closed'];
const SOURCES = ['website', 'whatsapp', 'phone', 'instagram', 'walkin'];
const options = (list) => list.map((v) => ({ value: v, label: label(v) }));

export default function Enquiries() {
  const toast = useToast();
  const { lookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/enquiries');
  const [form, setForm] = useState(null); // null | 'new' | enquiry (note edit)

  const update = async (id, body) => {
    try {
      await api(`/enquiries/${id}`, { method: 'PATCH', body });
      toast('Enquiry updated');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const count = (status) => (data || []).filter((e) => e.status === status).length;
  const userOptions = (lookups?.users || []).map((u) => ({ value: u.id, label: u.full_name }));

  return (
    <>
      <PageHead title="Enquiries & Leads" subtitle="Track potential customers and follow-up progress.">
        <button className="btn" onClick={() => setForm('new')}>＋ Add Enquiry</button>
      </PageHead>

      <Stats
        items={[
          ['New', count('new'), 'Need a first call'],
          ['Contacted', count('contacted'), 'Waiting for reply'],
          ['Interested', count('interested'), 'Potential bookings'],
          ['Booked', count('booked'), 'Converted'],
        ]}
      />

      <DataTable
        title="Enquiry List"
        rows={data}
        loading={loading}
        error={error}
        exportName="fgw-enquiries.csv"
        searchPlaceholder="Search leads…"
        initialSort={{ key: 'received_at', dir: 'desc' }}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'trip_name', label: 'Interested trip' },
          { key: 'people', label: 'People' },
          { key: 'received_at', label: 'Received', render: (r) => dateTime(r.received_at) },
          { key: 'source', label: 'Source', render: (r) => label(r.source), csv: (r) => label(r.source) },
          {
            key: 'assigned_name', label: 'Assigned to',
            render: (r) => (
              <select className="inline-select" value={r.assigned_to || ''} onChange={(e) => update(r.id, { assigned_to: e.target.value })}>
                <option value="">—</option>
                {userOptions.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            ),
          },
          {
            key: 'status', label: 'Status', csv: (r) => label(r.status),
            render: (r) => (
              <select className="inline-select" value={r.status} onChange={(e) => update(r.id, { status: e.target.value })}>
                {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            ),
          },
          { key: 'note', label: 'Note', render: (r) => <span title={r.note || ''}>{r.note ? `${r.note.slice(0, 30)}${r.note.length > 30 ? '…' : ''}` : '—'}</span> },
          {
            key: 'actions', label: 'Action', sortable: false, export: false,
            render: (r) => (
              <>
                <a className="link" href={whatsappLink(r.phone, `Hi ${r.name}, this is The Fitness Gone Wild about your enquiry${r.trip_name ? ` for ${r.trip_name}` : ''}.`)} target="_blank" rel="noreferrer">WhatsApp</a>
                <a className="link" href={`tel:${r.phone}`}>Call</a>
                <button className="link" onClick={() => setForm(r)}>Note</button>
              </>
            ),
          },
        ]}
      />

      {form === 'new' && (
        <FormModal
          title="Add Enquiry"
          initial={{ source: 'phone', people: 1 }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'phone', label: 'Phone', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'trip_id', label: 'Interested trip', type: 'select', options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) },
            { name: 'people', label: 'People', type: 'number', min: 1 },
            { name: 'source', label: 'Source', type: 'select', options: options(SOURCES) },
            { name: 'assigned_to', label: 'Assign to', type: 'select', options: userOptions },
            { name: 'note', label: 'Note', type: 'textarea', full: true },
          ]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api('/enquiries', { method: 'POST', body: values });
            toast('Enquiry added');
            setForm(null);
            reload();
          }}
        />
      )}

      {form && form !== 'new' && (
        <FormModal
          title={`Note · ${form.name}`}
          initial={form}
          fields={[{ name: 'note', label: 'Follow-up note', type: 'textarea', rows: 5, full: true }]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api(`/enquiries/${form.id}`, { method: 'PATCH', body: { note: values.note } });
            toast('Note saved');
            setForm(null);
            reload();
          }}
        />
      )}
    </>
  );
}
