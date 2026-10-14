import { useMemo, useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { dateTime, whatsappLink } from '../format';
import { LEAD_SOURCES, MANUAL_SOURCES, sourceOf } from '../sources';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Stats, useToast } from '../components/ui';
import { LeadStatusSelect, ManageLeadStatuses, useLeadStatuses } from '../components/LeadStatus';

// First WhatsApp message, depending on how the lead reached us
const firstMessage = (lead) =>
  lead.source === 'brochure'
    ? `Hi ${lead.name}, thanks for downloading the ${lead.trip_name || ''} brochure from The Fitness Gone Wild. Can we help you plan the trip?`
    : `Hi ${lead.name}, this is The Fitness Gone Wild about your enquiry${lead.trip_name ? ` for ${lead.trip_name}` : ''}.`;

/**
 * Enquiries & Leads: every lead in one list, whatever the source —
 * brochure downloads (added automatically), website, WhatsApp, Instagram,
 * phone calls and walk-ins.
 */
export default function Enquiries() {
  const toast = useToast();
  const { lookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/enquiries');
  const [source, setSource] = useState('all');
  const [form, setForm] = useState(null); // null | 'new' | lead (note edit)
  const [managing, setManaging] = useState(false);
  const statuses = useLeadStatuses();

  const update = async (id, body) => {
    try {
      await api(`/enquiries/${id}`, { method: 'PATCH', body });
      toast('Lead updated');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const all = data || [];
  const rows = useMemo(
    () => (source === 'all' ? all : all.filter((lead) => lead.source === source)),
    [all, source]
  );

  const stageCount = (stage, notNew) =>
    rows.filter((lead) => statuses.of(lead.status).stage === stage && (!notNew || lead.status !== 'new')).length;
  const sourceCount = (value) => all.filter((lead) => lead.source === value).length;
  const userOptions = (lookups?.users || []).map((u) => ({ value: u.id, label: u.full_name }));

  return (
    <>
      <PageHead
        title="Enquiries & Leads"
        subtitle="Every lead in one place: brochure downloads, website, WhatsApp, Instagram, calls and walk-ins."
      >
        <button className="btn" onClick={() => setForm('new')}>＋ Add Lead</button>
      </PageHead>

      {/* Source tabs */}
      <div className="tabs lead-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={source === 'all'}
          className={source === 'all' ? 'active' : ''}
          onClick={() => setSource('all')}
        >
          All <span>{all.length}</span>
        </button>
        {LEAD_SOURCES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={source === s.value}
            className={source === s.value ? 'active' : ''}
            onClick={() => setSource(s.value)}
          >
            {s.icon} {s.short} <span>{sourceCount(s.value)}</span>
          </button>
        ))}
      </div>

      <Stats
        items={[
          ['New', rows.filter((lead) => lead.status === 'new').length, 'Need a first call'],
          ['In Progress', stageCount('open', true), 'Being followed up'],
          ['Booked', stageCount('won'), 'Converted'],
          ['Lost / Closed', stageCount('lost'), 'Not going ahead'],
        ]}
      />

      <DataTable
        key={source}
        title={source === 'all' ? 'All leads' : `${sourceOf(source).label} leads`}
        rows={rows}
        loading={loading}
        error={error}
        exportName={`fgw-leads${source === 'all' ? '' : `-${source}`}.csv`}
        searchPlaceholder="Search leads…"
        initialSort={{ key: 'received_at', dir: 'desc' }}
        emptyText="No leads here yet."
        columns={[
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          {
            key: 'source', label: 'Source',
            sortValue: (r) => sourceOf(r.source).short,
            csv: (r) => sourceOf(r.source).label,
            render: (r) => (
              <span className={`source-pill source-${r.source}`}>
                {sourceOf(r.source).icon} {sourceOf(r.source).short}
              </span>
            ),
          },
          { key: 'trip_name', label: 'Trip', render: (r) => r.trip_name || <span className="muted">General</span> },
          { key: 'people', label: 'People' },
          { key: 'received_at', label: 'Received', render: (r) => dateTime(r.received_at) },
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
            key: 'status', label: 'Status',
            sortValue: (r) => statuses.of(r.status).sort_order,
            csv: (r) => statuses.of(r.status).label,
            render: (r) => (
              <LeadStatusSelect
                value={r.status}
                onChange={(status) => update(r.id, { status })}
                onManage={() => setManaging(true)}
              />
            ),
          },
          { key: 'note', label: 'Note', render: (r) => <span title={r.note || ''}>{r.note ? `${r.note.slice(0, 30)}${r.note.length > 30 ? '…' : ''}` : ''}</span> },
          {
            key: 'actions', label: 'Action', sortable: false, export: false,
            render: (r) => (
              <>
                <a className="link" href={whatsappLink(r.phone, firstMessage(r))} target="_blank" rel="noreferrer">WhatsApp</a>
                <a className="link" href={`tel:${r.phone}`}>Call</a>
                <button className="link" onClick={() => setForm(r)}>Note</button>
              </>
            ),
          },
        ]}
      />

      {managing && <ManageLeadStatuses onClose={() => setManaging(false)} />}

      {form === 'new' && (
        <FormModal
          title="Add Lead"
          initial={{ source: source !== 'all' && source !== 'brochure' ? source : 'whatsapp', people: 1 }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'phone', label: 'Phone', required: true },
            {
              name: 'source', label: 'Source', type: 'select', required: true,
              options: MANUAL_SOURCES.map((s) => ({ value: s.value, label: `${s.icon} ${s.label}` })),
              hint: 'How did they contact us? (Brochure downloads are added automatically.)',
            },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'trip_id', label: 'Interested trip', type: 'select', options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) },
            { name: 'people', label: 'People', type: 'number', min: 1 },
            { name: 'assigned_to', label: 'Assign to', type: 'select', options: userOptions },
            { name: 'note', label: 'Note', type: 'textarea', full: true },
          ]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api('/enquiries', { method: 'POST', body: values });
            toast('Lead added');
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
