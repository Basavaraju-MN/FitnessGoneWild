import { useAdmin } from '../context';
import { label } from '../format';
import MasterTable, { activeField } from './MasterTable';
import { Modal } from './ui';

// Lead statuses come from the database (lookups.leadStatuses)
export const MANAGE = '__manage';

const PILL = { blue: 'blue', amber: 'pending', green: '', red: 'red', grey: 'grey' };

export function useLeadStatuses() {
  const { lookups } = useAdmin();
  const all = lookups?.leadStatuses || [];
  const byKey = Object.fromEntries(all.map((s) => [s.status_key, s]));
  return {
    all,
    active: all.filter((s) => Number(s.is_active)),
    of: (key) => byKey[key] || { status_key: key, label: label(key), tone: 'grey', stage: 'open', sort_order: 999 },
  };
}

export function LeadStatusPill({ value }) {
  const status = useLeadStatuses().of(value);
  return <span className={`pill ${PILL[status.tone] ?? 'grey'}`}>{status.label}</span>;
}

/**
 * Status dropdown for one lead. The last option opens "Manage statuses".
 */
export function LeadStatusSelect({ value, onChange, onManage }) {
  const { active, of } = useLeadStatuses();
  const current = of(value);
  const options = active.some((s) => s.status_key === value) ? active : [current, ...active];

  return (
    <select
      className={`inline-select status-select tone-${current.tone}`}
      value={value}
      onChange={(e) => (e.target.value === MANAGE ? onManage() : onChange(e.target.value))}
    >
      {options.map((s) => <option key={s.status_key} value={s.status_key}>{s.label}</option>)}
      <option disabled>──────────</option>
      <option value={MANAGE}>⚙ Manage statuses…</option>
    </select>
  );
}

const STAGES = [
  { value: 'open', label: 'In progress (still working on it)' },
  { value: 'won', label: 'Booked (converted)' },
  { value: 'lost', label: 'Lost / closed' },
];
const TONES = ['blue', 'amber', 'green', 'red', 'grey'].map((t) => ({ value: t, label: label(t) }));

export function ManageLeadStatuses({ onClose }) {
  return (
    <Modal wide title="Lead statuses" onClose={onClose}>
      <MasterTable
        type="lead-statuses"
        title="Statuses"
        note="Shown in the status dropdown in this order. Hide one with Active off; leads keep it."
        singular="Status"
        fields={[
          { name: 'label', label: 'Name', required: true, placeholder: 'e.g. Site visit planned' },
          { name: 'sort_order', label: 'Order', type: 'number', min: 0, hint: 'Lower numbers come first' },
          { name: 'stage', label: 'Counts as', type: 'select', required: true, options: STAGES, hint: 'Used for the In progress / Booked / Lost numbers' },
          { name: 'tone', label: 'Colour', type: 'select', required: true, options: TONES },
          activeField,
        ]}
        prepare={(values) => ({ stage: 'open', tone: 'blue', ...values })}
        columns={[
          { key: 'sort_order', label: 'Order' },
          { key: 'label', label: 'Name', render: (r) => <span className={`pill ${PILL[r.tone] ?? 'grey'}`}>{r.label}</span>, csv: (r) => r.label },
          { key: 'stage', label: 'Counts as', render: (r) => STAGES.find((s) => s.value === r.stage)?.label.split(' (')[0] || r.stage },
          { key: 'is_system', label: '', sortable: false, export: false, render: (r) => (Number(r.is_system) ? <span className="muted">System</span> : '') },
        ]}
      />
    </Modal>
  );
}
