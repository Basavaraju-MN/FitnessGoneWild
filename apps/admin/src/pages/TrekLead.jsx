import { useEffect, useRef, useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { date, label, money, today, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { Modal, PageHead, PasswordInput, Pill, Stats, useToast } from '../components/ui';
import { exportTripExcel } from '../exportTripExcel';
import TripExpenses from '../components/TripExpenses';

/*
 * Trek Lead portal: what a Trek Lead account sees after logging in.
 * Only the trips assigned to them in Trip Coordination, those trips'
 * customers and balances. Read-only, except "Collect balance": a PhonePe
 * payment for the remaining balance, added to the booking only after PhonePe
 * confirms it. The server checks every request (admin-server/components/trekLead).
 */

const ymd = (value) => String(value || '').slice(0, 10);
// Completed tab: marked completed / cancelled, or the return date has passed
const isDone = (t) => ['completed', 'cancelled'].includes(t.trip_status) || ymd(t.end_date) < today();
const dates = (t) => (t.end_date && ymd(t.end_date) !== ymd(t.start_date) ? `${date(t.start_date)} → ${date(t.end_date)}` : date(t.start_date));
const ticketsLabel = (r) =>
  r.tickets?.length ? r.tickets.map((t) => `${t.people} × ${t.label}`).join(', ') : label(r.travel_mode);
const phoneLink = (phone) => (phone ? <a className="link" href={whatsappLink(phone)} target="_blank" rel="noreferrer">{phone}</a> : '—');
const paymentPill = (r) => (r.status === 'cancelled' ? <Pill value="cancelled" /> : <Pill value={r.payment_status} />);

// Dashboard / Customers → "open this trip" in My Assigned Trips
let tripToOpen = null;
const openTrip = (go, id) => {
  tripToOpen = id;
  go('my-trips');
};

/* ---------------- Collect balance: cash, online (PhonePe) or both ---------------- */

// A balance is still open (the button shows only then; gone once paid)
const canCollect = (r) => r.status !== 'cancelled' && Number(r.balance_amount) > 0;

const CHECK_EVERY_MS = 4000;
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const MODES = [
  ['cash', 'All cash'],
  ['online', 'All online'],
  ['split', 'Part cash + part online'],
];

/**
 * How the customer pays the balance:
 *   All cash      the guide records the cash received
 *   All online    PhonePe (same gateway as website bookings): QR to scan or
 *                 a link on WhatsApp; added only after PhonePe confirms it
 *   Part + part   the cash part is recorded first, then the rest online
 */
function CollectModal({ booking, onClose, onPaid }) {
  const toast = useToast();
  const [balance, setBalance] = useState(round2(booking.balance_amount)); // what is still due
  const [mode, setMode] = useState('cash');
  const [cash, setCash] = useState(String(round2(booking.balance_amount)));
  const [note, setNote] = useState('');
  const [order, setOrder] = useState(null); // PhonePe: { merchantOrderId, checkoutUrl, amount, message }
  const [state, setState] = useState('ready'); // ready | saving | creating | waiting | paid | failed
  const [cashDone, setCashDone] = useState(0); // cash recorded in this pop-up
  const [error, setError] = useState('');
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;

  const cashAmount = round2(cash);
  // After the cash part is recorded, the rest online = what is still due
  const onlineAmount = mode === 'online' || cashDone > 0 ? balance : mode === 'split' ? round2(balance - cashAmount) : 0;
  const cashValid = cashAmount > 0 && cashAmount <= balance + 0.009 && (mode !== 'split' || cashAmount < balance);
  // Online step: shown for "All online", and for "Part + part" once the cash is recorded
  const onlineStep = mode === 'online' || (mode === 'split' && cashDone > 0);

  const pickMode = (next) => {
    setMode(next);
    setError('');
    setCash(next === 'split' ? '' : String(balance));
  };

  /* ----- Cash ----- */
  const recordCash = async () => {
    if (!cashValid) {
      setError(mode === 'split'
        ? `Enter the cash part: more than ₹0 and less than ${money(balance)}`
        : `Enter the cash received (up to ${money(balance)})`);
      return;
    }
    setState('saving');
    setError('');
    try {
      const { data } = await api(`/lead/bookings/${booking.id}/cash`, { method: 'POST', body: { amount: cashAmount, note } });
      const left = round2(data.booking.balance_amount);
      setCashDone((v) => round2(v + data.amount));
      setBalance(left);
      toast(`${money(data.amount)} cash recorded for ${booking.customer_name}`);
      onPaidRef.current?.();
      if (left <= 0) {
        paidRef.current = true;
        setState('paid');
      } else {
        setState('ready');
        if (mode === 'cash') pickMode('online'); // part paid in cash: offer the rest online
      }
    } catch (err) {
      setError(err.message);
      setState('ready');
    }
  };

  /* ----- Online (PhonePe) ----- */
  const makeOrder = async () => {
    setState('creating');
    setError('');
    try {
      const { data } = await api(`/lead/bookings/${booking.id}/collect`, { method: 'POST', body: { amount: onlineAmount } });
      setOrder(data);
      setState('waiting');
      return data;
    } catch (err) {
      setError(err.message);
      setState('ready');
      return null;
    }
  };

  // The new tab is opened straight from the click, so the browser does not block it
  const openInNewTab = async (urlOf) => {
    const tab = window.open('', '_blank');
    const current = order && state === 'waiting' ? order : await makeOrder();
    if (!current) return tab?.close();
    if (tab) tab.location.href = urlOf(current);
    else window.location.assign(urlOf(current));
  };

  // While waiting: ask the server (which asks PhonePe) every few seconds
  useEffect(() => {
    if (state !== 'waiting' || !order) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const { data } = await api(`/lead/collections/${order.merchantOrderId}`);
        if (stop) return;
        if (data.status === 'SUCCESS' && !paidRef.current) {
          paidRef.current = true;
          setBalance(round2(data.booking?.balance_amount));
          setState('paid');
          toast(`${money(data.amount)} received online from ${booking.customer_name}`);
          onPaidRef.current?.();
        } else if (data.status === 'FAILED') {
          setOrder(null);
          setState('failed');
        }
      } catch {
        // network blip: try again on the next tick
      }
    };
    const timer = setInterval(tick, CHECK_EVERY_MS);
    return () => { stop = true; clearInterval(timer); };
  }, [state, order, booking.customer_name, toast]);

  const busy = state === 'saving' || state === 'creating';
  const locked = state === 'waiting' || cashDone > 0; // the way of paying is fixed once started

  return (
    <Modal title={`Collect balance · ${booking.customer_name}`} onClose={onClose}>
      <div className="collect">
        <div className="collect-amount">
          <small>{state === 'paid' ? 'Balance now' : 'Balance to collect'}</small>
          <b>{money(balance)}</b>
          <span className="muted">{booking.booking_ref}{booking.trip_name ? ` · ${booking.trip_name}` : ''}</span>
          {cashDone > 0 && <span className="collect-cash-done">✓ {money(cashDone)} cash recorded</span>}
        </div>

        {state === 'paid' ? (
          <div className="collect-done">
            <span aria-hidden="true">✓</span>
            <b>{balance > 0 ? `Payment received · ${money(balance)} still due` : 'Fully paid'}</b>
            <p className="muted">
              {cashDone > 0 && order ? `${money(cashDone)} cash + ${money(order.amount)} online (verified by PhonePe).`
                : order ? 'Online payment verified by PhonePe.'
                  : `${money(cashDone)} cash recorded.`}
              {' '}The booking is updated for the office too.
            </p>
            <button type="button" className="btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {/* 1. How is the customer paying? */}
            <div className="collect-modes" role="radiogroup" aria-label="How is the customer paying?">
              {MODES.map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  className={mode === key ? 'active' : ''}
                  disabled={busy || (locked && mode !== key)}
                  onClick={() => pickMode(key)}
                >
                  {text}
                </button>
              ))}
            </div>

            {state === 'failed' && <div className="error-box">The online payment failed or was cancelled. No money was taken. Try again below.</div>}
            {error && <div className="error-box">{error}</div>}

            {/* 2a. Cash (all, or the cash part) */}
            {(mode === 'cash' || (mode === 'split' && cashDone === 0)) && (
              <div className="collect-cash">
                <div className="form">
                  <div className="field">
                    <label htmlFor="collect-cash">{mode === 'split' ? 'Cash part (₹) *' : 'Cash received (₹) *'}</label>
                    <input
                      id="collect-cash"
                      type="number"
                      min="1"
                      step="0.01"
                      inputMode="decimal"
                      value={cash}
                      placeholder={mode === 'split' ? 'e.g. 2000' : ''}
                      onChange={(e) => setCash(e.target.value)}
                    />
                    {mode === 'split' && cashAmount > 0 && cashAmount < balance && (
                      <small>Rest online: <b>{money(onlineAmount)}</b> (PhonePe, next step)</small>
                    )}
                    {mode === 'cash' && cashAmount > 0 && cashAmount < balance && (
                      <small>{money(round2(balance - cashAmount))} will still be due</small>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="collect-note">Note</label>
                    <input id="collect-note" value={note} maxLength={200} placeholder="Optional, e.g. paid at pickup" onChange={(e) => setNote(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="btn" disabled={busy} onClick={recordCash}>
                  {state === 'saving' ? 'Saving…' : mode === 'split'
                    ? `Record ${cashAmount > 0 ? money(cashAmount) : ''} cash, then collect the rest online`
                    : `Record ${cashAmount > 0 ? money(cashAmount) : ''} cash received`}
                </button>
                <p className="muted collect-hint">Only record cash you have in hand. The office sees who recorded it.</p>
              </div>
            )}

            {/* 2b. Online (all, or the rest after the cash part) */}
            {onlineStep && (
              <>
                <div className="collect-online-amount">Online now: <b>{money(order?.amount ?? onlineAmount)}</b> through PhonePe</div>
                <div className="collect-actions">
                  <button type="button" className="btn" disabled={busy} onClick={() => openInNewTab((o) => o.checkoutUrl)}>
                    {state === 'creating' ? 'Opening PhonePe…' : 'Open payment page (QR)'}
                  </button>
                  <button type="button" className="btn alt" disabled={busy || !booking.customer_phone} onClick={() => openInNewTab((o) => whatsappLink(booking.customer_phone, o.message))}>
                    Send payment link on WhatsApp
                  </button>
                </div>
                <ol className="collect-steps muted">
                  <li><b>Open payment page</b> shows PhonePe’s QR code for the customer to scan with any UPI app (best on a laptop or tablet).</li>
                  <li>Or <b>send the link</b>: the customer pays on their own phone.</li>
                  <li>Keep this window open. It turns green by itself once PhonePe confirms the payment.</li>
                </ol>
                {state === 'waiting' && (
                  <div className="collect-wait">
                    <span className="collect-spinner" aria-hidden="true" />
                    Waiting for the payment…
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// Button + its pop-up, for a row (customer / booking)
function CollectButton({ booking, onPaid, small = true }) {
  const [open, setOpen] = useState(false);
  // After paying, the row shows no button but the pop-up stays until closed
  if (!canCollect(booking) && !open) return null;
  return (
    <span onClick={(e) => e.stopPropagation()}>
      {canCollect(booking) && <button type="button" className={`btn ${small ? 'small' : ''}`} onClick={() => setOpen(true)}>Collect balance</button>}
      {open && <CollectModal booking={booking} onClose={() => setOpen(false)} onPaid={onPaid} />}
    </span>
  );
}

/* ---------------- One booking (customer details) ---------------- */

function BookingModal({ bookingId, onClose, onChanged }) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api(`/lead/bookings/${bookingId}`)
      .then(({ data }) => setBooking(data))
      .catch((err) => setError(err.message));
  }, [bookingId, version]);

  const paid = () => {
    setVersion((v) => v + 1);
    onChanged?.();
  };

  return (
    <Modal title={booking ? `${booking.customer_name} · ${booking.booking_ref}` : 'Customer details'} onClose={onClose} wide>
      {error && <div className="error-box">{error}</div>}
      {!booking && !error && <div className="loading">Loading…</div>}
      {booking && (
        <>
          <div className="details lead-details">
            {[
              ['Customer', booking.customer_name],
              ['Mobile', phoneLink(booking.customer_phone)],
              ['Email', booking.customer_email || '—'],
              ['Booking ID', booking.booking_ref],
              ['Booked on', date(booking.booked_at)],
              ['Trip', `${booking.trip_name}${booking.trip_code ? ` · ${booking.trip_code}` : ''}`],
              ['Travel date', dates(booking)],
              ['Participants', booking.people],
              ['Transport', ticketsLabel(booking) || '—'],
              ['Pickup', booking.pickup_name ? `${booking.pickup_name}${booking.pickup_address ? ` · ${booking.pickup_address}` : ''}` : 'Self'],
              ['Payment status', paymentPill(booking)],
              ['Total amount', money(booking.amount)],
              ['Amount paid', money(booking.amount_paid)],
              ['Balance to collect', <b key="b">{money(booking.balance_amount)}</b>],
            ].map(([title, value]) => (
              <div key={title}><small>{title}</small><b>{value}</b></div>
            ))}
          </div>
          <div className="lead-collect-row">
            <CollectButton booking={booking} onPaid={paid} small={false} />
          </div>

          <h3 className="lead-subhead">Payments received</h3>
          {booking.payments.length === 0 ? (
            <p className="muted">
              {Number(booking.amount_paid) > 0 ? 'Paid online on the website when booking.' : 'No payments yet.'}
            </p>
          ) : (
            <table className="lead-mini">
              <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {booking.payments.map((p) => (
                  <tr key={p.id}><td>{date(p.paid_at)}</td><td>{label(p.method)}</td><td>{p.reference || '—'}</td><td className="num">{money(p.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted lead-note">Use “Collect balance” for cash, online (PhonePe) or part of each. Online payments are added once PhonePe confirms them.</p>
        </>
      )}
    </Modal>
  );
}

/* ---------------- Dashboard ---------------- */

export function LeadDashboard() {
  const { user, go } = useAdmin();
  const { data, loading, error, reload: refresh } = useApi('/lead/dashboard');
  const [openBookingId, setOpenBookingId] = useState(null);
  const c = data?.counts;

  return (
    <>
      <PageHead title={`Hello, ${String(user.fullName || '').split(' ')[0] || 'Trek Lead'}`} subtitle="Your assigned trips, customers and balances to collect.">
        <button className="btn" onClick={() => go('my-trips')}>My Assigned Trips</button>
      </PageHead>

      {error && <div className="error-box">{error}</div>}
      {loading && !data && <div className="loading">Loading…</div>}

      {data && (
        <>
          <Stats
            items={[
              ['Assigned Trips', c.assigned, `${c.upcoming} upcoming · ${c.completed} completed`],
              ['Upcoming Trips', c.upcoming, 'Not yet completed'],
              ['Customers', c.customers, `On ${c.bookings} confirmed bookings`],
              ['Pending Balances', money(c.pending), `${money(c.collected)} collected of ${money(c.total)}`],
            ]}
          />

          <div style={{ marginBottom: 12 }}>
            <DataTable
              title="Next trips"
              subtitle="Your upcoming trips. Open one to see its customers."
              searchPlaceholder=""
              rows={data.upcoming}
              onRowClick={(r) => openTrip(go, r.id)}
              emptyText={c.assigned ? 'No upcoming trips.' : 'No trips yet. The office adds you as a guide on trips in Trip Coordination.'}
              columns={[
                { key: 'trip_name', label: 'Trip', render: (r) => <><b>{r.trip_name}</b>{r.trip_code ? <div className="muted">{r.trip_code}</div> : null}</> },
                { key: 'start_date', label: 'Travel date', render: (r) => dates(r) },
                { key: 'pickups', label: 'Pickup', render: (r) => r.pickups || '—' },
                { key: 'people', label: 'Customers' },
                { key: 'pending_amount', label: 'Pending', render: (r) => money(r.pending_amount) },
                { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
                { key: 'open', label: '', sortable: false, export: false, render: (r) => <button className="link" onClick={() => openTrip(go, r.id)}>View details</button> },
              ]}
            />
          </div>
        </>
      )}

      {openBookingId && <BookingModal bookingId={openBookingId} onClose={() => setOpenBookingId(null)} onChanged={refresh} />}
    </>
  );
}

/* ---------------- My Assigned Trips ---------------- */

export function LeadTrips() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/lead/trips');
  const [version, setVersion] = useState(0);
  const refresh = () => { reload(); setVersion((v) => v + 1); };
  const [tab, setTab] = useState('upcoming');
  const [selectedId, setSelectedId] = useState(() => {
    const id = tripToOpen;
    tripToOpen = null;
    return id;
  });
  const [selected, setSelected] = useState(null);
  const [openBookingId, setOpenBookingId] = useState(null);

  // Back from PhonePe (…/my-trips?paid=<order>): show the result and open that trip
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const order = params.get('paid');
    if (!order) return;
    params.delete('paid');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    api(`/lead/collections/${encodeURIComponent(order)}`)
      .then(({ data: result }) => {
        if (result.status === 'SUCCESS') toast(`Payment received: ${money(result.amount)} · verified by PhonePe`);
        else if (result.status === 'FAILED') toast('The online payment failed or was cancelled. No money was taken.', 'error');
        else toast('Payment is still being confirmed by PhonePe. It is added by itself once confirmed.');
        if (result.booking?.departure_id) setSelectedId(Number(result.booking.departure_id));
        refresh();
      })
      .catch((err) => toast(err.message, 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const detailsRef = useRef(null);

  const all = data || [];
  const done = all.filter(isDone);
  const open = all.filter((t) => !isDone(t));
  const list = tab === 'completed' ? done : open;

  // Opened from the dashboard: switch to the tab that has the trip
  useEffect(() => {
    if (!data || !selectedId) return;
    const trip = all.find((t) => t.id === selectedId);
    if (trip) {
      setTab(isDone(trip) ? 'completed' : 'upcoming');
      setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    if (!selectedId) return setSelected(null);
    let stale = false;
    api(`/lead/trips/${selectedId}`)
      .then(({ data: trip }) => !stale && setSelected(trip))
      .catch((err) => !stale && toast(err.message, 'error'));
    return () => { stale = true; };
  }, [selectedId, version, toast]);

  const showTrip = (id) => {
    setSelectedId(id);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const activeCustomers = (selected?.customers || []).filter((r) => r.status !== 'cancelled');
  const sum = (key) => activeCustomers.reduce((s, r) => s + Number(r[key] || 0), 0);

  return (
    <>
      <PageHead title="My Assigned Trips" subtitle="Only the trips the office assigned to you. Click a trip to see its customers." />

      <div className="tabs" role="tablist">
        {[['upcoming', 'Upcoming', open.length], ['completed', 'Completed', done.length]].map(([key, text, count]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
            {text} <span className="tab-count">{count}</span>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <DataTable
          key={tab}
          title={tab === 'completed' ? 'Completed trips' : 'Upcoming trips'}
          rows={list}
          loading={loading}
          error={error}
          onRowClick={(r) => showTrip(r.id)}
          selectedKey={selectedId}
          exportName={`my-trips-${tab}.csv`}
          searchPlaceholder="Search trips…"
          initialSort={{ key: 'start_date', dir: tab === 'completed' ? 'desc' : 'asc' }}
          emptyText={tab === 'completed' ? 'No completed trips yet.' : 'No upcoming trips assigned to you.'}
          columns={[
            { key: 'trip_name', label: 'Trip', render: (r) => <><b>{r.trip_name}</b>{r.trip_code ? <div className="muted">{r.trip_code}</div> : null}</>, csv: (r) => `${r.trip_name}${r.trip_code ? ` (${r.trip_code})` : ''}` },
            { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
            { key: 'end_date', label: 'Return date', render: (r) => date(r.end_date) },
            { key: 'pickups', label: 'Pickup', render: (r) => r.pickups || '—' },
            { key: 'bookings', label: 'Bookings' },
            { key: 'people', label: 'Customers' },
            { key: 'pending_amount', label: 'Pending', render: (r) => money(r.pending_amount) },
            { key: 'trip_status', label: 'Status', render: (r) => <Pill value={r.trip_status} /> },
            { key: 'open', label: '', sortable: false, export: false, render: (r) => <button className="link" onClick={(e) => { e.stopPropagation(); showTrip(r.id); }}>View details</button> },
          ]}
        />
      </div>

      {selected && (
        <div className="card trip-detail" ref={detailsRef}>
          <div className="cardhead">
            <div>
              <h2>{selected.trip_name}{selected.trip_code ? ` · ${selected.trip_code}` : ''}</h2>
              <p>{dates(selected)} · {label(selected.trip_status)}</p>
            </div>
            <div className="toolbar">
              <button
                type="button"
                className="btn alt"
                disabled={!activeCustomers.length}
                onClick={() => exportTripExcel(selected).catch((err) => toast(`Export failed: ${err.message}`, 'error'))}
              >
                Download customer list (Excel)
              </button>
            </div>
          </div>

          <div className="details">
            {[
              ['Travel date', date(selected.start_date)],
              ['Return date', date(selected.end_date)],
              ['Bookings', activeCustomers.length],
              ['Customers', sum('people')],
              ['Total amount', money(sum('amount'))],
              ['Collected', money(sum('amount_paid'))],
              ['Pending balance', money(sum('balance_amount'))],
              ['Guides', selected.guide_names || '—'],
              ['Notes', selected.notes || '—'],
            ].map(([title, value]) => (
              <div key={title}><small>{title}</small><b>{value}</b></div>
            ))}
          </div>

          <DataTable
            searchPlaceholder="Search customers…"
            rows={selected.customers}
            exportName={`${selected.trip_code || 'trip'}-customers.csv`}
            emptyText="No customers on this trip yet."
            initialSort={{ key: 'pickup_name', dir: 'asc' }}
            onRowClick={(r) => setOpenBookingId(r.id)}
            columns={[
              { key: 'customer_name', label: 'Customer', render: (r) => <b>{r.customer_name}</b> },
              { key: 'customer_phone', label: 'Mobile', render: (r) => <span onClick={(e) => e.stopPropagation()}>{phoneLink(r.customer_phone)}</span>, csv: (r) => r.customer_phone },
              { key: 'customer_email', label: 'Email', render: (r) => r.customer_email || '—' },
              { key: 'people', label: 'People' },
              { key: 'booking_ref', label: 'Booking ID' },
              { key: 'booked_at', label: 'Booked on', render: (r) => date(r.booked_at) },
              { key: 'pickup_name', label: 'Pickup', render: (r) => r.pickup_name || 'Self' },
              { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
              { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
              { key: 'balance_amount', label: 'Balance', render: (r) => <b>{money(r.balance_amount)}</b> },
              { key: 'payment_status', label: 'Payment', render: paymentPill, csv: (r) => (r.status === 'cancelled' ? 'cancelled' : r.payment_status) },
              { key: 'collect', label: '', sortable: false, export: false, render: (r) => <CollectButton booking={{ ...r, trip_name: selected.trip_name }} onPaid={refresh} /> },
            ]}
          />
        </div>
      )}

      {selected && <TripExpenses key={selected.id} departureId={selected.id} mode="lead" />}

      {openBookingId && <BookingModal bookingId={openBookingId} onClose={() => setOpenBookingId(null)} onChanged={refresh} />}
    </>
  );
}

/* ---------------- Customers (all assigned trips) ---------------- */

export function LeadCustomers() {
  const { go } = useAdmin();
  const { data, loading, error, reload: refresh } = useApi('/lead/customers');
  const [openBookingId, setOpenBookingId] = useState(null);

  return (
    <>
      <PageHead title="Customers" subtitle="Everyone booked on your assigned trips. Click a customer for the booking details." />
      <DataTable
        title="Customers on my trips"
        rows={data}
        loading={loading}
        error={error}
        onRowClick={(r) => setOpenBookingId(r.id)}
        exportName="my-customers.csv"
        searchPlaceholder="Search name, mobile, booking ID…"
        initialSort={{ key: 'start_date', dir: 'asc' }}
        emptyText="No customers on your trips yet."
        columns={[
          { key: 'customer_name', label: 'Customer', render: (r) => <b>{r.customer_name}</b> },
          { key: 'customer_phone', label: 'Mobile', render: (r) => <span onClick={(e) => e.stopPropagation()}>{phoneLink(r.customer_phone)}</span>, csv: (r) => r.customer_phone },
          { key: 'customer_email', label: 'Email', render: (r) => r.customer_email || '—' },
          { key: 'trip_name', label: 'Trip', render: (r) => <span onClick={(e) => { e.stopPropagation(); openTrip(go, r.departure_id); }}><button className="link">{r.trip_name}</button></span>, csv: (r) => r.trip_name },
          { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
          { key: 'booking_ref', label: 'Booking ID' },
          { key: 'people', label: 'People' },
          { key: 'pickup_name', label: 'Pickup', render: (r) => r.pickup_name || 'Self' },
          { key: 'balance_amount', label: 'Balance', render: (r) => money(r.balance_amount) },
          { key: 'payment_status', label: 'Payment', render: paymentPill, csv: (r) => (r.status === 'cancelled' ? 'cancelled' : r.payment_status) },
          { key: 'collect', label: '', sortable: false, export: false, render: (r) => <CollectButton booking={r} onPaid={refresh} /> },
        ]}
      />
      {openBookingId && <BookingModal bookingId={openBookingId} onClose={() => setOpenBookingId(null)} onChanged={refresh} />}
    </>
  );
}

/* ---------------- Payment balances ---------------- */

export function LeadBalances() {
  const { go } = useAdmin();
  const trips = useApi('/lead/trips');
  const customers = useApi('/lead/customers');
  const refresh = () => { trips.reload(); customers.reload(); };
  const [openBookingId, setOpenBookingId] = useState(null);

  const liveTrips = (trips.data || []).filter((t) => t.trip_status !== 'cancelled');
  const owing = (customers.data || []).filter((r) => r.status !== 'cancelled' && Number(r.balance_amount) > 0);
  const sum = (list, key) => list.reduce((s, r) => s + Number(r[key] || 0), 0);

  return (
    <>
      <PageHead title="Payment Balances" subtitle="Use “Collect balance” for cash, online (PhonePe QR or link), or part cash and part online." />

      <Stats
        items={[
          ['Total booking amount', money(sum(liveTrips, 'total_amount')), `${liveTrips.length} trips`],
          ['Collected', money(sum(liveTrips, 'paid_amount')), 'Received so far'],
          ['Pending balance', money(sum(liveTrips, 'pending_amount')), `${owing.length} customers still to pay`],
        ]}
      />

      <div style={{ marginBottom: 12 }}>
        <DataTable
          title="By trip"
          rows={liveTrips}
          loading={trips.loading}
          error={trips.error}
          onRowClick={(r) => openTrip(go, r.id)}
          exportName="my-trip-balances.csv"
          searchPlaceholder="Search trips…"
          initialSort={{ key: 'start_date', dir: 'asc' }}
          emptyText="No trips assigned to you."
          columns={[
            { key: 'trip_name', label: 'Trip', render: (r) => <><b>{r.trip_name}</b>{r.trip_code ? <div className="muted">{r.trip_code}</div> : null}</>, csv: (r) => r.trip_name },
            { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
            { key: 'people', label: 'Customers' },
            { key: 'total_amount', label: 'Total', render: (r) => money(r.total_amount) },
            { key: 'paid_amount', label: 'Collected', render: (r) => money(r.paid_amount) },
            { key: 'pending_amount', label: 'Pending', render: (r) => <b>{money(r.pending_amount)}</b> },
          ]}
        />
      </div>

      <DataTable
        title="Customers with a balance"
        rows={owing}
        loading={customers.loading}
        error={customers.error}
        onRowClick={(r) => setOpenBookingId(r.id)}
        exportName="my-pending-balances.csv"
        searchPlaceholder="Search name, mobile, booking ID…"
        initialSort={{ key: 'start_date', dir: 'asc' }}
        emptyText="Nobody owes anything. 🎉"
        columns={[
          { key: 'customer_name', label: 'Customer', render: (r) => <b>{r.customer_name}</b> },
          { key: 'customer_phone', label: 'Mobile', render: (r) => <span onClick={(e) => e.stopPropagation()}>{phoneLink(r.customer_phone)}</span>, csv: (r) => r.customer_phone },
          { key: 'trip_name', label: 'Trip' },
          { key: 'start_date', label: 'Travel date', render: (r) => date(r.start_date) },
          { key: 'booking_ref', label: 'Booking ID' },
          { key: 'amount', label: 'Total', render: (r) => money(r.amount) },
          { key: 'amount_paid', label: 'Paid', render: (r) => money(r.amount_paid) },
          { key: 'balance_amount', label: 'Balance', render: (r) => <b>{money(r.balance_amount)}</b> },
          { key: 'collect', label: '', sortable: false, export: false, render: (r) => <CollectButton booking={r} onPaid={refresh} /> },
        ]}
      />
      {openBookingId && <BookingModal bookingId={openBookingId} onClose={() => setOpenBookingId(null)} onChanged={refresh} />}
    </>
  );
}

/* ---------------- Profile ---------------- */

export function LeadProfile() {
  const { user } = useAdmin();
  const toast = useToast();
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const changePassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/auth/change-password', { method: 'POST', body: values });
      setValues({ currentPassword: '', newPassword: '' });
      toast('Password changed');
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <>
      <PageHead title="Profile" subtitle="Your account. To change your name, email or username, ask the office (Guides screen)." />
      <div className="lead-profile">
        <div className="card">
          <div className="cardhead"><div><h2>Account</h2></div></div>
          <div className="details">
            {[
              ['Name', user.fullName],
              ['Username', user.username],
              ['Email', user.email],
              ['Role', 'Guide / Trek Lead'],
            ].map(([title, value]) => (
              <div key={title}><small>{title}</small><b>{value || '—'}</b></div>
            ))}
          </div>
        </div>

        <form className="card" onSubmit={changePassword}>
          <div className="cardhead"><div><h2>Change password</h2></div></div>
          <div className="form">
            <div className="field full">
              <label htmlFor="lead-current">Current password *</label>
              <PasswordInput id="lead-current" required autoComplete="current-password" value={values.currentPassword} onChange={(e) => setValues((v) => ({ ...v, currentPassword: e.target.value }))} />
            </div>
            <div className="field full">
              <label htmlFor="lead-new">New password *</label>
              <PasswordInput id="lead-new" required autoComplete="new-password" value={values.newPassword} onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))} />
              <small>At least 8 characters</small>
            </div>
            {error && <div className="form-error">{error}</div>}
          </div>
          <div className="modalfoot">
            <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
