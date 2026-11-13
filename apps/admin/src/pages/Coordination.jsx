import { useEffect, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { date, label, money, today, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, Pill, useToast } from '../components/ui';
import { BookingDetailModal, NewBookingModal, PaymentModal } from '../components/booking';
import { exportTripExcel } from '../exportTripExcel';
import { RowMenu, useInvoiceActions } from '../components/invoiceActions';
import SearchSelect from '../components/SearchSelect';
import TripExpenses from '../components/TripExpenses';
import { InboundModal, TransferModal } from '../components/B2B';

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
  {
    // One or more guides; a guide with a login (Guides screen) sees this trip
    name: 'guide_ids', label: 'Guides / Trek Leads', type: 'multiselect', full: true,
    placeholder: 'Choose a guide…', addPlaceholder: 'Add another guide…',
    options: (lookups?.guides || []).map((g) => ({ value: g.id, label: `${g.name}${Number(g.has_login) ? ' 🔑' : ''}` })),
    hint: (lookups?.guides || []).length
      ? 'Choose one or more from the list. 🔑 = has a login and will see this trip, its customers and balances (read-only).'
      : 'No guides yet. Add them on the Guides screen.',
  },
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
  const [transferring, setTransferring] = useState(null); // customer row → Transfer to vendor
  const [b2bVersion, setB2bVersion] = useState(0); // reloads B2B + money after a B2B change
  const [b2bInfo, setB2bInfo] = useState(null); // the trip's B2B totals (people transferred out)
  const [addingInbound, setAddingInbound] = useState(false); // customer from a vendor
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
    setB2bInfo(null);
    if (selectedId) api(`/departures/${selectedId}/b2b`).then(({ data: d }) => setB2bInfo(d)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, b2bVersion]);

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
  // After a B2B change: the trip, its customers, the B2B list and the money
  const refreshB2B = () => {
    refresh();
    setB2bVersion((v) => v + 1);
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
    <div className="coord coord-v2">
      {/* Page header */}
      <header className="coord-top">
        <div>
          <div className="coord-eyebrow">Trip management</div>
          <h1>Trip Coordination</h1>
          <div className="coord-sub">Manage and monitor all your trips, customers, guides and trip finances.</div>
        </div>
        <button className="btn" onClick={() => setForm('new')}>
          ＋ Create Trip Coordination{trekName ? ` for ${trekName}` : ''}
        </button>
      </header>

      {/* Four numbers, each with its own colour */}
      <section className="coord-metrics">
        {[
          ['Trip Coordinations', list.length, `${tab === 'completed' ? 'Completed & cancelled' : 'Upcoming & ongoing'}${trekName ? ` · ${trekName}` : ''}`],
          ['Customers Going', sum('people'), 'On confirmed bookings'],
          ['Amount Pending', money(sum('pending_amount')), 'Balance to collect'],
          ['Guides Assigned', `${list.filter((d) => d.guide_id).length} / ${list.length}`, `${list.filter((d) => !d.guide_id).length} without a guide`],
        ].map(([name, value, note]) => (
          <div className="coord-metric" key={name}>
            <div className="coord-label">{name}</div>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </section>

      {/* SECTION 1 · Trip list */}
      <section className="coord-section sec-list">
      <div className="sec-head">
        <div className="sec-title">
          <h2>Trip List</h2>
          <div className="coord-sub">Select a trip to view its customers, guides and expenses.</div>
        </div>
        <div className="coord-tabs" role="tablist">
          {[['upcoming', 'Upcoming', open.length], ['completed', 'Completed', done.length]].map(([key, text, count]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {text} ({count})
            </button>
          ))}
        </div>
      </div>
      <div className="sec-body">
      <div className="coord-filters">
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
      </div>

      <div className="coord-list">
        <DataTable
          key={tab}
          rows={list}
          onRowClick={(r) => showTrip(r.id)}
          selectedKey={selectedId}
          loading={loading}
          error={error}
          exportName={`fgw-coordination-${tab}.csv`}
          searchPlaceholder="Search trip name or trip code…"
          initialSort={{ key: 'start_date', dir: tab === 'completed' ? 'desc' : 'asc' }}
          emptyText={tab === 'completed'
            ? 'No completed trips yet.'
            : `No upcoming trips${trekName ? ` for ${trekName}` : ''}. Create one with “＋ Create Trip Coordination”.`}
          columns={[
            { key: 'trip_code', label: 'Trip code', render: (r) => (r.trip_code ? <span className="coord-id">{r.trip_code}</span> : <span className="muted">No code yet</span>), csv: (r) => r.trip_code || '' },
            // One trek picked: its name is in the dropdown, no need for a column
            ...(tripId ? [] : [{ key: 'trip_name', label: 'Trip', render: (r) => <b>{r.trip_name}</b>, csv: (r) => r.trip_name }]),
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
            { key: 'guide_names', label: 'Guides', render: (r) => r.guide_names || <span className="muted">Unassigned</span>, csv: (r) => r.guide_names || '' },
            { key: 'pending_amount', label: 'Pending', render: (r) => money(r.pending_amount) },
            { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
            {
              key: 'actions', label: 'Action', sortable: false, export: false,
              render: (r) => (
                <span className="coord-row-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="btn alt small" onClick={() => showTrip(r.id)}>View</button>
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
      </div>
      </section>

      {/* SECTION 2 · The selected trip */}
      {selected && (
        <section className="coord-section sec-trip trip-detail" ref={detailsRef}>
          <div className="sec-head">
            <div className="sec-title">
              <span className="sec-kicker">Selected trip</span>
              <h2>{selected.trip_code || 'No trip code yet'} — {selected.trip_name}</h2>
              <div className="coord-sub">
                {date(selected.start_date)}{selected.end_date !== selected.start_date ? ` – ${date(selected.end_date)}` : ''}
                {' · '}Guide: {selected.guide_names || 'Unassigned'}
                {' · '}{label(selected.trip_status)}
              </div>
            </div>
            <div className="coord-actions">
              <button className="btn alt" onClick={() => setForm(selected)}>Edit guides / status</button>
              {!isDone(selected) && (
                <button className="btn alt" onClick={() => setTripStatus(selected, 'completed')}>✓ Mark completed</button>
              )}
              <button className="btn alt b2b-make" onClick={() => setAddingInbound(true)} title="A customer another vendor gives us">＋ From vendor (B2B)</button>
              <button className="btn" onClick={() => setAddingBooking(true)}>＋ Add Customer</button>
            </div>
          </div>
          <div className="sec-body">

          <div className="coord-summary">
            {[
              ['Guides', selected.guide_names || 'Unassigned'],
              ['Customers', selected.people],
              ['Collected', money(selected.paid_amount)],
              ['Pending', money(selected.pending_amount), Number(selected.pending_amount) > 0 ? 'amber' : 'green'],
            ].map(([title, value, tone]) => (
              <div key={title}><span>{title}</span><strong className={tone || ''}>{value}</strong></div>
            ))}
          </div>
          {(() => {
            const active = (selected.customers || []).filter((c) => c.status !== 'cancelled');
            const inbound = active.filter((c) => c.inbound_vendor).reduce((s, c) => s + Number(c.people || 0), 0);
            const direct = active.reduce((s, c) => s + Number(c.people || 0), 0) - inbound;
            return (
              <div className="b2b-counts">
                <span>Direct <b>{direct}</b></span>
                <span className="in">Inbound B2B <b>{inbound}</b></span>
                <span className="out">Transferred out <b>{b2bInfo?.totals?.outboundPeople ?? 0}</b></span>
                <span>Active seats <b>{Number(selected.seats_booked) || 0} / {selected.seats_total || '—'}</b></span>
              </div>
            );
          })()}
          {selected.notes && <div className="coord-notes"><span>Notes</span> {selected.notes}</div>}

          <DataTable
            title="Customer Coordination"
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
              { key: 'customer_name', label: 'Customer', render: (r) => <><b>{r.customer_name}</b>{r.inbound_vendor ? <div><span className="b2b-tag">Inbound · {r.inbound_vendor}</span></div> : null}</>, csv: (r) => `${r.customer_name}${r.inbound_vendor ? ` (B2B from ${r.inbound_vendor})` : ''}` },
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
                    {r.status !== 'cancelled' && (
                      <button type="button" className="btn alt small b2b-make" title="Give this customer (all or some people) to another vendor" onClick={() => setTransferring({ ...r, trip_name: selected.trip_name })}>⇄ Make B2B</button>
                    )}
                    <RowMenu
                      items={[
                        { icon: '🟢', label: invoice.busy === r.id ? 'Preparing invoice…' : 'Send invoice on WhatsApp', onClick: () => invoice.send(r), disabled: invoice.busy === r.id },
                        { icon: '⬇', label: 'Download invoice (PDF)', onClick: () => invoice.download(r) },
                        { icon: '🧾', label: 'View invoice', onClick: () => invoice.view(r) },
                        { icon: '↗', label: 'Open booking', onClick: () => setOpenBookingId(r.id) },
                        ...(r.status !== 'cancelled' ? [{ icon: '⇄', label: 'Make B2B (give to a vendor)', onClick: () => setTransferring({ ...r, trip_name: selected.trip_name }) }] : []),
                        invoice.modeItem,
                      ]}
                    />
                  </div>
                ),
              },
            ]}
          />
          </div>
        </section>
      )}

      {/* SECTION 3 · Trip expenses and profit (B2B records: B2B Vendors screen) */}
      {selected && (
        <section className="coord-section sec-exp">
          <TripExpenses key={`exp-${selected.id}-${b2bVersion}`} departureId={selected.id} departure={selected} mode="office" />
        </section>
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

      {addingInbound && selected && (
        <InboundModal
          departure={selected}
          onClose={() => setAddingInbound(false)}
          onSaved={(message) => { toast(message); setAddingInbound(false); refreshB2B(); }}
        />
      )}

      {transferring && (
        <TransferModal
          booking={transferring}
          onClose={() => setTransferring(null)}
          onSaved={(message) => { toast(message); setTransferring(null); refreshB2B(); }}
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
    </div>
  );
}
