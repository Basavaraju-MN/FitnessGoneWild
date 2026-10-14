import { useApi } from '../api';
import { useAdmin } from '../context';
import { date, money } from '../format';
import DataTable from '../components/DataTable';
import { PageHead, Pill, Stats } from '../components/ui';

const TITLES = {
  admin: ['Admin Dashboard', 'Your business overview at a glance.'],
  sales: ['Sales Dashboard', 'Enquiries, brochure leads, follow-ups and conversions.'],
  operations: ['Operations Dashboard', 'Upcoming trips, travellers, teams and pending balances.'],
};

const monthName = (ym) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

export default function Dashboard() {
  const { user, go } = useAdmin();
  const { data, loading, error } = useApi('/dashboard');
  const [title, subtitle] = TITLES[user.role] || TITLES.admin;

  const revenue = data?.revenue || [];
  const maxRevenue = Math.max(1, ...revenue.map((r) => Number(r.collected)));

  return (
    <>
      <PageHead title={title} subtitle={subtitle}>
        {user.modules.includes('coordination') && (
          <button className="btn" onClick={() => go('coordination')}>Trip Coordination</button>
        )}
        {user.modules.includes('activity') && (
          <button className="btn alt" onClick={() => go('activity')}>Activity Log</button>
        )}
        {user.role === 'sales' && (
          <button className="btn" onClick={() => go('enquiries')}>Open Enquiries</button>
        )}
      </PageHead>

      {error && <div className="error-box">{error}</div>}
      {loading && !data && <div className="loading">Loading…</div>}

      {data && (
        <>
          <Stats items={data.cards} />

          <div className="card" style={{ marginBottom: 12 }}>
              <div className="cardhead">
                <div>
                  <h2>Collections</h2>
                  <p>Money received on confirmed bookings, by month (last 6 months)</p>
                </div>
              </div>
              <div className="body">
                {revenue.length === 0 && <div className="empty">No bookings yet.</div>}
                {revenue.map((row) => (
                  <div className="barrow" key={row.month}>
                    {monthName(row.month)}
                    <div className="bar">
                      <span style={{ width: `${(Number(row.collected) / maxRevenue) * 100}%` }} />
                    </div>
                    <b>{money(row.collected)}</b>
                  </div>
                ))}
              </div>
          </div>

          {user.modules.includes('coordination') && (
            <DataTable
              title="Upcoming Trip Coordinations"
              subtitle="Next departures with travellers and balances"
              searchPlaceholder=""
              actions={<button className="btn alt" onClick={() => go('coordination')}>View all</button>}
              rows={data.upcoming}
              emptyText="No upcoming trips."
              columns={[
                { key: 'id', label: 'ID', render: (r) => <b>TC-{r.id}</b> },
                { key: 'trip_name', label: 'Trip' },
                { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
                { key: 'people', label: 'Customers' },
                { key: 'guide_name', label: 'Guide', render: (r) => r.guide_name || <span className="muted">Unassigned</span> },
                { key: 'pending', label: 'Pending', render: (r) => money(r.pending) },
                { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
              ]}
            />
          )}
        </>
      )}
    </>
  );
}
