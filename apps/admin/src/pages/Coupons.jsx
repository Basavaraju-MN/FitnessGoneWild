import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { date, money } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, Stats, useToast } from '../components/ui';

/* ---------- Coupons ----------
 * Discount codes customers apply when booking on the website: ₹ off or % off,
 * with optional conditions (people, amount, dates, number of uses), for all
 * treks or chosen ones. Public coupons are listed on the trek's booking pop-up;
 * the others work only when the code is typed in.
 */
const today = () => new Date().toISOString().slice(0, 10);

// Why a coupon cannot be used right now ('' = it can)
const blockedReason = (c) => {
  if (!Number(c.is_active)) return 'Switched off';
  if (c.valid_to && String(c.valid_to).slice(0, 10) < today()) return 'Expired';
  if (c.valid_from && String(c.valid_from).slice(0, 10) > today()) return 'Not started';
  if (c.usage_limit != null && Number(c.used_count) >= Number(c.usage_limit)) return 'Used up';
  return '';
};

// Conditions in plain words: "10+ people · from ₹5,000 · 1 Nov – 30 Nov"
const conditionsOf = (c) => [
  c.min_people ? `${c.min_people}+ people` : null,
  c.min_amount ? `from ${money(c.min_amount)}` : null,
  c.valid_from || c.valid_to ? `${c.valid_from ? date(c.valid_from) : '…'} – ${c.valid_to ? date(c.valid_to) : '…'}` : null,
].filter(Boolean).join(' · ') || 'None';

const couponFields = (trips) => [
  { name: 'code', label: 'Coupon code', required: true, placeholder: 'e.g. FAMILY500', hint: 'What the customer types. Letters and numbers (also - _), saved in capitals.' },
  { name: 'title', label: 'Title', required: true, placeholder: 'e.g. ₹500 off for families', hint: 'Shown to customers on the booking pop-up' },
  { name: 'description', label: 'Description', type: 'textarea', full: true, placeholder: 'e.g. Valid for bookings of 4 or more people.' },
  {
    name: 'discount_type', label: 'Discount type', type: 'select', required: true,
    options: [{ value: 'flat', label: '₹ off (fixed amount)' }, { value: 'percent', label: '% off the trip price' }],
  },
  {
    name: 'discount_value', label: 'Discount', type: 'number', min: 1, step: '0.01', required: true,
    hint: (v) => (v.discount_type === 'percent' ? 'Percent, e.g. 10 for 10% off' : 'Rupees, e.g. 500 for ₹500 off'),
  },
  { name: 'max_discount', label: 'Maximum discount (₹)', type: 'number', min: 1, step: '0.01', hint: 'Optional cap, e.g. 10% off up to ₹1,000', hidden: (v) => v.discount_type !== 'percent' },
  { name: 'min_people', label: 'Minimum people', type: 'number', min: 1, step: '1', hint: 'Optional, e.g. 10 for a group offer' },
  { name: 'min_amount', label: 'Minimum booking (₹, before GST)', type: 'number', min: 1, step: '0.01', hint: 'Optional' },
  { name: 'valid_from', label: 'Valid from', type: 'date', hint: 'Optional (booking date)' },
  { name: 'valid_to', label: 'Valid until', type: 'date', hint: 'Optional, last day it can be used' },
  { name: 'usage_limit', label: 'Number of uses', type: 'number', min: 1, step: '1', hint: 'Optional, e.g. 50 bookings in total' },
  {
    name: 'applies_to', label: 'For which treks', type: 'select', required: true,
    options: [{ value: 'all', label: 'All treks and trips' }, { value: 'selected', label: 'Only the treks I choose' }],
  },
  {
    name: 'trip_ids', label: 'Treks', type: 'checklist', full: true,
    options: trips.map((t) => ({ value: t.id, label: t.name })),
    hidden: (v) => v.applies_to !== 'selected',
  },
  { name: 'is_public', label: 'Show it on the booking pop-up (otherwise only works when the code is typed)', type: 'checkbox', full: true },
  { name: 'is_active', label: 'Active (customers can use it)', type: 'checkbox', full: true },
];

export default function Coupons() {
  const toast = useToast();
  const { lookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/coupons');
  const [form, setForm] = useState(null); // 'new' | coupon
  const trips = lookups?.trips || [];
  const tripName = (id) => trips.find((t) => Number(t.id) === Number(id))?.name || `Trek #${id}`;

  const list = data || [];
  const usable = list.filter((c) => !blockedReason(c));
  const sum = (key) => list.reduce((s, c) => s + Number(c[key] || 0), 0);

  const save = async (values) => {
    const body = {
      ...values,
      trip_ids: (Array.isArray(values.trip_ids) ? values.trip_ids : String(values.trip_ids || '').split(',')).filter(Boolean).map(Number),
      is_public: values.is_public ? 1 : 0,
      is_active: values.is_active ? 1 : 0,
    };
    if (form === 'new') await api('/coupons', { method: 'POST', body });
    else await api(`/coupons/${form.id}`, { method: 'PUT', body });
    toast(form === 'new' ? `Coupon ${String(values.code).toUpperCase()} created` : 'Coupon saved');
    setForm(null);
    reload();
  };

  const toggle = async (c) => {
    try {
      await api(`/coupons/${c.id}`, { method: 'PUT', body: { is_active: Number(c.is_active) ? 0 : 1 } });
      toast(Number(c.is_active) ? `${c.code} switched off` : `${c.code} switched on`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await api(`/coupons/${c.id}`, { method: 'DELETE' });
      toast(`${c.code} deleted`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHead title="Coupons" subtitle="Discount codes customers apply when booking on the website: ₹ off or % off, for all treks or chosen ones.">
        <button className="btn" onClick={() => setForm('new')}>＋ Create coupon</button>
      </PageHead>

      <Stats
        items={[
          ['Coupons', list.length, `${usable.length} can be used now`],
          ['Shown to customers', usable.filter((c) => Number(c.is_public)).length, 'On the booking pop-up'],
          ['Bookings with a coupon', sum('bookings'), 'Not counting cancelled'],
          ['Discount given', money(sum('discount_given')), 'Off the total, after GST'],
        ]}
      />

      <DataTable
        title="All coupons"
        subtitle="Switched-off, expired and used-up coupons stay here; customers cannot use them."
        rows={list}
        loading={loading}
        error={error}
        exportName="fgw-coupons.csv"
        searchPlaceholder="Search coupons…"
        initialSort={{ key: 'id', dir: 'desc' }}
        emptyText="No coupons yet. Create the first one with “＋ Create coupon”."
        columns={[
          { key: 'code', label: 'Code', render: (c) => <b className="coupon-code">{c.code}</b> },
          { key: 'title', label: 'Title', render: (c) => <>{c.title}{c.description ? <><br /><span className="muted">{c.description}</span></> : null}</> },
          { key: 'label', label: 'Discount', render: (c) => <b>{c.label}</b> },
          { key: 'conditions', label: 'Conditions', sortable: false, render: conditionsOf, csv: conditionsOf },
          {
            key: 'applies_to', label: 'Treks',
            render: (c) => (c.applies_to === 'all' ? 'All treks' : c.trip_ids.map(tripName).join(', ')),
            csv: (c) => (c.applies_to === 'all' ? 'All treks' : c.trip_ids.map(tripName).join('; ')),
          },
          { key: 'used_count', label: 'Used', render: (c) => `${c.used_count}${c.usage_limit ? ` / ${c.usage_limit}` : ''}` },
          { key: 'discount_given', label: 'Discount given', render: (c) => money(c.discount_given) },
          { key: 'is_public', label: 'Shown', render: (c) => (Number(c.is_public) ? 'On pop-up' : 'Code only'), csv: (c) => (Number(c.is_public) ? 'On pop-up' : 'Code only') },
          {
            key: 'status', label: 'Status', sortValue: (c) => blockedReason(c) || 'Active',
            render: (c) => <Pill value={blockedReason(c) ? (Number(c.is_active) ? 'inactive' : 'cancelled') : 'active'} />,
            csv: (c) => blockedReason(c) || 'Active',
          },
          {
            key: 'actions', label: '', sortable: false, export: false,
            render: (c) => (
              <span className="row-actions">
                <button className="link" onClick={() => setForm(c)}>Edit</button>
                <button className="link" onClick={() => toggle(c)}>{Number(c.is_active) ? 'Switch off' : 'Switch on'}</button>
                {!Number(c.used_count) && !Number(c.bookings) && <button className="link danger-text" onClick={() => remove(c)}>Delete</button>}
              </span>
            ),
          },
        ]}
      />

      {form && (
        <FormModal
          wide
          title={form === 'new' ? 'Create coupon' : `Edit ${form.code}`}
          submitLabel={form === 'new' ? 'Create coupon' : 'Save'}
          initial={form === 'new'
            ? { discount_type: 'flat', applies_to: 'all', is_public: true, is_active: true, trip_ids: [] }
            : {
              ...form,
              valid_from: form.valid_from ? String(form.valid_from).slice(0, 10) : '',
              valid_to: form.valid_to ? String(form.valid_to).slice(0, 10) : '',
              is_public: Boolean(Number(form.is_public)),
              is_active: Boolean(Number(form.is_active)),
            }}
          fields={couponFields(trips)}
          onClose={() => setForm(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
