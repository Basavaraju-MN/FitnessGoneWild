import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import '../../styles/places.css';

/**
 * Dropdown in the bar above the trek list (region, departure city).
 *   label     small heading on the button, e.g. "Select region"
 *   allLabel  first option, e.g. "All regions" (value null)
 *   options   [{ id, name, note, disabled }]
 */
export default function FilterPicker({ icon: Icon, label, allLabel, allNote, options, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((option) => option.id === value) || null;

  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className={`city-picker ${className}`} ref={boxRef}>
      <button
        type="button"
        className="city-picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {Icon && <Icon size={18} aria-hidden="true" />}
        <span className="city-picker-text">
          <small>{label}</small>
          <strong>{selected ? selected.name : allLabel}</strong>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={open ? 'flip' : ''} />
      </button>

      {open && (
        <ul className="city-picker-menu" role="listbox" aria-label={label}>
          <li>
            <button
              type="button"
              role="option"
              aria-selected={!selected}
              className={!selected ? 'active' : ''}
              onClick={() => pick(null)}
            >
              <span>
                <strong>{allLabel}</strong>
                {allNote && <small>{allNote}</small>}
              </span>
              {!selected && <Check size={16} aria-hidden="true" />}
            </button>
          </li>
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected?.id === option.id}
                className={selected?.id === option.id ? 'active' : ''}
                disabled={option.disabled}
                onClick={() => pick(option.id)}
              >
                <span>
                  <strong>{option.name}</strong>
                  {option.note && <small>{option.note}</small>}
                </span>
                {selected?.id === option.id && <Check size={16} aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
