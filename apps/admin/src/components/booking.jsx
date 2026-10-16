import { useEffect, useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { date, dateTime, label, money, whatsappLink } from '../format';
import { FormModal, Modal, Pill, useToast } from './ui';
import { useInvoiceActions } from './invoiceActions';

const GST_RATE = 0.05;

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'other', label: 'Other' },
];

const BOOKING_STATUSES = ['confirmed', 'pending', 'completed', 'cancelled'].map((v) => ({ value: v, label: label(v) }));

/* ---------- New booking (phone / WhatsApp / walk-in) ---------- */
export function NewBookingModal({ departureId, onClose, onSaved }) {
  const toast = useToast();
  const { lookups } = useAdmin();
  const [departures, setDepartures] = useState(null);

  useEffect(() => {
    api('/departures?when=upcoming')
      .then(({ data }) => setDepartures(data))
      .catch((error) => {
        toast(error.message, 'error');
        setDepartures([]);
      });
  }, [toast]);

  if (!departures) return null;

  const departureOf = (values) => departures.find((d) => String(d.id) === String(values.departure_id));
  const tripOf = (values) => lookups?.trips.find((t) => t.id === departureOf(values)?.trip_id);

  const gstPercent = Number(lookups?.gstPercent ?? GST_RATE * 100);
  const withGst = (base) => Math.round(Number(base || 0) * (1 + gstPercent / 100) * 100) / 100;

  // Trip price × people, without GST (GST is added on top)
  const suggested = (values) => {
    const trip = tripOf(values);
    if (!trip) return 0;
    const withPrice = Number(trip.with_transport_price || trip.price);
    const withoutPrice = Number(trip.without_transport_price || trip.price);
    const subtotal =
      (Number(values.with_transport_people) || 0) * withPrice +
      (Number(values.without_transport_people) || 0) * withoutPrice;
    return Math.round(subtotal * 100) / 100;
  };

  return (
    <FormModal
      wide
      title="New booking"
      submitLabel="Create booking"
      initial={{
        departure_id: departureId || '',
        with_transport_people: 1,
        without_transport_people: 0,
        paid_amount: 0,
        payment_method: 'upi',
        status: 'confirmed',
      }}
      fields={[
        {
          name: 'departure_id',
          label: 'Trip & date',
          type: 'select',
          required: true,
          full: true,
          options: departures.map((d) => ({
            value: d.id,
            label: `${d.trip_code ? `${d.trip_code} · ` : ''}${d.trip_name} · ${date(d.start_date)}${d.end_date !== d.start_date ? ` → ${date(d.end_date)}` : ''}`,
          })),
          hint: departures.length ? '' : 'No upcoming trip coordinations. Create one in Trip Coordination first.',
        },
        { name: 'name', label: 'Customer name', required: true },
        { name: 'phone', label: 'Phone', required: true, hint: 'An existing customer with this phone is reused' },
        { name: 'email', label: 'Email', type: 'email' },
        {
          name: 'pickup_point_id',
          label: 'Pickup point',
          type: 'select',
          options: (values) =>
            (lookups?.pickupPoints || [])
              .filter((p) => p.trip_id === departureOf(values)?.trip_id)
              .map((p) => ({ value: p.id, label: p.address ? `${p.name} – ${p.address}` : p.name })),
        },
        { name: 'with_transport_people', label: 'People with transport', type: 'number', min: 0 },
        { name: 'without_transport_people', label: 'People without transport', type: 'number', min: 0 },
        {
          name: 'trip_amount',
          label: 'Trip amount (₹, without GST)',
          type: 'number',
          min: 0,
          step: '0.01',
          required: true,
          hint: (values) => {
            const base = Number(values.trip_amount) || 0;
            const parts = [];
            if (base > 0) parts.push(`+ GST ${gstPercent}% ${money(withGst(base) - base)} = Total ${money(withGst(base))}`);
            if (suggested(values)) parts.push(`Trip price × people: ${money(suggested(values))}`);
            return parts.join(' · ');
          },
        },
        {
          name: 'paid_amount', label: 'Paid now (₹)', type: 'number', min: 0, step: '0.01',
          hint: (values) => {
            const total = withGst(values.trip_amount);
            const paid = Number(values.paid_amount) || 0;
            return total > 0 ? `What the customer sent (e.g. advance) · Balance: ${money(Math.max(0, total - paid))}` : 'Leave 0 if nothing is paid yet';
          },
        },
        { name: 'payment_method', label: 'Payment method', type: 'select', options: PAYMENT_METHODS },
        { name: 'payment_reference', label: 'Payment reference', placeholder: 'UPI / transaction ID' },
        { name: 'status', label: 'Booking status', type: 'select', options: BOOKING_STATUSES },
        { name: 'notes', label: 'Notes', type: 'textarea', full: true },
      ]}
      onClose={onClose}
      onSubmit={async (values) => {
        const { data } = await api('/bookings', { method: 'POST', body: values });
        toast('Booking created');
        onSaved?.(data.id);
      }}
    />
  );
}

/* ---------- Record a balance payment ---------- */
export function PaymentModal({ booking, onClose, onSaved }) {
  const toast = useToast();
  const balance = Number(booking.balance_amount);

  // Does this amount clear the whole balance?
  const clears = (values) => Number(values.amount) + 0.009 >= balance;

  return (
    <FormModal
      title={`Collect balance · ${booking.booking_ref}`}
      submitLabel="Record payment"
      initial={{ amount: booking.balance_amount, method: 'upi', mark_completed: true }}
      fields={[
        {
          name: 'summary',
          label: 'Booking',
          type: 'info',
          full: true,
          text: `${booking.customer_name || ''} · ${booking.trip_name || ''} · Total ${money(booking.amount)} · Paid ${money(booking.amount_paid)} · Balance ${money(balance)}`,
        },
        {
          name: 'amount',
          label: 'Amount received (₹)',
          type: 'number',
          min: 0,
          step: '0.01',
          required: true,
          hint: (values) =>
            clears(values)
              ? `Clears the full balance of ${money(balance)}`
              : `Balance after this: ${money(Math.max(0, balance - Number(values.amount || 0)))}`,
        },
        { name: 'method', label: 'Method', type: 'select', options: PAYMENT_METHODS, required: true },
        { name: 'reference', label: 'Reference', placeholder: 'UPI / transaction ID' },
        { name: 'paid_at', label: 'Paid on', type: 'date', hint: 'Leave empty for today' },
        {
          name: 'mark_completed',
          label: 'Mark booking as Completed',
          type: 'checkbox',
          full: true,
          hint: (values) =>
            clears(values)
              ? 'The booking is fully paid, so it will be closed as Completed.'
              : 'Only applies once the full balance is paid.',
        },
        { name: 'note', label: 'Note', type: 'textarea', full: true },
      ]}
      onClose={onClose}
      onSubmit={async (values) => {
        const { data } = await api(`/bookings/${booking.id}/payments`, { method: 'POST', body: values });
        toast(
          data.status === 'completed'
            ? `Payment recorded · ${booking.booking_ref} is fully paid and completed`
            : Number(data.balance) > 0
              ? `Payment recorded · balance ${money(data.balance)} left`
              : `Payment recorded · ${booking.booking_ref} is fully paid`
        );
        onSaved?.();
      }}
    />
  );
}

/* ---------- Refund (PhonePe or paid back by us) ----------
 * Opened from a booking or from a payment row on the Payments screen.
 * mode: preferred way ('phonepe' | 'manual'); the form falls back to manual
 * when nothing can go back through PhonePe.
 */
export function RefundModal({ bookingId, mode: preferredMode, onClose, onSaved }) {
  const toast = useToast();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    api(`/bookings/${bookingId}`)
      .then(({ data }) => setBooking(data))
      .catch((error) => {
        toast(error.message, 'error');
        onClose();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (!booking) return null;
  const info = booking.refundInfo || {};

  if (!(info.refundable > 0)) {
    return (
      <Modal title={`Refund · ${booking.booking_ref}`} onClose={onClose} footer={<button className="btn alt" onClick={onClose}>Close</button>}>
        <div className="body">
          Nothing left to refund on this booking: paid {money(info.paid)}, refunded {money(info.refunded)}
          {info.pending > 0 ? `, ${money(info.pending)} in process` : ''}.
        </div>
      </Modal>
    );
  }

  const startMode = preferredMode === 'manual' || !info.canPhonePe ? 'manual' : 'phonepe';

  return (
    <FormModal
      title={`Refund · ${booking.booking_ref}`}
      submitLabel="Save refund"
      initial={{
        mode: startMode,
        amount: info.suggested > 0 ? info.suggested : info.suggested === 0 ? 0 : '',
        method: 'upi',
      }}
      fields={[
        {
          name: 'summary', label: 'Booking', type: 'info', full: true,
          text: `${booking.customer_name} · ${booking.trip_name || ''} · ${label(booking.status)} · Paid ${money(info.paid)} · Refunded ${money(info.refunded)}${info.pending > 0 ? ` · In process ${money(info.pending)}` : ''} · Can refund ${money(info.refundable)}`,
        },
        {
          name: 'policy', label: booking.status === 'cancelled' ? 'Cancellation policy' : 'Note', type: 'info', full: true,
          text: info.suggested == null
            ? info.policyNote
            : `${info.policyNote} → suggested ${money(info.suggested)} (${info.policyPercent}%). You can change the amount.`,
        },
        {
          name: 'mode', label: 'How was it refunded?', type: 'select', required: true, full: true,
          options: [
            { value: 'manual', label: 'We sent the money ourselves (UPI / cash / bank) — mark as refunded' },
            ...(info.canPhonePe ? [{ value: 'phonepe', label: `Through PhonePe — back to the customer's original UPI / card (up to ${money(info.phonepeRefundable)})` }] : []),
          ],
        },
        {
          name: 'amount', label: 'Amount refunded (₹)', type: 'number', min: 0, step: '0.01', required: true,
          hint: (v) => (v.mode === 'phonepe'
            ? `PhonePe sends it back; usually reaches the customer in 3–7 working days`
            : `Up to ${money(info.refundable)}`),
        },
        { name: 'method', label: 'Sent via', type: 'select', options: PAYMENT_METHODS.filter((m) => m.value !== 'phonepe'), required: true, hidden: (v) => v.mode !== 'manual' },
        { name: 'reference', label: 'Reference', placeholder: 'UPI / transaction ID', hidden: (v) => v.mode !== 'manual' },
        { name: 'refunded_at', label: 'Sent on', type: 'date', hint: 'Leave empty for today', hidden: (v) => v.mode !== 'manual' },
        { name: 'reason', label: 'Reason / note', type: 'textarea', full: true, placeholder: 'e.g. Cancelled 10 days before the trip' },
      ]}
      onClose={onClose}
      onSubmit={async (values) => {
        if (!(Number(values.amount) > 0)) throw new Error('Enter the amount refunded');
        if (!window.confirm(`${values.mode === 'phonepe' ? 'Refund' : 'Mark as refunded:'} ${money(values.amount)} to ${booking.customer_name}${values.mode === 'phonepe' ? ' through PhonePe' : ''}?`)) {
          throw new Error('Refund not saved');
        }
        const { data } = await api(`/bookings/${booking.id}/refunds`, { method: 'POST', body: values });
        toast(
          data.state === 'completed'
            ? `${money(values.amount)} marked as refunded`
            : `PhonePe refund of ${money(values.amount)} started — status updates automatically`
        );
        onSaved?.();
      }}
    />
  );
}

/* ---------- Booking details ---------- */
export function BookingDetailModal({ bookingId, onClose, onChanged }) {
  const toast = useToast();
  const { lookups, user } = useAdmin();
  const [booking, setBooking] = useState(null);
  const [paying, setPaying] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const { data } = await api(`/bookings/${bookingId}`);
      setBooking(data);
    } catch (error) {
      toast(error.message, 'error');
      onClose();
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // Invoice actions (saved PDF → WhatsApp / download / view)
  const invoice = useInvoiceActions();
  const [waMessages, setWaMessages] = useState([]);
  useEffect(() => {
    api(`/bookings/${bookingId}/whatsapp`).then(({ data }) => setWaMessages(data || [])).catch(() => setWaMessages([]));
  }, [bookingId, invoice.busy]);

  const changed = () => {
    load();
    onChanged?.();
  };

  const setStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this booking? Its seats are released.')) return;
    try {
      await api(`/bookings/${booking.id}`, { method: 'PATCH', body: { status } });
      toast('Status updated');
      changed();
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  if (!booking) return null;

  const rows = [
    ['Customer', booking.customer_name],
    ['Phone', booking.customer_phone],
    ['Email', booking.customer_email || '—'],
    ['Trip', booking.trip_name || '—'],
    ['Dates', `${date(booking.trek_start_date)}${booking.trek_end_date && booking.trek_end_date !== booking.trek_start_date ? ` → ${date(booking.trek_end_date)}` : ''}${Number(booking.is_custom_trip) ? ' (custom)' : ''}`],
    ['People', `${booking.people} (${booking.with_transport_people} with transport, ${booking.without_transport_people} without)`],
    ['Pickup', booking.pickup_name || '—'],
    ['Booked on', dateTime(booking.booked_at)],
    ['Trip amount (without GST)', money(Number(booking.amount) / (1 + Number(lookups?.gstPercent ?? 5) / 100))],
    [`GST (${Number(lookups?.gstPercent ?? 5)}%)`, money(Number(booking.amount) - Number(booking.amount) / (1 + Number(lookups?.gstPercent ?? 5) / 100))],
    ['Total (incl. GST)', money(booking.amount)],
    ['Paid', money(booking.amount_paid)],
    ['Balance', money(booking.balance_amount)],
    ['Payment', `${label(booking.payment_type)} · ${label(booking.payment_status)}`],
    ...(Number(booking.refund_amount) > 0
      ? [['Refunded', `${money(booking.refund_amount)} · ${dateTime(booking.refunded_at)}`]]
      : []),
  ];
  const info = booking.refundInfo || {};
  const canRefund = user?.modules?.includes('payments') && info.refundable > 0;

  const checkRefund = async (refund) => {
    try {
      const { data } = await api(`/refunds/${refund.id}/check`, { method: 'POST' });
      toast(data.state === 'pending' ? 'Still processing at PhonePe' : `Refund ${data.state}`, data.state === 'failed' ? 'error' : 'success');
      changed();
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return (
    <>
      <Modal
        wide
        title={`Booking ${booking.booking_ref}`}
        onClose={onClose}
        footer={
          <>
            <button className="btn whatsapp-btn" onClick={() => invoice.send(booking)} disabled={invoice.busy === booking.id}>{invoice.busy === booking.id ? 'Preparing invoice…' : 'Send invoice on WhatsApp'}</button>
            <button className="btn alt" onClick={() => invoice.view(booking)}>View invoice</button>
            <button className="btn alt" onClick={() => invoice.download(booking)}>Download PDF</button>
            <a className="btn alt" href={whatsappLink(booking.customer_phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn alt" href={`tel:${booking.customer_phone}`}>Call</a>
            <button className="btn alt" onClick={() => setEditing(true)}>Edit</button>
            {Number(booking.balance_amount) > 0 && booking.status !== 'cancelled' && (
              <button className="btn" onClick={() => setPaying(true)}>Collect balance</button>
            )}
            {canRefund && <button className={`btn ${booking.status === 'cancelled' ? 'danger' : 'alt'}`} onClick={() => setRefunding(true)}>Refund</button>}
          </>
        }
      >
        <div className="modal-section">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
            <Pill value={booking.status} />
            <Pill value={booking.payment_status} />
            <span className="muted" style={{ marginLeft: 'auto' }}>Status</span>
            <select className="inline-select" value={booking.status} onChange={(e) => setStatus(e.target.value)}>
              {BOOKING_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="details" style={{ padding: 0 }}>
            {rows.map(([title, value]) => (
              <div key={title}><small>{title}</small><b>{value}</b></div>
            ))}
          </div>
          {booking.notes && <p className="muted" style={{ marginBottom: 0 }}>📝 {booking.notes}</p>}
        </div>

        <div className="modal-section">
          <h3>Payments</h3>
          {booking.merchant_order_id && (
            <p className="muted" style={{ marginTop: 0 }}>
              Online (PhonePe) · Order {booking.merchant_order_id}
              {booking.payment_transaction_id ? ` · Txn ${booking.payment_transaction_id}` : ''}
              {booking.paid_at ? ` · ${dateTime(booking.paid_at)}` : ''}
            </p>
          )}
          {booking.payments.length === 0 ? (
            <p className="muted">No payments recorded in the admin.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>By</th><th>Note</th></tr></thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{dateTime(p.paid_at)}</td>
                    <td><b>{money(p.amount)}</b></td>
                    <td>{label(p.method)}</td>
                    <td>{p.reference || '—'}</td>
                    <td>{p.received_by_name || '—'}</td>
                    <td>{p.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {waMessages.length > 0 && (
          <div className="modal-section">
            <h3>Invoices sent on WhatsApp</h3>
            <table className="table">
              <thead><tr><th>Sent</th><th>To</th><th>Status</th><th>Last update</th></tr></thead>
              <tbody>
                {waMessages.map((m) => (
                  <tr key={m.id}>
                    <td>{dateTime(m.created_at)}</td>
                    <td>+{m.to_phone}</td>
                    <td><Pill value={m.status} />{m.error && <small className="refund-error">{m.error}</small>}</td>
                    <td>{dateTime(m.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(booking.refunds?.length > 0 || booking.status === 'cancelled') && (
          <div className="modal-section">
            <h3>Refunds</h3>
            {(booking.status === 'cancelled' || booking.refunds?.length > 0) && (
              <p className="muted" style={{ marginTop: 0 }}>
                Paid {money(info.paid)} · Refunded {money(info.refunded)}
                {info.pending > 0 ? ` · In process ${money(info.pending)}` : ''} · Can still refund {money(info.refundable)}
                {' · '}{info.policyNote}
              </p>
            )}
            {!booking.refunds?.length ? (
              <p className="muted" style={{ marginBottom: 0 }}>No refunds yet.</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Amount</th><th>Via</th><th>Status</th><th>Reference</th><th>By</th><th>Reason</th><th /></tr></thead>
                <tbody>
                  {booking.refunds.map((r) => (
                    <tr key={r.id}>
                      <td>{dateTime(r.completed_at || r.created_at)}</td>
                      <td><b>{money(r.amount)}</b></td>
                      <td>{r.mode === 'phonepe' ? 'PhonePe (original payment)' : label(r.method)}</td>
                      <td><Pill value={r.state === 'pending' ? 'in_process' : r.state} />{r.error_message && <small className="refund-error">{r.error_message}</small>}</td>
                      <td>{r.mode === 'phonepe' ? <span title={r.phonepe_refund_id || ''}>{r.merchant_refund_id}</span> : r.reference || '—'}</td>
                      <td>{r.initiated_by_name || '—'}</td>
                      <td>{r.reason || '—'}</td>
                      <td>{r.mode === 'phonepe' && r.state === 'pending' && <button className="link" onClick={() => checkRefund(r)}>Check status</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

      {paying && (
        <PaymentModal
          booking={booking}
          onClose={() => setPaying(false)}
          onSaved={() => {
            setPaying(false);
            changed();
          }}
        />
      )}

      {invoice.dialog}

      {refunding && (
        <RefundModal
          bookingId={booking.id}
          onClose={() => setRefunding(false)}
          onSaved={() => {
            setRefunding(false);
            changed();
          }}
        />
      )}

      {editing && (
        <FormModal
          title={`Edit ${booking.booking_ref}`}
          initial={{ ...booking, trip_amount: Math.round((Number(booking.amount) / (1 + Number(lookups?.gstPercent ?? 5) / 100)) * 100) / 100 }}
          fields={[
            {
              name: 'pickup_point_id',
              label: 'Pickup point',
              type: 'select',
              options: (lookups?.pickupPoints || [])
                .filter((p) => p.trip_id === booking.trip_id)
                .map((p) => ({ value: p.id, label: p.name })),
            },
            {
              name: 'trip_amount', label: 'Trip amount (₹, without GST)', type: 'number', min: 0, step: '0.01',
              hint: (values) => {
                const g = Number(lookups?.gstPercent ?? 5);
                const total = Math.round(Number(values.trip_amount || 0) * (1 + g / 100) * 100) / 100;
                return `+ GST ${g}% = Total ${money(total)} · Already paid: ${money(booking.amount_paid)}`;
              },
            },
            { name: 'notes', label: 'Notes', type: 'textarea', full: true },
          ]}
          onClose={() => setEditing(false)}
          onSubmit={async (values) => {
            await api(`/bookings/${booking.id}`, {
              method: 'PATCH',
              body: { pickup_point_id: values.pickup_point_id, trip_amount: values.trip_amount, notes: values.notes },
            });
            toast('Booking updated');
            setEditing(false);
            changed();
          }}
        />
      )}
    </>
  );
}
