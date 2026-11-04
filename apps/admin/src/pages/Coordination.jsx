import { useEffect, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { date, label, money, today, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, Stats, useToast } from '../components/ui';
import { BookingDetailModal, NewBookingModal, PaymentModal } from '../components/booking';
import { exportTripExcel } from '../exportTripExcel';
import { RowMenu, useInvoiceActions } from '../components/invoiceActions';
import SearchSelect from '../components/SearchSelect';

const TRIP_STATUS = ['upcoming', 'ongoing', 'completed', 'cancelled'].map((v) => ({ value: v, label: label(v) }));
// departures.status: whether the website still takes bookings for this date
const BOOKING_STATUS = [{ value: 'open', label: 'Open for booking' }, { value: 'full', label: 'Sold out' }];
// Completed tab: trips marked completed (or cancelled); everything else is Upcoming
const isDone = (d) => d.trip_status === 'completed' || d.trip_status === 'cancelled';

// "2 × Chennai to Chennai" for price options booked, else With / Without transport
const ticketsLabel = (r) =>
  r.tickets?.length ? r.tickets.map((t) => `${t.people} × ${t.label}`).join(', ') : label(r.travel_mode);
// "Sold out" when marked so, or when every seat is booked
const isSoldOut = (d) => d.status === 'full' || (Number(d.seats_total) > 0 && Number(d.seats_booked) >= Number(d.seats_total));

const departureFields = (lookups, isNew) => [
  // The trek comes first (already chosen when a trek is picked on the screen)
  ...(isNew
    ? [{ name: 'trip_id', label: 'Trek', type: 'select', required: true, full: true, placeholder: 'Choose the trek', options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) }]
    : []),
  {
    name: 'trip_code', label: 'Trip code',
    placeholder: isNew ? 'Given with the first booking' : 'e.g. TC-0012',
    hint: 'Your own trip number. Left empty, it is given automatically when the first customer is added (pattern in Settings).',
  },
  { name: 'start_date', label: 'Travel date', type: 'date', required: true },
  { name: 'end_date', label: 'Return date', type: 'date', hint: 'Same as travel date for one-day trips' },
  ...(isNew
    ? [{ name: 'departure_type', label: 'Type', type: 'select', options: [{ value: 'scheduled', label: 'Scheduled (public)' }, { value: 'custom', label: 'Custom / private group' }] }]
    : []),
  { name: 'guide_id', label: 'Guide', type: 'select', placeholder: 'Unassigned', options: (lookups?.guides || []).map((g) => ({ value: g.id, label: g.name })) },
  { name: 'seats_total', label: 'Seats', type: 'number', min: 1, step: '1', hint: 'Shown as sold out by itself when this many people have booked' },
  { name: 'status', label: 'Booking on the website', type: 'select', options: BOOKING_STATUS, hint: 'Scheduled (public) dates only: Sold out shows the date as sold out' },
  { name: 'trip_status', label: 'Trip status', type: 'select', options: TRIP_STATUS },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true, placeholder: 'Pickup plan, stay, special instructions…' },
];

export default function Coordination() {
  const toast = useToast();
  const { lookups } = useAdmin();
  // Pick a trek first, then its trips split into Upcoming and Completed
  const [tripId, setTripId] = useState('');
  const [tab, setTab] = useState('upcoming');
  const { data, loading, error, reload } = useApi(`/departures?when=all${tripId ? `&trip_id=${tripId}` : ''}`);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null); // null | 'new' | departure
  const [addingBooking, setAddingBooking] = useState(false);
  const [openBookingId, setOpenBookingId] = useState(null);
  const [payingBooking, setPayingBooking] = useState(null);
  const invoice = useInvoiceActions();

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

  const all = data || [];
  const done = all.filter(isDone);
  const open = all.filter((d) => !isDone(d));
  const list = tab === 'completed' ? done : open;

  // Show the first trip of the tab (also after one moved to the other tab)
  useEffect(() => {
    if (loading) return;
    if (!list.some((d) => d.id === selectedId)) setSelectedId(list[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, loading]);

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

  const sum = (key) => list.reduce((s, d) => s + Number(d[key] || 0), 0);
  const trekName = (lookups?.trips || []).find((t) => String(t.id) === String(tripId))?.name;

  // Completed: moves to the Completed tab; Reopen: back to Upcoming
  const setTripStatus = async (departure, tripStatus) => {
    const name = `${departure.trip_code || departure.trip_name} (${date(departure.start_date)})`;
    if (tripStatus === 'completed' && !window.confirm(`Mark ${name} as completed? It moves to the Completed tab.`)) return;
    try {
      await api(`/departures/${departure.id}`, { method: 'PUT', body: { trip_status: tripStatus } });
      toast(tripStatus === 'completed' ? 'Marked as completed' : 'Moved back to Upcoming');
      refresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

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
      <PageHead title="Trip Coordination" subtitle="Pick a trek to see its trips. One record per actual travel date: customers, guide and pending amounts.">
        <button className="btn" onClick={() => setForm('new')}>
          ＋ Create Trip Coordination{trekName ? ` for ${trekName}` : ''}
        </button>
      </PageHead>

      {/* Trek first, then its trips: Upcoming or Completed */}
      <div className="coord-filter">
        <label className="coord-trek">
          <span>Trek</span>
          <SearchSelect
            value={tripId}
            onChange={(value) => { setTripId(value); setSelectedId(null); }}
            placeholder="All treks"
            searchable
            options={(lookups?.trips || []).map((t) => ({ value: t.id, label: t.name }))}
          />
        </label>
        <div className="tabs coord-tabs" role="tablist">
          {[['upcoming', 'Upcoming', open.length], ['completed', 'Completed', done.length]].map(([key, text, count]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {text} <span className="tab-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <Stats
        items={[
          ['Trip Coordinations', list.length, `${tab === 'completed' ? 'Completed & cancelled' : 'Upcoming & ongoing'}${trekName ? ` · ${trekName}` : ''}`],
          ['Customers Going', sum('people'), 'On confirmed bookings'],
          ['Amount Pending', money(sum('pending_amount')), 'Balance to collect'],
          ['Guides Assigned', `${list.filter((d) => d.guide_id).length} / ${list.length}`, `${list.filter((d) => !d.guide_id).length} without a guide`],
        ]}
      />

      <div style={{ marginBottom: 12 }}>
        <DataTable
          key={tab}
          title={tab === 'completed' ? 'Completed trips' : 'Upcoming trips'}
          subtitle={tab === 'completed'
            ? 'Newest first. Reopen moves a trip back to Upcoming.'
            : 'Click a trip to see its customers below. Mark completed when the trip is over.'}
          rows={list}
          onRowClick={(r) => showTrip(r.id)}
          selectedKey={selectedId}
          loading={loading}
          error={error}
          exportName={`fgw-coordination-${tab}.csv`}
          searchPlaceholder="Search coordination…"
          initialSort={{ key: 'start_date', dir: tab === 'completed' ? 'desc' : 'asc' }}
          emptyText={tab === 'completed'
            ? 'No completed trips yet.'
            : `No upcoming trips${trekName ? ` for ${trekName}` : ''}. Create one with “＋ Create Trip Coordination”.`}
          columns={[
            { key: 'trip_code', label: 'Trip code', render: (r) => (r.trip_code ? <b>{r.trip_code}</b> : <span className="muted">No code yet</span>), csv: (r) => r.trip_code || '' },
            // One trek picked: its name is in the dropdown, no need for a column
            ...(tripId ? [] : [{ key: 'trip_name', label: 'Trek' }]),
            { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
            { key: 'end_date', label: 'Return date', render: (r) => date(r.end_date) },
            { key: 'departure_type', label: 'Type', render: (r) => <Pill value={r.departure_type} /> },
            { key: 'people', label: 'Customers' },
            {
              key: 'seats_booked', label: 'Seats',
              render: (r) => (
                <span>
                  {Number(r.seats_booked) || 0}/{r.seats_total || '—'}{' '}
                  {r.departure_type === 'scheduled' && (isSoldOut(r) ? <Pill value="sold out" /> : null)}
                </span>
              ),
              csv: (r) => `${Number(r.seats_booked) || 0}/${r.seats_total || ''}${isSoldOut(r) ? ' sold out' : ''}`,
            },
            { key: 'guide_name', label: 'Guide', render: (r) => r.guide_name || <span className="muted">Unassigned</span> },
            { key: 'pending_amount', label: 'Pending', render: (r) => money(r.pending_amount) },
            { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
            {
              key: 'actions', label: 'Action', sortable: false, export: false,
              render: (r) => (
                <span onClick={(e) => e.stopPropagation()}>
                  <button className="link" onClick={() => showTrip(r.id)}>Customers</button>
                  <button className="link" onClick={() => setForm(r)}>Edit</button>
                  {isDone(r)
                    ? <button className="link" onClick={() => setTripStatus(r, 'upcoming')}>Reopen</button>
                    : <button className="link" onClick={() => setTripStatus(r, 'completed')}>Mark completed</button>}
                </span>
              ),
            },
          ]}
        />
      </div>

      {selected && (
        <div className="card trip-detail" ref={detailsRef}>
          <div className="cardhead">
            <div>
              <h2>{selected.trip_code || 'No trip code yet'} — Customer Coordination</h2>
              <p>{selected.trip_name} · {date(selected.start_date)}{selected.end_date !== selected.start_date ? ` → ${date(selected.end_date)}` : ''} · Guide {selected.guide_name || 'unassigned'}</p>
            </div>
            <div className="toolbar">
              <button className="btn alt" onClick={() => setForm(selected)}>Edit guide / status</button>
              {!isDone(selected) && (
                <button className="btn alt" onClick={() => setTripStatus(selected, 'completed')}>✓ Mark completed</button>
              )}
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
              { key: 'travel_mode', label: 'Transport', render: (r) => ticketsLabel(r) || '—', csv: (r) => ticketsLabel(r) },
              { key: 'pickup_name', label: 'Pickup', render: (r) => r.pickup_name || 'Self' },
              { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
              { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
              { key: 'balance_amount', label: 'Pending', render: (r) => <b>{money(r.balance_amount)}</b> },
              { key: 'status', label: 'Status', render: (r) => (r.status === 'cancelled' ? <Pill value="cancelled" /> : <Pill value={r.payment_status} />) },
              {
                key: 'actions', label: '', sortable: false, export: false,
                render: (r) => (
                  <div className="row-actions">
                    {Number(r.balance_amount) > 0 && r.status !== 'cancelled' && (
                      <button className="btn small" onClick={() => setPayingBooking({ ...r, trip_name: selected.trip_name })}>Collect balance</button>
                    )}
                    <RowMenu
                      items={[
                        { icon: '🟢', label: invoice.busy === r.id ? 'Preparing invoice…' : 'Send invoice on WhatsApp', onClick: () => invoice.send(r), disabled: invoice.busy === r.id },
                        { icon: '⬇', label: 'Download invoice (PDF)', onClick: () => invoice.download(r) },
                        { icon: '🧾', label: 'View invoice', onClick: () => invoice.view(r) },
                        { icon: '↗', label: 'Open booking', onClick: () => setOpenBookingId(r.id) },
                        invoice.modeItem,
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {form && (
        <FormModal
          wide
          title={form === 'new' ? 'Create Trip Coordination' : `Edit ${form.trip_code || 'trip'} · ${form.trip_name}`}
          submitLabel={form === 'new' ? 'Create Coordination' : 'Save'}
          initial={form === 'new' ? { trip_id: tripId, start_date: today(), trip_status: 'upcoming', departure_type: 'scheduled', status: 'open', seats_total: 25 } : form}
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

      {invoice.dialog}
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
