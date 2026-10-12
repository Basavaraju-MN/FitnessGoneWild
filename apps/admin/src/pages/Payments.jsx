import { useState } from 'react';

import { useApi } from '../api';
import { dateTime, label, money } from '../format';
import DataTable from '../components/DataTable';
import { PageHead, Pill, Stats } from '../components/ui';
import { BookingDetailModal } from '../components/booking';

export default function Payments() {
  const { data, extra, loading, error, reload } = useApi('/payments');
  const [tab, setTab] = useState('online');
  const [bookingId, setBookingId] = useState(null);
  const stats = extra.stats || {};

  const bookingLink = (r) =>
    r.booking_id ? <button className="link" onClick={() => setBookingId(r.booking_id)}>{r.booking_ref}</button> : <span className="muted">—</span>;

  return (
    <>
      <PageHead title="Payments" subtitle="PhonePe transactions and payments recorded in the admin." />

      <Stats
        items={[
          ['Successful (online)', money(stats.success_amount), `${stats.success_count ?? 0} transactions`],
          ['Pending (online)', money(stats.pending_amount), `${stats.pending_count ?? 0} not completed`],
          ['Failed (online)', money(stats.failed_amount), `${stats.failed_count ?? 0} transactions`],
          ['Recorded offline', money(stats.offline_amount), `${stats.offline_count ?? 0} payments`],
        ]}
      />

      <div className="tabs">
        <button className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>Online (PhonePe)</button>
        <button className={tab === 'offline' ? 'active' : ''} onClick={() => setTab('offline')}>Offline (cash / UPI / bank)</button>
      </div>

      {tab === 'online' ? (
        <DataTable
          title="PhonePe Transactions"
          subtitle="Pending ones are usually payments the customer did not finish"
          rows={data?.online}
          loading={loading}
          error={error}
          exportName="fgw-payments-online.csv"
          searchPlaceholder="Search transactions…"
          initialSort={{ key: 'created_at', dir: 'desc' }}
          columns={[
            { key: 'merchant_order_id', label: 'Order ID' },
            { key: 'booking_ref', label: 'Booking', render: bookingLink, csv: (r) => r.booking_ref },
            { key: 'customer_name', label: 'Customer', render: (r) => <><b>{r.customer_name || '—'}</b><br /><span className="muted">{r.customer_phone}</span></>, csv: (r) => r.customer_name },
            { key: 'trip_name', label: 'Trip' },
            { key: 'amount', label: 'Amount', render: (r) => money(r.amount) },
            { key: 'payment_type', label: 'Type', render: (r) => label(r.payment_type || 'full'), csv: (r) => label(r.payment_type || 'full') },
            { key: 'payment_method', label: 'Method', render: (r) => label(r.payment_method) || '—' },
            { key: 'created_at', label: 'Date', render: (r) => dateTime(r.created_at) },
            { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          ]}
        />
      ) : (
        <DataTable
          title="Offline Payments"
          subtitle="Balances and bookings paid in cash, UPI or bank transfer"
          rows={data?.offline}
          loading={loading}
          error={error}
          exportName="fgw-payments-offline.csv"
          searchPlaceholder="Search payments…"
          initialSort={{ key: 'paid_at', dir: 'desc' }}
          columns={[
            { key: 'paid_at', label: 'Date', render: (r) => dateTime(r.paid_at) },
            { key: 'booking_ref', label: 'Booking', render: bookingLink, csv: (r) => r.booking_ref },
            { key: 'customer_name', label: 'Customer' },
            { key: 'trip_name', label: 'Trip' },
            { key: 'amount', label: 'Amount', render: (r) => <b>{money(r.amount)}</b> },
            { key: 'method', label: 'Method', render: (r) => label(r.method), csv: (r) => label(r.method) },
            { key: 'reference', label: 'Reference' },
            { key: 'received_by_name', label: 'Recorded by' },
            { key: 'note', label: 'Note' },
          ]}
        />
      )}

      {bookingId && <BookingDetailModal bookingId={bookingId} onClose={() => setBookingId(null)} onChanged={reload} />}
    </>
  );
}
