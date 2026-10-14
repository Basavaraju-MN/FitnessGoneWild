import { useEffect, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { date, label, money, today, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, Stats, useToast } from '../components/ui';
import { BookingDetailModal, NewBookingModal, PaymentModal } from '../components/booking';
import { exportTripExcel } from '../exportTripExcel';

const TRIP_STATUS = ['upcoming', 'ongoing', 'completed', 'cancelled'].map((v) => ({ value: v, label: label(v) }));

const departureFields = (lookups, isNew) => [
  ...(isNew
    ? [{ name: 'trip_id', label: 'Master trip', type: 'select', required: true, full: true, options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) }]
    : []),
  { name: 'start_date', label: 'Travel date', type: 'date', required: true },
  { name: 'end_date', label: 'Return date', type: 'date', hint: 'Same as travel date for one-day trips' },
  ...(isNew
    ? [{ name: 'departure_type', label: 'Type', type: 'select', options: [{ value: 'scheduled', label: 'Scheduled (public)' }, { value: 'custom', label: 'Custom / private group' }] }]
    : []),
  { name: 'guide_id', label: 'Guide', type: 'select', placeholder: 'Unassigned', options: (lookups?.guides || []).map((g) => ({ value: g.id, label: g.name })) },
  { name: 'trip_status', label: 'Trip status', type: 'select', options: TRIP_STATUS },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true, placeholder: 'Pickup plan, stay, special instructions…' },
];

export default function Coordination() {
  const toast = useToast();
  const { lookups } = useAdmin();
  const [when, setWhen] = useState('upcoming');
  const { data, loading, error, reload } = useApi(`/departures?when=${when}`);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null); // null | 'new' | departure
  const [addingBooking, setAddingBooking] = useState(false);
  const [openBookingId, setOpenBookingId] = useState(null);
  const [payingBooking, setPayingBooking] = useState(null);

  const loadSelected = async (id = selectedId) => {
    if (!id) return setSelected(null);
    try {
      const { data: departure } = await api(`/departures/${id}`);
      setSelected(departure);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  useEffect(() => {
    loadSelected(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Show the first trip once the list loads
  useEffect(() => {
    if (!selectedId && data?.length) setSelectedId(data[0].id);
  }, [data, selectedId]);

  // Clicking a trip shows its customers below and scrolls there
  const detailsRef = useRef(null);
  const showTrip = (id) => {
    setSelectedId(id);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const refresh = () => {
    reload();
    loadSelected();
  };

  const list = data || [];
  const sum = (key) => list.reduce((s, d) => s + Number(d[key] || 0), 0);

  const saveDeparture = async (values) => {
    if (form === 'new') {
      const { data: created } = await api('/departures', { method: 'POST', body: values });
      toast('Trip coordination created');
      setSelectedId(created.id);
    } else {
      await api(`/departures/${form.id}`, { method: 'PUT', body: values });
      toast('Trip coordination updated');
    }
    setForm(null);
    refresh();
  };

  return (
    <>
      <PageHead title="Trip Coordination" subtitle="One record per actual travel date: customers, guide and pending amounts.">
        <button className="btn" onClick={() => setForm('new')}>＋ Create Trip Coordination</button>
      </PageHead>

      <Stats
        items={[
          ['Trip Coordinations', list.length, when === 'upcoming' ? 'Upcoming & ongoing' : label(when)],
          ['Customers Going', sum('people'), 'On confirmed bookings'],
          ['Amount Pending', money(sum('pending_amount')), 'Balance to collect'],
          ['Guides Assigned', `${list.filter((d) => d.guide_id).length} / ${list.length}`, `${list.filter((d) => !d.guide_id).length} without a guide`],
        ]}
      />

      <div style={{ marginBottom: 12 }}>
        <DataTable
          title="Trip Coordination List"
          subtitle="Click a trip to see its customers below"
          rows={data}
          onRowClick={(r) => showTrip(r.id)}
          selectedKey={selectedId}
          loading={loading}
          error={error}
          exportName="fgw-coordination.csv"
          searchPlaceholder="Search coordination…"
          initialSort={{ key: 'start_date', dir: when === 'past' ? 'desc' : 'asc' }}
          actions={
            <select value={when} onChange={(e) => { setWhen(e.target.value); setSelectedId(null); }}>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All</option>
            </select>
          }
          columns={[
            { key: 'id', label: 'ID', render: (r) => <b>TC-{r.id}</b>, csv: (r) => `TC-${r.id}` },
            { key: 'trip_name', label: 'Master trip' },
            { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
            { key: 'end_date', label: 'Return date', render: (r) => date(r.end_date) },
            { key: 'departure_type', label: 'Type', render: (r) => <Pill value={r.departure_type} /> },
            { key: 'people', label: 'Customers' },
            { key: 'guide_name', label: 'Guide', render: (r) => r.guide_name || <span className="muted">Unassigned</span> },
            { key: 'pending_amount', label: 'Pending', render: (r) => money(r.pending_amount) },
            { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
            {
              key: 'actions', label: 'Action', sortable: false, export: false,
              render: (r) => (
                <>
                  <button className="link" onClick={() => showTrip(r.id)}>Customers</button>
                  <button className="link" onClick={() => setForm(r)}>Edit</button>
                </>
              ),
            },
          ]}
        />
      </div>

      {selected && (
        <div className="card trip-detail" ref={detailsRef}>
          <div className="cardhead">
            <div>
              <h2>TC-{selected.id} — Customer Coordination</h2>
              <p>{selected.trip_name} · {date(selected.start_date)}{selected.end_date !== selected.start_date ? ` → ${date(selected.end_date)}` : ''} · Guide {selected.guide_name || 'unassigned'}</p>
            </div>
            <div className="toolbar">
              <button className="btn alt" onClick={() => setForm(selected)}>Edit guide / status</button>
              <button className="btn" onClick={() => setAddingBooking(true)}>＋ Add Customer</button>
            </div>
          </div>

          <div className="details">
            {[
              ['Guide', selected.guide_name ? `${selected.guide_name}${selected.guide_phone ? ` · ${selected.guide_phone}` : ''}` : 'Unassigned'],
              ['Customers', selected.people],
              ['Collected', money(selected.paid_amount)],
              ['Pending', money(selected.pending_amount)],
              ['Status', label(selected.trip_status)],
              ['Notes', selected.notes || '—'],
            ].map(([title, value]) => (
              <div key={title}><small>{title}</small><b>{value}</b></div>
            ))}
          </div>

          <DataTable
            searchPlaceholder="Search customers…"
            actions={
              <button
                type="button"
                className="btn alt"
                disabled={!selected.customers?.length}
                onClick={() => exportTripExcel(selected).catch((error) => toast(`Export failed: ${error.message}`, 'error'))}
              >
                Export Excel
              </button>
            }
            rows={selected.customers}
            emptyText="No customers attached to this trip yet."
            initialSort={{ key: 'pickup_name', dir: 'asc' }}
            columns={[
              { key: 'customer_name', label: 'Customer', render: (r) => <b>{r.customer_name}</b> },
              { key: 'customer_phone', label: 'Phone', render: (r) => <a className="link" href={whatsappLink(r.customer_phone)} target="_blank" rel="noreferrer">{r.customer_phone}</a>, csv: (r) => r.customer_phone },
              { key: 'booking_ref', label: 'Booking', render: (r) => <button className="link" onClick={() => setOpenBookingId(r.id)}>{r.booking_ref}</button>, csv: (r) => r.booking_ref },
              { key: 'people', label: 'People' },
              { key: 'travel_mode', label: 'Transport', render: (r) => label(r.travel_mode) || '—', csv: (r) => label(r.travel_mode) },
              { key: 'pickup_name', label: 'Pickup', render: (r) => r.pickup_name || 'Self' },
              { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
              { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
              { key: 'balance_amount', label: 'Pending', render: (r) => <b>{money(r.balance_amount)}</b> },
              { key: 'status', label: 'Status', render: (r) => (r.status === 'cancelled' ? <Pill value="cancelled" /> : <Pill value={r.payment_status} />) },
              {
                key: 'actions', label: '', sortable: false, export: false,
                render: (r) =>
                  Number(r.balance_amount) > 0 && r.status !== 'cancelled' ? (
                    <button className="btn small" onClick={() => setPayingBooking({ ...r, trip_name: selected.trip_name })}>Collect balance</button>
                  ) : null,
              },
            ]}
          />
        </div>
      )}

      {form && (
        <FormModal
          wide
          title={form === 'new' ? 'Create Trip Coordination' : `Edit TC-${form.id} · ${form.trip_name}`}
          submitLabel={form === 'new' ? 'Create Coordination' : 'Save'}
          initial={form === 'new' ? { start_date: today(), trip_status: 'upcoming', departure_type: 'scheduled' } : form}
          fields={departureFields(lookups, form === 'new')}
          onClose={() => setForm(null)}
          onSubmit={saveDeparture}
        />
      )}

      {addingBooking && selected && (
        <NewBookingModal
          departureId={selected.id}
          onClose={() => setAddingBooking(false)}
          onSaved={() => {
            setAddingBooking(false);
            refresh();
          }}
        />
      )}

      {openBookingId && <BookingDetailModal bookingId={openBookingId} onClose={() => setOpenBookingId(null)} onChanged={refresh} />}

      {payingBooking && (
        <PaymentModal
          booking={payingBooking}
          onClose={() => setPayingBooking(null)}
          onSaved={() => {
            setPayingBooking(null);
            refresh();
          }}
        />
      )}
    </>
  );
}
