import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { dateTime, label, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Stats, useToast } from '../components/ui';

const FOLLOW_UP = ['not_contacted', 'contacted', 'interested', 'converted', 'not_interested'];

export default function Brochures() {
  const toast = useToast();
  const { lookups } = useAdmin();
  const { data, extra, loading, error, reload } = useApi('/brochure-downloads');
  const [noteFor, setNoteFor] = useState(null);
  const stats = extra.stats || {};

  const update = async (id, body) => {
    try {
      await api(`/brochure-downloads/${id}`, { method: 'PATCH', body });
      toast('Lead updated');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHead title="Brochure Downloads" subtitle="People who downloaded a brochure from the website — follow them up." />

      <Stats
        items={[
          ['Downloads Today', stats.today ?? 0, `${stats.total ?? 0} in total`],
          ['Unique Leads', stats.unique_leads ?? 0, 'Different phone numbers'],
          ['Not Contacted', stats.not_contacted ?? 0, 'Follow-up needed'],
          ['Converted', stats.converted ?? 0, 'Became bookings'],
        ]}
      />

      <DataTable
        title="Brochure Download Leads"
        rows={data}
        loading={loading}
        error={error}
        exportName="fgw-brochure-leads.csv"
        searchPlaceholder="Search leads…"
        initialSort={{ key: 'downloaded_at', dir: 'desc' }}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'trip_name', label: 'Brochure' },
          { key: 'downloaded_at', label: 'Downloaded', render: (r) => dateTime(r.downloaded_at) },
          {
            key: 'assigned_name', label: 'Assigned to',
            render: (r) => (
              <select className="inline-select" value={r.assigned_to || ''} onChange={(e) => update(r.id, { assigned_to: e.target.value })}>
                <option value="">—</option>
                {(lookups?.users || []).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            ),
          },
          {
            key: 'follow_up_status', label: 'Follow-up', csv: (r) => label(r.follow_up_status),
            render: (r) => (
              <select className="inline-select" value={r.follow_up_status} onChange={(e) => update(r.id, { follow_up_status: e.target.value })}>
                {FOLLOW_UP.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            ),
          },
          { key: 'notes', label: 'Notes', render: (r) => <span title={r.notes || ''}>{r.notes ? `${r.notes.slice(0, 30)}${r.notes.length > 30 ? '…' : ''}` : '—'}</span> },
          {
            key: 'actions', label: 'Action', sortable: false, export: false,
            render: (r) => (
              <>
                <a className="link" href={whatsappLink(r.phone, `Hi ${r.name}, thanks for downloading the ${r.trip_name || ''} brochure from The Fitness Gone Wild. Can we help you plan the trip?`)} target="_blank" rel="noreferrer">WhatsApp</a>
                <a className="link" href={`tel:${r.phone}`}>Call</a>
                <button className="link" onClick={() => setNoteFor(r)}>Note</button>
              </>
            ),
          },
        ]}
      />

      {noteFor && (
        <FormModal
          title={`Notes · ${noteFor.name}`}
          initial={noteFor}
          fields={[{ name: 'notes', label: 'Follow-up notes', type: 'textarea', rows: 5, full: true }]}
          onClose={() => setNoteFor(null)}
          onSubmit={async (values) => {
            await api(`/brochure-downloads/${noteFor.id}`, { method: 'PATCH', body: { notes: values.notes } });
            toast('Notes saved');
            setNoteFor(null);
            reload();
          }}
        />
      )}
    </>
  );
}
