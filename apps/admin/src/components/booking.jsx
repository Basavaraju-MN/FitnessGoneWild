import { useEffect, useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { date, dateTime, label, money, whatsappLink } from '../format';
import { FormModal, Modal, Pill, useToast } from './ui';

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

  const suggested = (values) => {
    const trip = tripOf(values);
    if (!trip) return 0;
    const withPrice = Number(trip.with_transport_price || trip.price);
    const withoutPrice = Number(trip.without_transport_price || trip.price);
    const subtotal =
      (Number(values.with_transport_people) || 0) * withPrice +
      (Number(values.without_transport_people) || 0) * withoutPrice;
    return Math.round(subtotal * (1 + GST_RATE) * 100) / 100;
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
            label: `TC-${d.id} · ${d.trip_name} · ${date(d.start_date)}${d.end_date !== d.start_date ? ` → ${date(d.end_date)}` : ''}`,
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
          name: 'amount',
          label: 'Total amount (₹, incl. GST)',
          type: 'number',
          min: 0,
          step: '0.01',
          required: true,
          hint: (values) => (suggested(values) ? `Suggested from trip prices + 5% GST: ${money(suggested(values))}` : ''),
        },
        { name: 'paid_amount', label: 'Paid now (₹)', type: 'number', min: 0, step: '0.01', hint: 'Leave 0 if nothing is paid yet' },
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

/* ---------- Booking details ---------- */
export function BookingDetailModal({ bookingId, onClose, onChanged }) {
  const toast = useToast();
  const { lookups } = useAdmin();
  const [booking, setBooking] = useState(null);
  const [paying, setPaying] = useState(false);
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
    ['Trip total', money(booking.amount)],
    ['Paid', money(booking.amount_paid)],
    ['Balance', money(booking.balance_amount)],
    ['Payment', `${label(booking.payment_type)} · ${label(booking.payment_status)}`],
  ];

  return (
    <>
      <Modal
        wide
        title={`Booking ${booking.booking_ref}`}
        onClose={onClose}
        footer={
          <>
            <a className="btn alt" href={whatsappLink(booking.customer_phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn alt" href={`tel:${booking.customer_phone}`}>Call</a>
            <button className="btn alt" onClick={() => setEditing(true)}>Edit</button>
            {Number(booking.balance_amount) > 0 && booking.status !== 'cancelled' && (
              <button className="btn" onClick={() => setPaying(true)}>Collect balance</button>
            )}
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

      {editing && (
        <FormModal
          title={`Edit ${booking.booking_ref}`}
          initial={booking}
          fields={[
            {
              name: 'pickup_point_id',
              label: 'Pickup point',
              type: 'select',
              options: (lookups?.pickupPoints || [])
                .filter((p) => p.trip_id === booking.trip_id)
                .map((p) => ({ value: p.id, label: p.name })),
            },
            { name: 'amount', label: 'Trip total (₹)', type: 'number', min: 0, step: '0.01', hint: `Already paid: ${money(booking.amount_paid)}` },
            { name: 'notes', label: 'Notes', type: 'textarea', full: true },
          ]}
          onClose={() => setEditing(false)}
          onSubmit={async (values) => {
            await api(`/bookings/${booking.id}`, {
              method: 'PATCH',
              body: { pickup_point_id: values.pickup_point_id, amount: values.amount, notes: values.notes },
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
