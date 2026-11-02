import { useState } from 'react';

import { useApi } from '../api';
import { useAdmin } from '../context';
import { date, label, money } from '../format';
import { PERIODS, periodRange } from '../periods';
import DataTable from './DataTable';
import { Pill, Stats } from './ui';

/* ---------- Sales performance (Users & Roles) ----------
 * Pick a person (or everyone) and a period: their bookings, travellers and
 * amounts, and the bookings themselves. Based on "Sold by" on each booking
 * (set in the Bookings list or the booking form) and the booking date.
 * Cancelled bookings are not counted.
 */
export default function SalesPerformance() {
  const { lookups } = useAdmin();
  const [person, setPerson] = useState('all'); // 'all' | 'none' | user id
  const [period, setPeriod] = useState('this_month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [from, to] = periodRange(period, custom);
  const dates = [from && `from=${from}`, to && `to=${to}`].filter(Boolean).join('&');
  const periodName = period === 'custom'
    ? `${from ? date(from) : '…'} – ${to ? date(to) : '…'}`
    : PERIODS[period][0].toLowerCase();

  // Totals per person for the period (one row each)
  const summary = useApi(`/users/sales${dates ? `?${dates}` : ''}`);
  const rows = summary.data || [];

  // Everyone in the dropdown: every user, plus anyone credited on a booking
  const users = new Map((lookups?.users || []).map((u) => [String(u.id), { name: u.full_name, role: u.role }]));
  for (const r of rows) if (r.sold_by && !users.has(String(r.sold_by))) users.set(String(r.sold_by), { name: r.sold_by_name, role: r.role });
  const people = [...users].sort((a, b) => a[1].name.localeCompare(b[1].name));

  // Figures for the cards: the chosen person, or everyone together
  const chosen = person === 'all' ? rows : rows.filter((r) => (person === 'none' ? !r.sold_by : String(r.sold_by) === person));
  const total = (key) => chosen.reduce((s, r) => s + Number(r[key] || 0), 0);
  const personName = person === 'all' ? 'Everyone' : person === 'none' ? 'Not assigned' : users.get(person)?.name || 'This person';

  // The chosen person's bookings
  const bookings = useApi(person === 'all' ? null : `/users/sales/bookings?sold_by=${person}${dates ? `&${dates}` : ''}`);

  return (
    <>
      <div className="booking-filters">
        <label>
          <span>Sales representative</span>
          <select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="all">Everyone</option>
            {people.map(([id, u]) => <option key={id} value={id}>{u.name}{u.role ? ` (${label(u.role)})` : ''}</option>)}
            <option value="none">Not assigned (no one credited)</option>
          </select>
        </label>
        <label>
          <span>Booked</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {Object.entries(PERIODS).map(([key, [text]]) => <option key={key} value={key}>{text}</option>)}
          </select>
        </label>
        {period === 'custom' && (
          <>
            <label>
              <span>From</span>
              <input type="date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </label>
            <label>
              <span>To</span>
              <input type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </label>
          </>
        )}
      </div>

      <Stats
        items={[
          ['Bookings sold', summary.loading ? '…' : total('bookings'), `${personName} · ${periodName}`],
          ['Travellers', summary.loading ? '…' : total('people'), 'On those bookings'],
          ['Booking value', summary.loading ? '…' : money(total('booking_value')), 'Trip totals incl. GST'],
          ['Collected', summary.loading ? '…' : money(total('collected')), `${total('online_bookings')} paid online`],
        ]}
      />

      {person === 'all' ? (
        // Everyone: one row per person to compare; pick a name above to see their bookings
        <DataTable
          title="Everyone"
          subtitle={`Booked ${periodName} · choose a name above to see that person's bookings · cancelled bookings not counted`}
          rows={rows.map((r) => ({ ...r, row_key: r.sold_by ? String(r.sold_by) : 'none' }))}
          rowKey="row_key"
          loading={summary.loading}
          error={summary.error}
          onRowClick={(r) => setPerson(r.row_key)}
          exportName={`fgw-sales-everyone-${period}.csv`}
          searchPlaceholder="Search representative…"
          initialSort={{ key: 'bookings', dir: 'desc' }}
          emptyText="No bookings in this period."
          columns={[
            { key: 'sold_by_name', label: 'Sales representative', render: (r) => (r.sold_by ? <b>{r.sold_by_name}</b> : <span className="muted">Not assigned</span>) },
            { key: 'role', label: 'Role', render: (r) => label(r.role) || '—', csv: (r) => label(r.role) || '' },
            { key: 'bookings', label: 'Bookings' },
            { key: 'people', label: 'Travellers' },
            { key: 'booking_value', label: 'Booking value', render: (r) => money(r.booking_value) },
            { key: 'collected', label: 'Collected', render: (r) => money(r.collected) },
            { key: 'online_bookings', label: 'Paid online' },
          ]}
        />
      ) : (
        <DataTable
          key={person}
          title={`${personName} · bookings`}
          subtitle={person === 'none'
            ? `Booked ${periodName} · set "Sold by" in the Bookings list to credit them to someone`
            : `Booked ${periodName} · cancelled bookings not counted`}
          rows={bookings.data}
          loading={bookings.loading}
          error={bookings.error}
          exportName={`fgw-sales-${personName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${period}.csv`}
          searchPlaceholder="Search bookings…"
          initialSort={{ key: 'booked_at', dir: 'desc' }}
          emptyText={`No bookings by ${personName} in this period.`}
          columns={[
            { key: 'booking_ref', label: 'Booking ID', render: (r) => <b>{r.booking_ref}</b> },
            { key: 'customer_name', label: 'Customer', render: (r) => <>{r.customer_name}<br /><span className="muted">{r.customer_phone}</span></>, csv: (r) => `${r.customer_name} (${r.customer_phone})` },
            { key: 'trip_name', label: 'Trip' },
            { key: 'trek_start_date', label: 'Travel date', render: (r) => date(r.trek_start_date) },
            { key: 'people', label: 'People' },
            { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
            { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
            { key: 'payment_status', label: 'Payment', render: (r) => <Pill value={r.payment_status} /> },
            { key: 'booked_at', label: 'Booked on', render: (r) => date(r.booked_at) },
          ]}
        />
      )}
    </>
  );
}
