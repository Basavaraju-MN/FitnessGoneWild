import { useEffect, useState } from 'react';

import { api, useApi } from '../api';
import { date, dateTime, label, money, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, Modal, PageHead, Pill, useToast } from '../components/ui';
import { BookingDetailModal } from '../components/booking';
import { sourceOf } from '../sources';
import { LeadStatusPill } from '../components/LeadStatus';

function CustomerModal({ customerId, onClose, onChanged }) {
  const toast = useToast();
  const [customer, setCustomer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bookingId, setBookingId] = useState(null);

  const load = () =>
    api(`/customers/${customerId}`)
      .then(({ data }) => setCustomer(data))
      .catch((error) => {
        toast(error.message, 'error');
        onClose();
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (!customer) return null;

  return (
    <>
      <Modal
        wide
        title={customer.name}
        onClose={onClose}
        footer={
          <>
            <a className="btn alt" href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="btn alt" href={`tel:${customer.phone}`}>Call</a>
            <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          </>
        }
      >
        <div className="details">
          <div><small>Phone</small><b>{customer.phone}</b></div>
          <div><small>Email</small><b>{customer.email || '—'}</b></div>
          <div><small>City</small><b>{customer.city || '—'}</b></div>
          <div><small>Since</small><b>{date(customer.created_at)}</b></div>
        </div>

        <div className="modal-section">
          <h3>Bookings ({customer.bookings.length})</h3>
          {customer.bookings.length === 0 ? <p className="muted">No bookings.</p> : (
            <table className="table">
              <thead><tr><th>Booking</th><th>Trip</th><th>Date</th><th>People</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {customer.bookings.map((b) => (
                  <tr key={b.id}>
                    <td><button className="link" onClick={() => setBookingId(b.id)}>{b.booking_ref}</button></td>
                    <td>{b.trip_name}</td>
                    <td>{date(b.trek_start_date)}</td>
                    <td>{b.people}</td>
                    <td>{money(b.amount)}</td>
                    <td>{money(b.amount_paid)}</td>
                    <td>{money(b.balance_amount)}</td>
                    <td><Pill value={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-section">
          <h3>Enquiries & leads ({customer.enquiries.length})</h3>
          {customer.enquiries.length === 0 ? <p className="muted">None.</p> : customer.enquiries.map((e) => (
            <p key={e.id} style={{ margin: '0 0 6px' }}>
              {sourceOf(e.source).icon} {sourceOf(e.source).short} · {e.trip_name || 'General'} · {dateTime(e.received_at)} · <LeadStatusPill value={e.status} />
              {e.note ? <span className="muted"> · {e.note}</span> : null}
            </p>
          ))}
        </div>
      </Modal>

      {editing && (
        <FormModal
          title={`Edit ${customer.name}`}
          initial={customer}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'phone', label: 'Phone', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'city', label: 'City' },
          ]}
          onClose={() => setEditing(false)}
          onSubmit={async (values) => {
            await api(`/customers/${customer.id}`, {
              method: 'PATCH',
              body: { name: values.name, phone: values.phone, email: values.email, city: values.city },
            });
            toast('Customer updated');
            setEditing(false);
            load();
            onChanged?.();
          }}
        />
      )}

      {bookingId && <BookingDetailModal bookingId={bookingId} onClose={() => setBookingId(null)} onChanged={load} />}
    </>
  );
}

export default function Customers() {
  const { data, loading, error, reload } = useApi('/customers');
  const [openId, setOpenId] = useState(null);

  return (
    <>
      <PageHead title="Customers" subtitle="People who booked and paid (advance or full). Everyone else stays in Enquiries & Leads." />

      <DataTable
        title="Customer Directory"
        rows={data}
        loading={loading}
        error={error}
        exportName="fgw-customers.csv"
        searchPlaceholder="Search customers…"
        initialSort={{ key: 'customer_since', dir: 'desc' }}
        emptyText="No paid bookings yet."
        columns={[
          { key: 'name', label: 'Name', render: (r) => <button className="link" onClick={() => setOpenId(r.id)}>{r.name}</button>, csv: (r) => r.name },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'city', label: 'City' },
          { key: 'bookings', label: 'Bookings' },
          { key: 'total_spent', label: 'Total paid', render: (r) => money(r.total_spent) },
          { key: 'balance_due', label: 'Balance due', render: (r) => money(r.balance_due) },
          { key: 'brochure_downloads', label: 'Brochures' },
          { key: 'last_trip_date', label: 'Last trip', render: (r) => date(r.last_trip_date) },
          { key: 'customer_since', label: 'Customer since', render: (r) => date(r.customer_since) },
          {
            key: 'payment', label: 'Payment',
            sortValue: (r) => Number(r.balance_due) > 0,
            render: (r) => (Number(r.balance_due) > 0 ? <span className="pill pending">Advance paid</span> : <Pill value="paid" />),
            csv: (r) => (Number(r.balance_due) > 0 ? 'Advance paid' : 'Paid'),
          },
        ]}
      />

      {openId && <CustomerModal customerId={openId} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  );
}
