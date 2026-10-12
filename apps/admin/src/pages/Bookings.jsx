import { useMemo, useState } from 'react';

import { useApi } from '../api';
import { date, label, money } from '../format';
import DataTable from '../components/DataTable';
import { PageHead, Pill, Stats } from '../components/ui';
import { BookingDetailModal, NewBookingModal, PaymentModal } from '../components/booking';

export const bookingColumns = (open, collect) => [
  { key: 'booking_ref', label: 'Booking ID', render: (r) => <button className="link" onClick={() => open(r.id)}>{r.booking_ref}</button>, csv: (r) => r.booking_ref },
  { key: 'customer_name', label: 'Customer', render: (r) => <><b>{r.customer_name}</b><br /><span className="muted">{r.customer_phone}</span></>, csv: (r) => `${r.customer_name} (${r.customer_phone})` },
  { key: 'trip_name', label: 'Trip' },
  { key: 'trek_start_date', label: 'Travel date', render: (r) => date(r.trek_start_date) },
  { key: 'people', label: 'People' },
  { key: 'travel_mode', label: 'Transport', render: (r) => label(r.travel_mode) || '—', csv: (r) => label(r.travel_mode) },
  { key: 'pickup_name', label: 'Pickup' },
  { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
  { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
  { key: 'balance_amount', label: 'Balance', render: (r) => (Number(r.balance_amount) > 0 ? <b>{money(r.balance_amount)}</b> : money(0)) },
  { key: 'payment_status', label: 'Payment', render: (r) => <Pill value={r.payment_status} /> },
  { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
  { key: 'booked_at', label: 'Booked on', render: (r) => date(r.booked_at) },
  {
    key: 'actions', label: '', sortable: false, export: false,
    render: (r) =>
      collect && Number(r.balance_amount) > 0 && r.status !== 'cancelled' ? (
        <button className="btn small" onClick={() => collect(r)}>Collect balance</button>
      ) : null,
  },
];

export default function Bookings() {
  const { data, loading, error, reload } = useApi('/bookings');
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [collecting, setCollecting] = useState(null);
  const [filter, setFilter] = useState('active');

  const rows = useMemo(() => {
    const list = data || [];
    if (filter === 'active') return list.filter((b) => b.status !== 'cancelled');
    if (filter === 'balance') return list.filter((b) => b.status !== 'cancelled' && Number(b.balance_amount) > 0);
    if (filter === 'cancelled') return list.filter((b) => b.status === 'cancelled');
    return list;
  }, [data, filter]);

  const active = (data || []).filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const sum = (key) => active.reduce((s, b) => s + Number(b[key] || 0), 0);

  return (
    <>
      <PageHead title="Bookings" subtitle="Website and offline bookings with payment status.">
        <button className="btn" onClick={() => setCreating(true)}>＋ New Booking</button>
      </PageHead>

      <Stats
        items={[
          ['Confirmed bookings', active.length, `${sum('people')} travellers`],
          ['Booking value', money(sum('amount')), 'Trip totals incl. GST'],
          ['Collected', money(sum('amount_paid')), 'Online + offline'],
          ['Balance due', money(sum('balance_amount')), `${active.filter((b) => Number(b.balance_amount) > 0).length} bookings`],
        ]}
      />

      <DataTable
        title="Booking List"
        rows={rows}
        loading={loading}
        error={error}
        exportName="fgw-bookings.csv"
        searchPlaceholder="Search bookings…"
        initialSort={{ key: 'booked_at', dir: 'desc' }}
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Active</option>
            <option value="balance">Balance due</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        }
        columns={bookingColumns(setOpenId, setCollecting)}
      />

      {collecting && (
        <PaymentModal
          booking={collecting}
          onClose={() => setCollecting(null)}
          onSaved={() => {
            setCollecting(null);
            reload();
          }}
        />
      )}

      {openId && <BookingDetailModal bookingId={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
      {creating && (
        <NewBookingModal
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            reload();
            setOpenId(id);
          }}
        />
      )}
    </>
  );
}
