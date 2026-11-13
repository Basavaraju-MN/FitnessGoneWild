import { useEffect, useState } from 'react';

import { api, useApi } from '../api';
import { date, label, money, today, whatsappLink } from '../format';
import DataTable from '../components/DataTable';
import { Field, FormModal, Modal, PageHead, Pill, useToast } from '../components/ui';
import SearchSelect from '../components/SearchSelect';
import { settlementText } from '../components/B2B';
import { exportStatementExcel, statementText } from '../b2bStatement';

/*
 * B2B Vendors: one card per partner vendor with what is open between us:
 * what they send us, what we send them, and the NET. Open a vendor for the
 * statement (every customer exchanged), send it to them (WhatsApp / Excel)
 * and settle everything at once from here.
 */
const VENDOR_FIELDS = [
  { name: 'name', label: 'Vendor name', required: true },
  { name: 'company', label: 'Company name' },
  { name: 'contact_person', label: 'Contact person' },
  { name: 'phone', label: 'Phone (WhatsApp)' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'is_active', label: 'Active', type: 'checkbox' },
  { name: 'address', label: 'Address', type: 'textarea', full: true, rows: 2 },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2, placeholder: 'Usual B2B price, settlement terms…' },
];
const METHODS = [
  { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' },
];

// + they send us · − we send them
const netTone = (net) => (net > 0.009 ? 'in' : net < -0.009 ? 'out' : 'even');
const netWords = (net, name) => (net > 0.009 ? `${name} sends us` : net < -0.009 ? `We send ${name}` : 'Settled up');

/* ---------------- Settle everything with a vendor (once) ---------------- */

function SettleModal({ statement, onClose, onSettled }) {
  const { vendor, totals, open } = statement;
  const [values, setValues] = useState({ paid_on: today(), method: 'upi', reference: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));
  const tone = netTone(totals.net);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api(`/b2b/vendors/${vendor.id}/settle`, { method: 'POST', body: { ...values, expected_net: totals.net } });
      onSettled(data, tone === 'in' ? `${money(totals.net)} received from ${vendor.name} · all settled` : tone === 'out' ? `${money(-totals.net)} paid to ${vendor.name} · all settled` : `Settled with ${vendor.name}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={`Settle with ${vendor.name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form">
          <div className="field full">
            <div className={`b2bv-net ${tone}`}>
              <span>{tone === 'in' ? 'You receive' : tone === 'out' ? 'You pay' : 'No money moves'}</span>
              <b>{money(Math.abs(totals.net))}</b>
              <small>
                Settles all {open.length} open record{open.length === 1 ? '' : 's'} at once:
                {' '}they send {money(totals.toReceive)} − we send {money(totals.toPay)}
              </small>
            </div>
          </div>
          <Field field={{ name: 'paid_on', label: 'Date', type: 'date', required: true }} value={values.paid_on} onChange={set('paid_on')} />
          <Field field={{ name: 'method', label: 'Method', type: 'select', options: METHODS }} value={values.method} onChange={set('method')} />
          <Field field={{ name: 'reference', label: 'Reference', placeholder: 'UPI / transaction ID' }} value={values.reference} onChange={set('reference')} />
          <Field field={{ name: 'note', label: 'Note' }} value={values.note} onChange={set('note')} />
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>
            {saving ? 'Saving…' : tone === 'in' ? `Mark ${money(totals.net)} received` : tone === 'out' ? `Mark ${money(-totals.net)} paid` : 'Mark settled'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- A vendor's statement ---------------- */

function RecordsTable({ rows, direction }) {
  if (!rows.length) return <div className="empty">{direction === 'inbound' ? 'No open customers from them.' : 'No open customers given to them.'}</div>;
  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th>Date</th><th>Trip</th><th>Customer</th><th>People</th><th>B2B total</th>
            <th>{direction === 'inbound' ? 'Customer paid us' : 'Customer paid them'}</th><th>To settle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{date(r.transfer_date)}</td>
              <td className="wrap">{r.trip_name}<div className="muted">{r.trip_code || ''} · {date(r.start_date)}</div></td>
              <td className="wrap"><b>{r.customer_name}</b><div className="muted">{r.customer_phone} · {r.booking_ref}</div></td>
              <td>{r.people}</td>
              <td>{money(r.b2b_total)}<div className="muted">{r.people} × {money(r.price_per_person)}</div></td>
              <td>{money(r.customer_amount)}</td>
              <td className={r.remaining < 0 ? 'b2b-out' : 'b2b-in'}><b>{r.remaining > 0 ? `They send ${money(r.remaining)}` : `We send ${money(-r.remaining)}`}</b>{Math.abs(r.settled) > 0 ? <div className="muted">{money(Math.abs(r.settled))} settled</div> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementModal({ vendorId, onClose, onChanged }) {
  const toast = useToast();
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState('');
  const [settling, setSettling] = useState(false);
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => {
    api(`/b2b/vendors/${vendorId}/statement`).then(({ data }) => setStatement(data)).catch((err) => setError(err.message));
  }, [vendorId]);

  const text = statement ? statementText(statement) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Statement copied');
    } catch {
      toast('Could not copy; select the text and copy it', 'error');
    }
  };

  const s = statement;
  const tone = s ? netTone(s.totals.net) : 'even';

  return (
    <Modal title={s ? `Statement · ${s.vendor.name}` : 'Statement'} onClose={onClose} wide>
      {error && <div className="error-box">{error}</div>}
      {!s && !error && <div className="loading">Loading…</div>}
      {s && (
        <div className="b2bv-statement">
          <div className="b2bv-statement-head">
            <div className="muted">{[s.vendor.company, s.vendor.contact_person, s.vendor.phone, s.vendor.email].filter(Boolean).join(' · ') || 'No contact details'}</div>
            <div className={`b2bv-net big ${tone}`}>
              <span>{tone === 'in' ? 'They need to send us' : tone === 'out' ? 'We need to send them' : 'Nothing open'}</span>
              <b>{money(Math.abs(s.totals.net))}</b>
              <small>They send {money(s.totals.toReceive)} · we send {money(s.totals.toPay)} · {s.open.length} open record{s.open.length === 1 ? '' : 's'}</small>
            </div>
            <div className="b2bv-actions">
              <a
                className={`btn alt${s.vendor.phone ? '' : ' disabled'}`}
                href={s.vendor.phone ? whatsappLink(s.vendor.phone, text) : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!s.vendor.phone}
                title={s.vendor.phone ? 'Opens WhatsApp with the statement' : 'Add the vendor’s phone (Edit) to send on WhatsApp'}
              >
                Send on WhatsApp
              </a>
              <button type="button" className="btn alt" onClick={() => exportStatementExcel(s).catch((err) => toast(err.message, 'error'))}>Download Excel</button>
              <button type="button" className="btn alt" onClick={copy}>Copy text</button>
              <button type="button" className="btn" disabled={!s.open.length} onClick={() => setSettling(true)}>
                {s.open.length ? `Settle ${tone === 'out' ? `(pay ${money(-s.totals.net)})` : tone === 'in' ? `(receive ${money(s.totals.net)})` : ''}` : 'All settled'}
              </button>
            </div>
          </div>

          <h3 className="b2bv-h">Customers they gave us <span>{s.totals.receivedPeople} people open</span></h3>
          <RecordsTable rows={s.open.filter((r) => r.direction === 'inbound')} direction="inbound" />

          <h3 className="b2bv-h">Customers we gave them <span>{s.totals.sentPeople} people open</span></h3>
          <RecordsTable rows={s.open.filter((r) => r.direction === 'outbound')} direction="outbound" />

          <h3 className="b2bv-h">Settlements done <span>{s.batches.length}</span></h3>
          {s.batches.length === 0 ? <div className="empty">No settlements yet.</div> : (
            <ul className="b2bv-batches">
              {s.batches.map((b) => (
                <li key={b.id}>
                  <b className={b.direction === 'paid' ? 'b2b-out' : 'b2b-in'}>
                    {b.direction === 'received' ? `Received ${money(b.net_amount)}` : b.direction === 'paid' ? `Paid ${money(b.net_amount)}` : 'Settled even'}
                  </b>
                  <span className="muted">{date(b.paid_on)} · {label(b.method)}{b.reference ? ` · ${b.reference}` : ''} · {b.records} record{b.records === 1 ? '' : 's'}{b.created_by_name ? ` · by ${b.created_by_name}` : ''}</span>
                  {b.note && <span className="muted">“{b.note}”</span>}
                </li>
              ))}
            </ul>
          )}
          {s.settled.length > 0 && (
            <button type="button" className="link" onClick={() => setShowSettled((v) => !v)}>
              {showSettled ? 'Hide' : 'Show'} {s.settled.length} settled record{s.settled.length === 1 ? '' : 's'}
            </button>
          )}
          {showSettled && (
            <ul className="b2bv-batches">
              {s.settled.map((r) => (
                <li key={r.id}><b>{r.customer_name}</b><span className="muted">{r.direction === 'inbound' ? 'they gave us' : 'we gave them'} {r.people} · {r.trip_name} · {date(r.transfer_date)} · {settlementText(r.settlement)}</span></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {settling && s && (
        <SettleModal
          statement={s}
          onClose={() => setSettling(false)}
          onSettled={(data, message) => { setStatement(data); setSettling(false); toast(message); onChanged?.(); }}
        />
      )}
    </Modal>
  );
}

/* ---------------- The screen ---------------- */

export default function B2BVendors() {
  const toast = useToast();
  const vendors = useApi('/b2b/vendors');
  const records = useApi('/b2b/records');
  const [tab, setTab] = useState('vendors');
  const [editing, setEditing] = useState(null);
  const [openVendor, setOpenVendor] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ vendor: '', direction: '', status: '' });

  const all = vendors.data || [];
  const sum = (key) => all.reduce((s, v) => s + Number(v[key] || 0), 0);
  const toReceive = sum('they_owe');
  const toPay = sum('we_owe');
  const net = toReceive - toPay;
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = all
    .filter((v) => words.every((w) => `${v.name} ${v.company || ''} ${v.contact_person || ''} ${v.phone || ''}`.toLowerCase().includes(w)))
    // Vendors with money open first, biggest first
    .sort((a, b) => (Math.abs(b.they_owe - b.we_owe) - Math.abs(a.they_owe - a.we_owe)) || Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name));

  const rows = (records.data || []).filter((r) =>
    (!filters.vendor || String(r.vendor_id) === String(filters.vendor))
    && (!filters.direction || r.direction === filters.direction)
    && (!filters.status || r.settlement_status === filters.status));

  const save = async (values) => {
    if (editing.id) await api(`/b2b/vendors/${editing.id}`, { method: 'PUT', body: values });
    else await api('/b2b/vendors', { method: 'POST', body: values });
    toast(editing.id ? 'Vendor updated' : 'Vendor added');
    setEditing(null);
    vendors.reload();
  };
  const reloadAll = () => { vendors.reload(); records.reload(); };

  return (
    <>
      <PageHead title="B2B Vendors" subtitle="What is open with each partner vendor: what they send us, what we send them. Open a vendor to send the statement and settle.">
        <button className="btn" onClick={() => setEditing({ is_active: 1 })}>＋ Add vendor</button>
      </PageHead>

      {/* The three numbers that matter */}
      <section className="b2bv-summary">
        <div className="b2bv-sum in"><span>To receive from vendors</span><b>{money(toReceive)}</b><small>Vendors send us</small></div>
        <div className="b2bv-sum out"><span>To pay vendors</span><b>{money(toPay)}</b><small>We send vendors</small></div>
        <div className={`b2bv-sum ${netTone(net)} strong`}><span>Net</span><b>{money(Math.abs(net))}</b><small>{net > 0.009 ? 'Overall, vendors owe us' : net < -0.009 ? 'Overall, we owe vendors' : 'All settled'}</small></div>
      </section>

      <div className="tabs" role="tablist">
        {[['vendors', `Vendors (${all.length})`], ['records', 'All B2B records']].map(([key, text]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{text}</button>
        ))}
      </div>

      {tab === 'vendors' && (
        <>
          <input className="b2bv-search" type="search" placeholder="Search vendor, contact, phone…" aria-label="Search vendors" value={search} onChange={(e) => setSearch(e.target.value)} />
          {vendors.error && <div className="error-box">{vendors.error}</div>}
          {vendors.loading && !vendors.data && <div className="loading">Loading…</div>}
          {vendors.data && !shown.length && <div className="card empty">{all.length ? 'No vendor matches the search.' : 'No vendors yet. Add one with “＋ Add vendor”.'}</div>}
          <div className="b2bv-grid">
            {shown.map((v) => {
              const vNet = Number(v.they_owe) - Number(v.we_owe);
              const tone = netTone(vNet);
              return (
                <article key={v.id} className={`b2bv-card ${tone}${Number(v.is_active) ? '' : ' inactive'}`}>
                  <div className="b2bv-card-top">
                    <div>
                      <h3>{v.name}</h3>
                      <div className="muted">{[v.company, v.contact_person, v.phone].filter(Boolean).join(' · ') || 'No contact details'}</div>
                    </div>
                    {!Number(v.is_active) && <Pill value="inactive" />}
                  </div>
                  <div className="b2bv-people">
                    <span>They gave us <b>{v.received_people}</b></span>
                    <span>We gave them <b>{v.sent_people}</b></span>
                  </div>
                  <div className="b2bv-money">
                    <div><span>They send us</span><b className="b2b-in">{money(v.they_owe)}</b></div>
                    <div><span>We send them</span><b className="b2b-out">{money(v.we_owe)}</b></div>
                  </div>
                  <div className={`b2bv-net ${tone}`}>
                    <span>{netWords(vNet, v.name)}</span>
                    <b>{tone === 'even' ? '✓' : money(Math.abs(vNet))}</b>
                  </div>
                  <div className="b2bv-card-actions">
                    <button type="button" className="btn" onClick={() => setOpenVendor(v.id)}>{tone === 'even' ? 'View statement' : 'Statement & settle'}</button>
                    <button type="button" className="btn alt" onClick={() => setEditing(v)}>Edit</button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {tab === 'records' && (
        <>
          <div className="b2b-filters">
            <SearchSelect value={filters.vendor} onChange={(v) => setFilters((f) => ({ ...f, vendor: v }))} placeholder="All vendors" searchable options={all.map((v) => ({ value: v.id, label: v.name }))} />
            <SearchSelect value={filters.direction} onChange={(v) => setFilters((f) => ({ ...f, direction: v }))} placeholder="Given & received" options={[{ value: 'inbound', label: 'They gave us' }, { value: 'outbound', label: 'We gave them' }]} />
            <SearchSelect value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} placeholder="Open & settled" options={[{ value: 'pending', label: 'Open' }, { value: 'partial', label: 'Partly settled' }, { value: 'settled', label: 'Settled' }]} />
          </div>
          <DataTable
            title="All B2B records"
            subtitle="Every customer exchanged with a vendor. Settle from the vendor’s statement."
            rows={rows}
            loading={records.loading}
            error={records.error}
            exportName="fgw-b2b-records.csv"
            searchPlaceholder="Search customer, booking, trip…"
            initialSort={{ key: 'transfer_date', dir: 'desc' }}
            emptyText="No B2B records yet."
            onRowClick={(r) => setOpenVendor(r.vendor_id)}
            columns={[
              { key: 'transfer_date', label: 'Date', render: (r) => date(r.transfer_date) },
              { key: 'direction', label: 'Direction', render: (r) => <span className={`pill ${r.direction === 'inbound' ? 'blue' : ''}`}>{r.direction === 'inbound' ? 'They gave us' : 'We gave them'}</span>, csv: (r) => (r.direction === 'inbound' ? 'They gave us' : 'We gave them') },
              { key: 'vendor_name', label: 'Vendor', render: (r) => <b>{r.vendor_name}</b> },
              { key: 'customer_name', label: 'Customer', render: (r) => <>{r.customer_name}<div className="muted">{r.customer_phone}</div></>, csv: (r) => `${r.customer_name} ${r.customer_phone}` },
              { key: 'trip_name', label: 'Trip', render: (r) => <>{r.trip_name}<div className="muted">{r.trip_code || ''} · {date(r.start_date)}</div></>, csv: (r) => `${r.trip_name} ${r.trip_code || ''}` },
              { key: 'people', label: 'People' },
              { key: 'b2b_total', label: 'B2B total', render: (r) => money(r.b2b_total) },
              { key: 'remaining', label: 'To settle', render: (r) => (Math.abs(r.remaining) < 0.01 ? <span className="muted">—</span> : <b className={r.remaining < 0 ? 'b2b-out' : 'b2b-in'}>{r.remaining > 0 ? `They send ${money(r.remaining)}` : `We send ${money(-r.remaining)}`}</b>), csv: (r) => r.remaining },
              { key: 'settlement_status', label: 'Status', render: (r) => <span className={`pill ${{ settled: '', partial: 'pending', pending: 'red' }[r.settlement_status]}`}>{r.settlement_status === 'pending' ? 'Open' : label(r.settlement_status)}</span>, csv: (r) => r.settlement_status },
            ]}
          />
        </>
      )}

      {editing && (
        <FormModal
          title={editing.id ? `Edit ${editing.name}` : 'Add vendor'}
          initial={editing}
          fields={VENDOR_FIELDS}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
      {openVendor && <StatementModal vendorId={openVendor} onClose={() => setOpenVendor(null)} onChanged={reloadAll} />}
    </>
  );
}

