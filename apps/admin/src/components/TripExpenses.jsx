import { useCallback, useEffect, useRef, useState } from 'react';

import { API_URL, api } from '../api';
import { date, label, money, today } from '../format';
import { resizePhoto } from '../photo';
import { exportTripAccounts } from '../exportTripExcel';
import { Field, Modal, useToast } from './ui';

/*
 * Trip expenses: what was spent on a trip (fuel, food, permits…).
 *   mode="lead"    the guide (Trek Lead portal): add, change or delete
 *                  their expenses until the office has reviewed them
 *   mode="office"  Trip Coordination: add the office's own (approved at
 *                  once), approve / reject the guides', correct or delete
 *                  any, and see the trip's profit or loss
 */
const OTHER = 'Other'; // picking it shows a box for the expense's own name
const PAID_BY_LABEL ={ cash: 'Cash', upi: 'UPI', card: 'Card', other: 'Other' };
const STATUS_TONE = { submitted: 'pending', approved: '', rejected: 'red' };
const STATUS_TEXT = { submitted: 'Waiting for office', approved: 'Approved', rejected: 'Rejected' };

function ExpenseForm({ expense, departureId, options, isLead, onClose, onSaved }) {
  const isNew = !expense.id;
  const [values, setValues] = useState({
    category: expense.category === OTHER ? '' : expense.category || '',
    amount: expense.amount ? String(Number(expense.amount)) : '',
    paid_by: expense.paid_by || 'cash',
    spent_on: String(expense.spent_on || today()).slice(0, 10),
    description: expense.description || '',
  });
  // Own expense name (picked Other): typed in a box under the list
  const [ownName, setOwnName] = useState(expense.category === OTHER || (Boolean(expense.category) && !options.categories.includes(expense.category)));
  const [receipt, setReceipt] = useState(null); // new photo (data URL)
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const set = (name) => (value) => setValues((v) => ({ ...v, [name]: value }));

  const pickPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setReceipt(await resizePhoto(file, 1400));
      setRemoveReceipt(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { ...values, receipt: receipt || undefined, removeReceipt };
      const base = isLead ? '/lead' : '';
      const { data } = isNew
        ? await api(isLead ? `/lead/trips/${departureId}/expenses` : `/departures/${departureId}/expenses`, { method: 'POST', body })
        : await api(`${base}/expenses/${expense.id}`, { method: 'PUT', body });
      onSaved(data, isNew ? 'Expense added' : 'Expense updated');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const oldPhoto = !isNew && Number(expense.has_receipt) && !removeReceipt
    ? `${API_URL}${isLead ? '/lead' : ''}/expenses/${expense.id}/receipt?v=${expense.version}` : null;
  const photo = receipt || oldPhoto;

  return (
    <Modal title={isNew ? 'Add expense' : 'Edit expense'} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form">
          <Field
            field={{
              name: 'category_pick', label: 'What for', type: 'select', required: true, placeholder: 'Choose…',
              options: options.categories.map((c) => ({ value: c, label: c })),
            }}
            value={ownName ? OTHER : values.category}
            onChange={(picked) => {
              // "Other": type the expense's own name in the box below
              if (picked === OTHER) {
                setOwnName(true);
                set('category')('');
              } else {
                setOwnName(false);
                set('category')(picked);
              }
            }}
          />
          {ownName && (
            <Field
              field={{
                name: 'category', label: 'Expense name', required: true,
                placeholder: 'e.g. Bonfire wood, Boat ride, Guide tip',
                hint: 'Write what the money was for. Next time it is in the list too.',
              }}
              value={values.category}
              onChange={set('category')}
            />
          )}
          <Field field={{ name: 'amount', label: 'Amount (₹)', type: 'number', min: 1, step: '0.01', required: true }} value={values.amount} onChange={set('amount')} />
          <Field
            field={{ name: 'paid_by', label: 'Paid by', type: 'select', options: options.paidBy.map((p) => ({ value: p, label: PAID_BY_LABEL[p] || label(p) })) }}
            value={values.paid_by}
            onChange={set('paid_by')}
          />
          <Field field={{ name: 'spent_on', label: 'Date', type: 'date', required: true }} value={values.spent_on} onChange={set('spent_on')} />
          <Field
            field={{
              name: 'description', label: 'Details', type: 'textarea', full: true, rows: 2,
              placeholder: 'e.g. Diesel for the tempo traveller, Bangalore → base camp',
            }}
            value={values.description}
            onChange={set('description')}
          />

          <div className="field full">
            <label>Bill / receipt photo</label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
            {photo ? (
              <div className="expense-photo">
                <img src={photo} alt="Bill" />
                <div>
                  <button type="button" className="btn alt small" onClick={() => { fileRef.current.value = ''; fileRef.current.click(); }}>Change photo</button>
                  <button type="button" className="link danger-text" onClick={() => { setReceipt(null); setRemoveReceipt(!isNew); }}>Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn alt" onClick={() => { fileRef.current.value = ''; fileRef.current.click(); }}>📷 Take or choose a photo</button>
            )}
            <small>{isLead ? 'Optional, but helps the office approve it quickly.' : 'Optional. Office expenses are approved at once.'}</small>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Add expense' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

// Money in from the trip's bookings minus what was spent
function TripProfit({ finance: f }) {
  const tone = (value) => (value > 0 ? 'profit' : value < 0 ? 'loss' : '');
  const word = (value) => (value < 0 ? 'Loss' : 'Profit');
  return (
    <div className="trip-profit">
      <div className={`trip-profit-main ${tone(f.profit)}`}>
        <small>{word(f.profit)} on this trip</small>
        <b>{money(Math.abs(f.profit))}</b>
        <span>
          {money(f.income)} income − {money(f.expenses)} expenses
          {f.expensesWaiting > 0 ? ` (incl. ${money(f.expensesWaiting)} waiting for approval)` : ''}
        </span>
      </div>
      <div className="trip-profit-grid">
        <div><small>Trip income</small><b>{money(f.income)}</b><span>{f.bookings} bookings · {f.people} people{f.kept > 0 ? ` · ${money(f.kept)} kept from cancellations` : ''}{f.b2bNet ? ` · B2B ${money(f.b2bNet)}` : ''}</span></div>
        <div><small>Collected so far</small><b>{money(f.collected)}</b><span>{f.pending > 0 ? `${money(f.pending)} still to collect` : 'Everything collected'}</span></div>
        <div><small>Expenses</small><b>{money(f.expenses)}</b><span>{money(f.expensesApproved)} approved</span></div>
        <div className={tone(f.cashProfit)}><small>{word(f.cashProfit)} with money received so far</small><b>{money(Math.abs(f.cashProfit))}</b><span>Collected − expenses</span></div>
      </div>
    </div>
  );
}

// view: 'all' = everything in one card (guide portal)
//       'overview' = the money card only (Trip Coordination)
//       'list' = the expense list only (Trip Coordination → Expenses tab)
// onChanged: called after an expense is added, changed, reviewed or deleted
export default function TripExpenses({ departureId, departure, mode = 'lead', view = 'all', onChanged }) {
  const toast = useToast();
  const isLead = mode === 'lead';
  const [exporting, setExporting] = useState(false);

  // Office: the trip's accounts as their own Excel (not the customer list)
  const exportAccounts = async () => {
    setExporting(true);
    try {
      const { data: report } = await api(`/departures/${departureId}/report`);
      await exportTripAccounts(departure, report);
    } catch (err) {
      toast(`Export failed: ${err.message}`, 'error');
    }
    setExporting(false);
  };
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // {} = new | expense
  const [busyId, setBusyId] = useState(null);

  const path = isLead ? `/lead/trips/${departureId}/expenses` : `/departures/${departureId}/expenses`;
  const load = useCallback(() => {
    api(path).then(({ data: d }) => { setData(d); setError(''); }).catch((err) => setError(err.message));
  }, [path]);
  useEffect(() => { load(); }, [load]);

  const receiptUrl = (e) => `${API_URL}${isLead ? '/lead' : ''}/expenses/${e.id}/receipt?v=${e.version}`;

  const remove = async (expense) => {
    if (!window.confirm(`Delete ${money(expense.amount)} for ${expense.category}?`)) return;
    setBusyId(expense.id);
    try {
      const { data: d } = await api(`${isLead ? '/lead' : ''}/expenses/${expense.id}`, { method: 'DELETE' });
      setData(d);
      onChanged?.();
      toast('Expense deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusyId(null);
  };

  const review = async (expense, status) => {
    const note = status === 'rejected' ? window.prompt('Why is it rejected? (the guide sees this)', '') : '';
    if (note === null) return; // cancelled
    setBusyId(expense.id);
    try {
      const { data: d } = await api(`/expenses/${expense.id}`, { method: 'PATCH', body: { status, note } });
      setData(d);
      onChanged?.();
      toast(status === 'approved' ? 'Expense approved' : status === 'rejected' ? 'Expense rejected' : 'Back to waiting');
    } catch (err) {
      toast(err.message, 'error');
    }
    setBusyId(null);
  };

  const s = data?.summary;
  const f = data?.finance;
  const form = editing && data && (
    <ExpenseForm
      expense={editing}
      departureId={departureId}
      options={data}
      isLead={isLead}
      onClose={() => setEditing(null)}
      onSaved={(d, message) => { setData(d); setEditing(null); toast(message); onChanged?.(); }}
    />
  );

  // Trip Coordination: income, collected, expenses and profit in one card
  if (view === 'overview') {
    const tone = (value) => (value < 0 ? 'loss' : 'profit');
    return (
      <section className="card fin-card">
        <div className="cardhead">
          <div>
            <h2>Trip financial overview</h2>
            <p>Income, collected amount and expense approvals</p>
          </div>
          <div className="toolbar">
            {departure && (
              <button type="button" className="btn alt" disabled={exporting} onClick={exportAccounts} title="Excel: profit / loss summary, every payment received and every expense">
                {exporting ? 'Preparing…' : 'Export accounts'}
              </button>
            )}
            <button className="btn" onClick={() => setEditing({})}>＋ Add expense</button>
          </div>
        </div>
        {error && <div className="error-box" style={{ margin: 12 }}>{error}</div>}
        {!data && !error && <div className="loading">Loading…</div>}
        {f && (
          <>
            <div className="fin-bar">
              <div className={`fin-profit ${tone(f.profit)}`}>
                <span>{f.profit < 0 ? 'LOSS ON THIS TRIP' : 'PROFIT ON THIS TRIP'}</span>
                <b>{money(Math.abs(f.profit))}</b>
                <small>Income less expenses{f.expensesWaiting > 0 ? ` (incl. ${money(f.expensesWaiting)} waiting)` : ''}</small>
              </div>
              <div className="fin-item"><span>TRIP INCOME</span><b>{money(f.income)}</b><small>{f.bookings} bookings · {f.people} people</small></div>
              <div className="fin-item"><span>COLLECTED SO FAR</span><b>{money(f.collected)}</b><small>{f.pending > 0 ? `${money(f.pending)} to collect` : 'Everything collected'}</small></div>
              <div className="fin-item"><span>EXPENSES</span><b>{money(f.expenses)}</b><small>{money(f.expensesApproved)} approved</small></div>
              <div className="fin-item"><span>PROFIT RECEIVED</span><b className={tone(f.cashProfit)}>{money(f.cashProfit)}</b><small>Collected − expenses</small></div>
            </div>
            <div className="fin-small">
              {[
                ['Total spent', s.total],
                ['Approved', s.approved],
                ['Waiting for office', s.waiting],
                ['Rejected', s.rejected],
              ].map(([title, value]) => <div key={title}>{title}<b>{money(value)}</b></div>)}
            </div>
            <div className="fin-note">
              {s.count ? `${s.count} expense${s.count === 1 ? '' : 's'} on this trip · see the Expenses tab` : 'No expenses added yet. Add food, fuel, stay, permits and other costs.'}
            </div>
          </>
        )}
        {form}
      </section>
    );
  }

  const listOnly = view === 'list';

  return (
    <div className={`card trip-expenses${listOnly ? ' list-only' : ''}`}>
      <div className="cardhead">
        <div>
          <h2>{listOnly ? 'Expense list' : 'Trip expenses'}</h2>
          <p>{isLead
            ? 'What you spent on this trip. You can change an expense until the office reviews it.'
            : 'Office and guide expenses for this trip. Guide expenses wait for your approval; rejected ones are not counted.'}</p>
        </div>
        <div className="toolbar">
          {!isLead && departure && !listOnly && (
            <button
              type="button"
              className="btn alt"
              disabled={exporting}
              title="Excel: profit / loss summary, every payment received and every expense"
              onClick={exportAccounts}
            >
              {exporting ? 'Preparing…' : 'Export trip accounts (Excel)'}
            </button>
          )}
          <button className="btn" onClick={() => setEditing({})}>＋ Add expense</button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!data && !error && <div className="loading">Loading…</div>}

      {data && (
        <>
          {!isLead && !listOnly && data.finance && <TripProfit finance={data.finance} />}
          {!listOnly && <div className="details">
            {[
              ['Total spent', money(s.total)],
              ['Approved', money(s.approved)],
              ['Waiting for office', money(s.waiting)],
              ['Rejected', money(s.rejected)],
            ].map(([title, value]) => <div key={title}><small>{title}</small><b>{value}</b></div>)}
          </div>}

          {data.items.length === 0 ? (
            <div className="empty">No expenses yet. Add fuel, food, stay, permits… with “Add expense”.</div>
          ) : (
            <ul className="expense-list">
              {data.items.map((e) => (
                <li key={e.id} className={`expense ${e.status}`}>
                  {Number(e.has_receipt) ? (
                    <a className="expense-thumb" href={receiptUrl(e)} target="_blank" rel="noreferrer" title="Open the bill photo">
                      <img src={receiptUrl(e)} alt="Bill" loading="lazy" />
                    </a>
                  ) : <span className="expense-thumb none" aria-hidden="true">🧾</span>}
                  <div className="expense-main">
                    <div className="expense-top">
                      <b>{e.category}</b>
                      <b className="expense-amount">{money(e.amount)}</b>
                    </div>
                    {e.description && <div>{e.description}</div>}
                    <div className="muted">
                      {date(e.spent_on)} · {PAID_BY_LABEL[e.paid_by] || label(e.paid_by)}
                      {!isLead && e.created_by_name ? ` · by ${e.created_by_name}` : ''}
                    </div>
                    <div className="expense-status">
                      <span className={`pill ${STATUS_TONE[e.status] ?? 'grey'}`}>{STATUS_TEXT[e.status] || e.status}</span>
                      {e.reviewed_by_name && e.status !== 'submitted' && <span className="muted"> by {e.reviewed_by_name}</span>}
                      {e.review_note && <div className="expense-note">“{e.review_note}”</div>}
                    </div>
                  </div>
                  <div className="expense-actions">
                    {isLead && e.status === 'submitted' && (
                      <>
                        <button className="link" disabled={busyId === e.id} onClick={() => setEditing(e)}>Edit</button>
                        <button className="link danger-text" disabled={busyId === e.id} onClick={() => remove(e)}>Delete</button>
                      </>
                    )}
                    {!isLead && e.status === 'submitted' && (
                      <>
                        <button className="btn small" disabled={busyId === e.id} onClick={() => review(e, 'approved')}>Approve</button>
                        <button className="link danger-text" disabled={busyId === e.id} onClick={() => review(e, 'rejected')}>Reject</button>
                      </>
                    )}
                    {/* A guide's expense that was reviewed can be put back to waiting */}
                    {!isLead && e.status !== 'submitted' && e.created_by !== e.reviewed_by && (
                      <button className="link" disabled={busyId === e.id} onClick={() => review(e, 'submitted')}>Undo review</button>
                    )}
                    {!isLead && (
                      <>
                        <button className="link" disabled={busyId === e.id} onClick={() => setEditing(e)}>Edit</button>
                        <button className="link danger-text" disabled={busyId === e.id} onClick={() => remove(e)}>Delete</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {form}
    </div>
  );
}
