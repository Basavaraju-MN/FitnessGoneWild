import { useMemo, useState } from 'react';

import { useApi } from '../api';
import { useAdmin } from '../context';
import DataTable from '../components/DataTable';
import PickupModal from '../components/PickupModal';
import { PageHead } from '../components/ui';

/**
 * Pickup Points: one row per trek (how many pickup points, which cities).
 * View opens the trek's pickup points in a window to see and edit them.
 */
export default function PickupPoints() {
  const { lookups, reloadLookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/masters/pickup-points');
  const [openId, setOpenId] = useState(null);

  // Every trek, with its pickup points
  const treks = useMemo(() => (lookups?.trips || []).map((trip) => {
    const active = (data || []).filter((p) => p.trip_id === trip.id && Number(p.is_active));
    return {
      id: trip.id,
      name: trip.name,
      active: active.length,
      cities: [...new Set(active.map((p) => p.city_name).filter(Boolean))],
      names: active.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((p) => p.name),
    };
  }), [lookups, data]);

  return (
    <>
      <PageHead title="Pickup Points" subtitle="Click View to see and edit a trek's pickup points. They are shown in the website booking form." />

      <DataTable
        title="Treks"
        rows={treks}
        loading={loading && !data}
        error={error}
        searchPlaceholder="Search treks or pickup points…"
        exportName="fgw-pickup-points-by-trek.csv"
        initialSort={{ key: 'name', dir: 'asc' }}
        onRowClick={(r) => setOpenId(r.id)}
        columns={[
          { key: 'name', label: 'Trek / trip', render: (r) => <b>{r.name}</b> },
          {
            key: 'active',
            label: 'Pickup points',
            csv: (r) => r.active,
            render: (r) => (r.active ? <span className="pp-count">{r.active}</span> : <span className="pp-none">None yet</span>),
          },
          {
            key: 'names',
            label: 'Pickup order',
            sortValue: (r) => r.names.join(', '),
            csv: (r) => r.names.join(' → '),
            render: (r) => (r.names.length
              ? <span className="pp-names">{r.names.join(' → ')}</span>
              : <span className="muted">—</span>),
          },
          {
            key: 'cities',
            label: 'Departs from',
            sortValue: (r) => r.cities.join(', '),
            csv: (r) => r.cities.join(', '),
            render: (r) => (r.cities.length
              ? <span className="pp-cities">{r.cities.map((c) => <span key={c} className="pp-city">{c}</span>)}</span>
              : <span className="muted">—</span>),
          },
          {
            key: 'view', label: '', sortable: false, export: false,
            render: (r) => (
              <button type="button" className="btn alt small" onClick={(e) => { e.stopPropagation(); setOpenId(r.id); }}>
                {r.active ? 'View' : '＋ Add'}
              </button>
            ),
          },
        ]}
      />

      {openId && (
        <PickupModal
          tripId={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            setOpenId(null);
            reload();
            reloadLookups();
          }}
        />
      )}
    </>
  );
}
