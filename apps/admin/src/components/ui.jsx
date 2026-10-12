import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { label } from '../format';

/* ---------- Toast ---------- */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modalbg" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modalhead">
          <h2>{title}</h2>
          <button type="button" className="btn alt" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
        {footer && <div className="modalfoot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Form ----------
 * fields: [{ name, label, type?, options?, required?, full?, hint?, min?, step? }]
 * options: [{ value, label }]
 */
export function FormModal({ title, fields, initial = {}, onSubmit, onClose, submitLabel = 'Save', wide }) {
  const [values, setValues] = useState(() => {
    const start = {};
    for (const field of fields) {
      start[field.name] = initial[field.name] ?? (field.type === 'checkbox' ? false : '');
    }
    return start;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose} wide={wide}>
      <form onSubmit={submit}>
        <div className="form">
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={values[field.name]}
              values={values}
              onChange={(value) => set(field.name, value)}
            />
          ))}
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modalfoot">
          <button type="button" className="btn alt" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Field({ field, value, values, onChange }) {
  const options = typeof field.options === 'function' ? field.options(values) : field.options;
  const hint = typeof field.hint === 'function' ? field.hint(values) : field.hint;
  const common = {
    id: `f-${field.name}`,
    required: field.required,
    value: value ?? '',
    onChange: (event) => onChange(event.target.value),
  };

  // Read-only line of text inside a form
  if (field.type === 'info') {
    return (
      <div className={`field ${field.full ? 'full' : ''}`}>
        <label>{field.label}</label>
        <div className="field-info">{field.text}</div>
      </div>
    );
  }

  let input;
  if (field.type === 'select') {
    input = (
      <select {...common}>
        <option value="">{field.placeholder || 'Select…'}</option>
        {(options || []).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  } else if (field.type === 'textarea') {
    input = <textarea rows={field.rows || 3} {...common} />;
  } else if (field.type === 'checkbox') {
    return (
      <div className={`field check ${field.full ? 'full' : ''}`}>
        <label>
          <input
            type="checkbox"
            checked={Boolean(Number(value) || value === true)}
            onChange={(event) => onChange(event.target.checked)}
          />
          {field.label}
        </label>
        {hint && <small>{hint}</small>}
      </div>
    );
  } else if (field.type === 'password') {
    input = <PasswordInput autoComplete="new-password" {...common} />;
  } else {
    input = (
      <input
        type={field.type || 'text'}
        min={field.min}
        step={field.step}
        placeholder={field.placeholder}
        {...common}
      />
    );
  }

  return (
    <div className={`field ${field.full ? 'full' : ''}`}>
      <label htmlFor={common.id}>
        {field.label}{field.required ? ' *' : ''}
      </label>
      {input}
      {hint && <small>{hint}</small>}
    </div>
  );
}

/* ---------- Password with show / hide ---------- */
const EyeIcon = ({ crossed }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="menu-icon">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {crossed && <path d="M4 4l16 16" />}
  </svg>
);

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input {...props} type={visible ? 'text' : 'password'} />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
      >
        <EyeIcon crossed={visible} />
      </button>
    </div>
  );
}

/* ---------- Status pill ---------- */
const PILL_TONES = {
  // green
  confirmed: '', paid: '', success: '', completed: '', active: '', booked: '', converted: '', published: '', open: '',
  // amber
  pending: 'pending', partial: 'pending', processing: 'pending', contacted: 'pending', upcoming: 'pending', draft: 'pending', interested: 'pending',
  // red
  cancelled: 'red', failed: 'red', unpaid: 'red', not_contacted: 'red', full: 'red', not_interested: 'red', inactive: 'red',
  // blue
  new: 'blue', ongoing: 'blue', custom: 'blue',
  // grey
  closed: 'grey', archived: 'grey', refunded: 'grey', scheduled: 'grey',
};

export function Pill({ value }) {
  const key = String(value || '').toLowerCase();
  return <span className={`pill ${PILL_TONES[key] ?? 'grey'}`}>{label(value) || '—'}</span>;
}

/* ---------- Stat cards ---------- */
export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([title, value, note]) => (
        <div className="card stat" key={title}>
          <small>{title}</small>
          <div className="num">{value}</div>
          <span className="green">{note}</span>
        </div>
      ))}
    </div>
  );
}

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}
