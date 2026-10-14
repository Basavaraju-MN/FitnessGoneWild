import { useState } from 'react';

import { useApi } from '../api';
import { dateTime, label } from '../format';
import DataTable from '../components/DataTable';
import { PageHead } from '../components/ui';

const FEED_LABEL = {
  enquiry: 'New enquiry',
  booking: 'Booking',
  brochure: 'Brochure downloaded',
  payment: 'Payment received',
  refund: 'Refund',
};

const TABS = [
  ['feed', 'Business activity', 'Enquiries, brochure downloads, bookings, payments and refunds'],
  ['admin', 'Admin actions', 'What each admin user did in the portal'],
];

export default function Activity() {
  const [tab, setTab] = useState('feed');
  const { data, loading, error } = useApi(`/activity?type=${tab}`);
  const [, title, note] = TABS.find(([key]) => key === tab);

  return (
    <>
      <PageHead title="Activity Log" subtitle="Everything that happened, newest first." />

      <div className="tabs" role="tablist">
        {TABS.map(([key, text]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {text}
          </button>
        ))}
      </div>

      {tab === 'feed' ? (
        <DataTable
          key="feed"
          title={title}
          subtitle={note}
          rows={data}
          loading={loading}
          error={error}
          rowKey="_none"
          exportName="fgw-activity.csv"
          searchPlaceholder="Search activity…"
          initialSort={{ key: 'at', dir: 'desc' }}
          emptyText="Nothing yet."
          columns={[
            { key: 'at', label: 'When', render: (r) => dateTime(r.at) },
            { key: 'type', label: 'Activity', render: (r) => <span className={`activity-type activity-${r.type}`}>{FEED_LABEL[r.type] || label(r.type)}</span>, csv: (r) => FEED_LABEL[r.type] || r.type },
            { key: 'title', label: 'Name', render: (r) => <b>{r.title || '—'}</b> },
            { key: 'detail', label: 'Details', render: (r) => r.detail || <span className="muted">—</span> },
          ]}
        />
      ) : (
        <DataTable
          key="admin"
          title={title}
          subtitle={note}
          rows={data}
          loading={loading}
          error={error}
          exportName="fgw-admin-actions.csv"
          searchPlaceholder="Search actions…"
          initialSort={{ key: 'created_at', dir: 'desc' }}
          emptyText="No admin actions yet."
          columns={[
            { key: 'created_at', label: 'When', render: (r) => dateTime(r.created_at) },
            { key: 'full_name', label: 'User', render: (r) => <b>{r.full_name || r.username || 'System'}</b>, csv: (r) => r.full_name || r.username || 'System' },
            { key: 'role', label: 'Role', render: (r) => label(r.role) || '—' },
            { key: 'action', label: 'Action', render: (r) => label(r.action) },
            { key: 'entity_type', label: 'Section', render: (r) => label(r.entity_type) || '—' },
            { key: 'entity_id', label: 'Record', render: (r) => (r.entity_id ? `#${r.entity_id}` : '—') },
            { key: 'detail', label: 'Details', render: (r) => r.detail || <span className="muted">—</span> },
          ]}
        />
      )}
    </>
  );
}
