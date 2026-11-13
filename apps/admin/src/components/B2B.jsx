import { useCallback, useEffect, useState } from 'react';

import { api } from '../api';
import { useAdmin } from '../context';
import { date, label, money, today } from '../format';
import { Field, Modal, useToast } from './ui';

/*
 * B2B: customers exchanged with other trek vendors (Trip Coordination).
 *   Inbound  = a vendor gives us customers; they pay us what is left, the
 *              vendor owes us  B2B price × people − what the customer pays us
 *   Outbound = we give some or all people of a booking to a vendor; the
 *              customer pays the vendor the rest, we owe the vendor
 *              B2B price × people − what the customer pays them
 */
const METHODS = [
  { value: 'upi', label: 'UPI' }, { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'other', label: 'Other' },
];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const NEW_VENDOR = '__new__';

// "Vendor owes us ₹X" / "We owe vendor ₹X" / "Settled"
export function settlementText(amount, vendor = 'Vendor') {
  const n = round2(amount);
  if (Math.abs(n) < 0.01) return 'Nothing to settle';
  return n > 0 ? `${vendor} owes us ${money(n)}` : `We owe ${vendor === 'Vendor' ? 'the vendor' : vendor} ${money(-n)}`;
}

/* ---------------- Vendor picker with "+ New vendor" ---------------- */

function useVendors() {
  const [vendors, setVendors] = useState(null);
  const load = useCallback(() => {
    api('/b2b/vendors').then(({ data }) => setVendors(data.filter((v) => Number(v.is_active)))).catch(() => setVendors([]));
  }, []);
  useEffect(() => { load(); }, [load]);
  return [vendors, load];
}

function VendorField({ value, onChange, label: text = 'Vendor' }) {
  const toast = useToast();
  const [vendors, reload] = useVendors();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const add = async () => {
    try {
      const { data } = await api('/b2b/vendors', { method: 'POST', body: { name, phone } });
      toast(`${name} added`);
      setAdding(false);
      setName('');
      setPhone('');
      reload();
      onChange(String(data.id));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <Field
        field={{
          name: 'vendor_id', label: text, type: 'select', required: true, placeholder: vendors ? 'Choose the vendor' : 'Loading…',
          options: [...(vendors || []).map((v) => ({ value: String(v.id), label: v.name })), { value: NEW_VENDOR, label: '＋ New vendor…' }],
          hint: 'Vendors are managed on the B2B Vendors screen',
        }}
        value={value}
        onChange={(picked) => (picked === NEW_VENDOR ? setAdding(true) : onChange(picked))}
      />
      {adding && (
        <div className="field full b2b-newvendor">
          <label>New vendor</label>
          <div className="b2b-newvendor-row">
            <input placeholder="Vendor name *" value={name} onChange={(e) => setName(e.target.value)} />
            <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="button" className="btn small" disabled={!name.trim()} onClick={add}>Add</button>
            <button type="button" className="link" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Inbound: customers from a vendor join this trip ---------------- */

export function InboundModal({ departure, onClose, onSaved }) {
  const { lookups } = useAdmin();
  const [values, setValues] = useState({
    vendor_id: '', name: '', phone: '', email: '', people: '1', with_transport: '1',
    pickup_point_id: '', price_per_person: '', customer_amount: '0', transfer_date: today(), notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  const people = Number(values.people) || 0;
  const b2bTotal = round2((Number(values.price_per_person) || 0) * people);
  const settlement = round2(b2bTotal - (Number(values.customer_amount) || 0));
  const pickups = (lookups?.pickupPoints || [])
    .filter((p) => !p.trip_id || String(p.trip_id) === String(departure.trip_id))
    .map((p) => ({ value: p.id, label: p.name }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/departures/${departure.id}/b2b/inbound`, { method: 'POST', body: values });
      onSaved(`${values.name} (${people} ${people === 1 ? 'person' : 'people'}) added from the vendor`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="Add customer from a vendor (inbound B2B)" onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="form">
          <VendorField value={values.vendor_id} onChange={set('vendor_id')} label="Vendor who sends the customer" />
          <Field field={{ name: 'transfer_date', label: 'Date', type: 'date', required: true }} value={values.transfer_date} onChange={set('transfer_date')} />
          <Field field={{ name: 'name', label: 'Customer name', required: true }} value={values.name} onChange={set('name')} />
          <Field field={{ name: 'phone', label: 'Mobile', required: true }} value={values.phone} onChange={set('phone')} />
          <Field field={{ name: 'email', label: 'Email', type: 'email' }} value={values.email} onChange={set('email')} />
          <Field field={{ name: 'people', label: 'People', type: 'number', min: 1, step: '1', required: true }} value={values.people} onChange={set('people')} />
          <Field field={{ name: 'with_transport', label: 'Transport', type: 'select', options: [{ value: '1', label: 'With transport' }, { value: '0', label: 'Without transport' }] }} value={values.with_transport} onChange={set('with_transport')} />
          <Field field={{ name: 'pickup_point_id', label: 'Pickup', type: 'select', placeholder: 'Self / not decided', options: pickups }} value={values.pickup_point_id} onChange={set('pickup_point_id')} />
          <Field field={{ name: 'price_per_person', label: 'B2B price per person (₹)', type: 'number', min: 0, step: '0.01', required: true, hint: 'Agreed with this vendor' }} value={values.price_per_person} onChange={set('price_per_person')} />
          <Field field={{ name: 'customer_amount', label: 'Customer pays us (₹)', type: 'number', min: 0, step: '0.01', hint: 'The balance we collect from the customer (0 if the vendor collected everything)' }} value={values.customer_amount} onChange={set('customer_amount')} />
          <Field field={{ name: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2 }} value={values.notes} onChange={set('notes')} />
          <div className="field full">
            <div className={`b2b-calc ${settlement < 0 ? 'out' : 'in'}`}>
              <span>B2B total {money(b2bTotal)} ({people} × {money(Number(values.price_per_person) || 0)})</span>
              <b>{settlementText(settlement)}</b>
              <small>B2B total − what the customer pays us. They join this trip and count in its seats.</small>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Add customer'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Outbound: give some or all people to a vendor ---------------- */

export function TransferModal({ booking, onClose, onSaved }) {
  const total = Number(booking.people) || 1;
  const amount = Number(booking.amount) || 0;
  const paid = Number(booking.amount_paid) || 0;
  const share = (n) => ({
    moved_amount: String(round2((amount * n) / total)),
    moved_advance: String(round2((paid * n) / total)),
  });
  const [values, setValues] = useState({
    vendor_id: '', people: String(total), price_per_person: '', transfer_date: today(), reason: '',
    ...share(total), customer_amount: String(round2(amount - paid)),
  });
  const [customerEdited, setCustomerEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  const count = Math.min(total, Math.max(1, Number(values.people) || 1));
  const whole = count === total;
  // Changing the number of people: suggest that share of the money again
  const changePeople = (value) => {
    const n = Math.min(total, Math.max(1, Number(value) || 1));
    const next = share(n);
    setValues((v) => ({
      ...v, people: value, ...next,
      customer_amount: customerEdited ? v.customer_amount : String(round2(Number(next.moved_amount) - Number(next.moved_advance))),
    }));
  };
  const changeMoney = (key) => (value) => setValues((v) => {
    const next = { ...v, [key]: value };
    if (!customerEdited) next.customer_amount = String(round2((Number(next.moved_amount) || 0) - (Number(next.moved_advance) || 0)));
    return next;
  });

  const b2bTotal = round2((Number(values.price_per_person) || 0) * count);
  const settlement = round2((Number(values.customer_amount) || 0) - b2bTotal);
  const margin = round2((Number(values.moved_advance) || 0) + settlement);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/bookings/${booking.id}/transfer`, { method: 'POST', body: { ...values, people: count } });
      onSaved(`${count} ${count === 1 ? 'person' : 'people'} of ${booking.booking_ref} transferred · ${count} seat${count === 1 ? '' : 's'} freed`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={`Make B2B · give ${booking.customer_name} to a vendor`} onClose={onClose} wide>
      <form onSubmit={save}>
        <div className="form">
          <div className="field full">
            <div className="field-info">
              {booking.booking_ref} · {total} {total === 1 ? 'person' : 'people'} · Total {money(amount)} · Paid {money(paid)} · Balance {money(amount - paid)}
            </div>
          </div>
          <VendorField value={values.vendor_id} onChange={set('vendor_id')} label="Give to which vendor?" />
          <Field field={{ name: 'people', label: `People to transfer (of ${total})`, type: 'number', min: 1, step: '1', required: true, hint: whole ? 'The whole booking moves' : `${total - count} stay on this trip` }} value={values.people} onChange={changePeople} />
          <Field field={{ name: 'moved_amount', label: 'Their share of the booking (₹)', type: 'number', min: 0, step: '0.01', hint: 'Suggested by people; change if needed' }} value={values.moved_amount} onChange={changeMoney('moved_amount')} />
          <Field field={{ name: 'moved_advance', label: 'Advance they paid us (₹)', type: 'number', min: 0, step: '0.01', hint: 'We keep this' }} value={values.moved_advance} onChange={changeMoney('moved_advance')} />
          <Field field={{ name: 'customer_amount', label: 'Customer pays the vendor (₹)', type: 'number', min: 0, step: '0.01', hint: 'The rest, paid directly to the vendor' }} value={values.customer_amount} onChange={(v) => { setCustomerEdited(true); set('customer_amount')(v); }} />
          <Field field={{ name: 'price_per_person', label: 'B2B price per person (₹)', type: 'number', min: 0, step: '0.01', required: true, hint: 'Agreed with this vendor' }} value={values.price_per_person} onChange={set('price_per_person')} />
          <Field field={{ name: 'transfer_date', label: 'Transfer date', type: 'date', required: true }} value={values.transfer_date} onChange={set('transfer_date')} />
          <Field field={{ name: 'reason', label: 'Reason', full: true, placeholder: 'e.g. Batch full' }} value={values.reason} onChange={set('reason')} />
          <div className="field full">
            <div className={`b2b-calc ${settlement < 0 ? 'out' : 'in'}`}>
              <span>B2B total {money(b2bTotal)} ({count} × {money(Number(values.price_per_person) || 0)})</span>
              <b>{settlementText(settlement)}</b>
              <small>
                Customer pays the vendor − B2B total. We keep the {money(Number(values.moved_advance) || 0)} advance, so we earn {money(margin)} on these {count}.
                {' '}They leave this trip's customer list and {count} seat{count === 1 ? '' : 's'} are freed; the booking is kept as “Transferred”.
              </small>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Transferring…' : `Transfer ${count} ${count === 1 ? 'person' : 'people'}`}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- Settlement with the vendor ---------------- */

export function SettlementModal({ record, onClose, onSaved }) {
  const owesUs = record.remaining > 0;
  const [values, setValues] = useState({
    direction: owesUs ? 'received' : 'paid', amount: String(Math.abs(record.remaining)),
    paid_on: today(), method: 'upi', reference: '', note: '',
  });
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    api(`/b2b/records/${record.id}/settlements`).then(({ data }) => setHistory(data)).catch(() => {});
  }, [record.id]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/b2b/records/${record.id}/settlements`, { method: 'POST', body: values });
      onSaved(values.direction === 'paid' ? `${money(values.amount)} paid to ${record.vendor_name}` : `${money(values.amount)} received from ${record.vendor_name}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={`Settle with ${record.vendor_name}`} onClose={onClose}>
      <form onSubmit={save}>
        <div className="form">
          <div className="field full">
            <div className={`b2b-calc ${record.remaining < 0 ? 'out' : 'in'}`}>
              <span>{record.customer_name} · {record.people} {Number(record.people) === 1 ? 'person' : 'people'} · {record.booking_ref}</span>
              <b>{settlementText(record.remaining, record.vendor_name)}</b>
              <small>Agreed {settlementText(record.settlement, record.vendor_name).toLowerCase()} · settled so far {money(Math.abs(record.settled))}</small>
            </div>
          </div>
          <Field field={{ name: 'direction', label: 'Money', type: 'select', options: [{ value: 'received', label: `Received from ${record.vendor_name}` }, { value: 'paid', label: `Paid to ${record.vendor_name}` }] }} value={values.direction} onChange={set('direction')} />
          <Field field={{ name: 'amount', label: 'Amount (₹)', type: 'number', min: 0, step: '0.01', required: true }} value={values.amount} onChange={set('amount')} />
          <Field field={{ name: 'paid_on', label: 'Date', type: 'date', required: true }} value={values.paid_on} onChange={set('paid_on')} />
          <Field field={{ name: 'method', label: 'Method', type: 'select', options: METHODS }} value={values.method} onChange={set('method')} />
          <Field field={{ name: 'reference', label: 'Reference', placeholder: 'UPI / transaction ID' }} value={values.reference} onChange={set('reference')} />
          <Field field={{ name: 'note', label: 'Note' }} value={values.note} onChange={set('note')} />
          {history.length > 0 && (
            <div className="field full">
              <label>Settled before</label>
              <table className="lead-mini">
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}><td>{date(h.paid_on)}</td><td>{h.direction === 'paid' ? 'Paid to vendor' : 'Received'}</td><td>{label(h.method)}</td><td className="num">{money(h.amount)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>
    </Modal>
  );
}
