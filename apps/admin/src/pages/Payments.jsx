import { useState } from 'react';

import { api, useApi } from '../api';
import { dateTime, label, money } from '../format';
import DataTable from '../components/DataTable';
import { PageHead, Pill, Stats, useToast } from '../components/ui';
import { BookingDetailModal, RefundModal } from '../components/booking';
import { useAdmin } from '../context';

export default function Payments() {
  const toast = useToast();
  const { data, extra, loading, error, reload } = useApi('/payments');
  const refunds = useApi('/refunds');
  const [tab, setTab] = useState('online');
  const [bookingId, setBookingId] = useState(null);
  const [refunding, setRefunding] = useState(null); // { bookingId, mode }
  const { user } = useAdmin();

  // Refunded amount of the payment's booking, plus a Refund action
  const refundColumns = (mode) => [
    {
      key: 'refunded_amount', label: 'Refunded',
      render: (r) => (!r.booking_id ? <span className="muted">—</span>
        : Number(r.refunded_amount) > 0 || Number(r.refund_pending) > 0 ? (
          <>
            {Number(r.refunded_amount) > 0 && <><Pill value="refunded" /> <b>{money(r.refunded_amount)}</b></>}
            {Number(r.refund_pending) > 0 && <div className="muted">{money(r.refund_pending)} in process</div>}
          </>
        ) : <span className="muted">—</span>),
      csv: (r) => r.refunded_amount || 0,
    },
    {
      key: 'refund_action', label: '', sortable: false, export: false,
      render: (r) => r.booking_id && user.modules.includes('payments')
        && Number(r.booking_paid) - Number(r.refunded_amount) - Number(r.refund_pending) > 0.009
        && (mode === 'manual' || r.status === 'SUCCESS') && (
          <button className="link danger-text" onClick={() => setRefunding({ bookingId: r.booking_id, mode })}>Refund</button>
        ),
    },
  ];
  const afterChange = () => {
    reload();
    refunds.reload();
  };
  const stats = extra.stats || {};

  // Boxes on top change with the tab
  const refundRows = refunds.data || [];
  const sumOf = (rows) => rows.reduce((total, r) => total + Number(r.amount || 0), 0);
  const refundsBy = (mode, state) => refundRows.filter((r) => (!mode || r.mode === mode) && (!state || r.state === state));
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  const offline = data?.offline || [];
  const isToday = (value) => value && new Date(value).toDateString() === new Date().toDateString();
  const isThisMonth = (value) => {
    if (!value) return false;
    const d = new Date(value);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const STATS = {
    online: [
      ['Successful (online)', money(stats.success_amount), plural(stats.success_count ?? 0, 'transaction')],
      ['Pending (online)', money(stats.pending_amount), `${stats.pending_count ?? 0} not completed`],
      ['Failed (online)', money(stats.failed_amount), plural(stats.failed_count ?? 0, 'transaction')],
      ['Refunded (online)', money(sumOf(refundsBy('phonepe', 'completed'))),
        refundsBy('phonepe', 'pending').length
          ? `${money(sumOf(refundsBy('phonepe', 'pending')))} in process`
          : `${plural(refundsBy('phonepe', 'completed').length, 'refund')} via PhonePe`],
    ],
    offline: [
      ['Recorded offline', money(sumOf(offline)), plural(offline.length, 'payment')],
      ['This month (offline)', money(sumOf(offline.filter((r) => isThisMonth(r.paid_at)))), plural(offline.filter((r) => isThisMonth(r.paid_at)).length, 'payment')],
      ["Today's offline", money(sumOf(offline.filter((r) => isToday(r.paid_at)))), plural(offline.filter((r) => isToday(r.paid_at)).length, 'payment')],
      ['Refunded (offline)', money(sumOf(refundsBy('manual', 'completed'))), `${plural(refundsBy('manual', 'completed').length, 'refund')} sent by us`],
    ],
    refunds: [
      ['Total refunds', refundRows.filter((r) => r.state !== 'failed').length, `${refundsBy('phonepe').length} PhonePe · ${refundsBy('manual').length} by us`],
      ['Total amount refunded', money(sumOf(refundsBy(null, 'completed'))), plural(refundsBy(null, 'completed').length, 'completed refund')],
      ['Pending refunds', money(sumOf(refundsBy(null, 'pending'))), `${plural(refundsBy(null, 'pending').length, 'refund')} in process at PhonePe`],
      ['Failed refunds', money(sumOf(refundsBy(null, 'failed'))), plural(refundsBy(null, 'failed').length, 'refund')],
    ],
  };

  const bookingLink = (r) =>
    r.booking_id ? <button className="link" onClick={() => setBookingId(r.booking_id)}>{r.booking_ref}</button> : <span className="muted">—</span>;

  return (
    <>
      <PageHead title="Payments" subtitle="PhonePe transactions and payments recorded in the admin." />

      <div className="tabs">
        <button className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>Online (PhonePe)</button>
        <button className={tab === 'offline' ? 'active' : ''} onClick={() => setTab('offline')}>Offline (cash / UPI / bank)</button>
        <button className={tab === 'refunds' ? 'active' : ''} onClick={() => setTab('refunds')}>Refunds</button>
      </div>

      <Stats items={STATS[tab]} />

      {tab === 'refunds' ? (
        <DataTable
          title="Refunds"
          subtitle="Use Refund on a payment (Online / Offline tabs) or in the booking details. PhonePe refunds update by themselves."
          rows={refunds.data}
          loading={refunds.loading}
          error={refunds.error}
          exportName="fgw-refunds.csv"
          searchPlaceholder="Search refunds…"
          initialSort={{ key: 'created_at', dir: 'desc' }}
          emptyText="No refunds yet."
          columns={[
            { key: 'created_at', label: 'Started', render: (r) => dateTime(r.created_at) },
            { key: 'booking_ref', label: 'Booking', render: bookingLink, csv: (r) => r.booking_ref },
            { key: 'customer_name', label: 'Customer', render: (r) => <><b>{r.customer_name || '—'}</b><br /><span className="muted">{r.customer_phone}</span></>, csv: (r) => r.customer_name },
            { key: 'trip_name', label: 'Trip' },
            { key: 'amount', label: 'Amount', render: (r) => <b>{money(r.amount)}</b> },
            { key: 'mode', label: 'Via', render: (r) => (r.mode === 'phonepe' ? 'PhonePe' : label(r.method)), csv: (r) => (r.mode === 'phonepe' ? 'PhonePe' : r.method) },
            { key: 'state', label: 'Status', render: (r) => <Pill value={r.state === 'pending' ? 'in_process' : r.state} />, csv: (r) => r.state },
            { key: 'merchant_refund_id', label: 'Refund ID / ref', render: (r) => r.merchant_refund_id || r.reference || '—' },
            { key: 'completed_at', label: 'Completed', render: (r) => (r.completed_at ? dateTime(r.completed_at) : '—') },
            { key: 'initiated_by_name', label: 'By' },
            {
              key: 'actions', label: '', sortable: false, export: false,
              render: (r) => r.mode === 'phonepe' && r.state === 'pending' && (
                <button
                  className="link"
                  onClick={async () => {
                    try {
                      const { data: d } = await api(`/refunds/${r.id}/check`, { method: 'POST' });
                      toast(d.state === 'pending' ? 'Still processing at PhonePe' : `Refund ${d.state}`, d.state === 'failed' ? 'error' : 'success');
                      refunds.reload();
                    } catch (err) {
                      toast(err.message, 'error');
                    }
                  }}
                >
                  Check status
                </button>
              ),
            },
          ]}
        />
      ) : tab === 'online' ? (
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
            ...refundColumns('phonepe'),
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
            ...refundColumns('manual'),
          ]}
        />
      )}

      {bookingId && <BookingDetailModal bookingId={bookingId} onClose={() => setBookingId(null)} onChanged={afterChange} />}

      {refunding && (
        <RefundModal
          bookingId={refunding.bookingId}
          mode={refunding.mode}
          onClose={() => setRefunding(null)}
          onSaved={() => {
            setRefunding(null);
            afterChange();
          }}
        />
      )}
    </>
  );
}
