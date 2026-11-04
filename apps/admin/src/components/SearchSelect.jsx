import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ---------- Dropdown with a search box ----------
 * Used like a <select>: value (string or number), onChange(value as string),
 * options [{ value, label, disabled? }]. The search box shows when there are
 * more than a few options (or always with searchable). The list opens in a
 * layer on top (it is not cut off inside pop-ups) and works with the keyboard:
 * ↑ ↓ to move, Enter to choose, Esc to close.
 */
const SEARCH_FROM = 7;

const clean = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export default function SearchSelect({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  required = false,
  disabled = false,
  allowEmpty = true,
  searchable,
  className = '',
  ariaLabel,
  onClick,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState(null);
  const button = useRef(null);
  const panel = useRef(null);
  const search = useRef(null);
  const list = useRef(null);
  const typed = useRef('');

  const current = options.find((o) => String(o.value) === String(value ?? ''));
  const showSearch = searchable ?? options.length > SEARCH_FROM;

  // The empty choice ("Select…", "All treks"…) stays first and is never filtered out
  const choices = useMemo(() => {
    const words = clean(query).split(/\s+/).filter(Boolean);
    const found = options.filter((o) => words.every((w) => clean(o.label).includes(w)));
    return allowEmpty && !words.length ? [{ value: '', label: placeholder, empty: true }, ...found] : found;
  }, [options, query, allowEmpty, placeholder]);

  // Where the list goes: under the field, or above it when there is no room below
  const measure = () => {
    const box = button.current?.getBoundingClientRect();
    if (!box) return;
    const below = window.innerHeight - box.bottom;
    const up = below < 280 && box.top > below;
    setPlace({
      left: Math.min(box.left, window.innerWidth - Math.max(box.width, 240) - 8),
      width: Math.max(box.width, 240),
      top: up ? undefined : box.bottom + 4,
      bottom: up ? window.innerHeight - box.top + 4 : undefined,
      maxHeight: Math.max(160, Math.min(340, (up ? box.top : below) - 16)),
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const onMove = (event) => {
      if (panel.current?.contains(event.target)) return;
      measure();
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  // Click anywhere else closes it
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (button.current?.contains(event.target) || panel.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Opening: the chosen option is highlighted, the search box gets the cursor
  useEffect(() => {
    if (!open) return;
    // Opened by typing: that letter starts the search
    setQuery(typed.current);
    const at = typed.current ? 0 : choices.findIndex((o) => String(o.value) === String(value ?? ''));
    typed.current = '';
    setActive(Math.max(0, at));
    requestAnimationFrame(() => (showSearch ? search.current : list.current)?.focus({ preventScroll: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted option in view (scrolls the list only, never the pop-up behind it)
  useEffect(() => {
    const box = list.current;
    const item = box?.querySelector(`[data-index="${active}"]`);
    if (!item) return;
    if (item.offsetTop < box.scrollTop) box.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = item.offsetTop + item.offsetHeight - box.clientHeight;
    }
  }, [active, open, place]);

  const choose = (option) => {
    if (!option || option.disabled) return;
    setOpen(false);
    button.current?.focus({ preventScroll: true });
    if (String(option.value) !== String(value ?? '')) onChange(String(option.value));
  };

  const onKey = (event) => {
    if (event.key === 'Escape') {
      // Closes the list only, not the pop-up it is in
      event.stopPropagation();
      setOpen(false);
      button.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(choices.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(choices[active]);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const isLetter = (event) => event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

  // On the field itself: arrows / Enter / Space open the list, typing starts a
  // search, and keys pressed before the list has the cursor still count
  const onButtonKey = (event) => {
    if (open) {
      if (showSearch && isLetter(event)) {
        event.preventDefault();
        setQuery((q) => q + event.key);
      } else {
        onKey(event);
      }
      return;
    }
    if (showSearch && isLetter(event) && event.key !== ' ') {
      event.preventDefault();
      typed.current = event.key;
      setOpen(true);
    } else if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <span className={`ss ${className}`} onClick={onClick}>
      <button
        ref={button}
        id={id}
        type="button"
        className={`ss-trigger ${current ? '' : 'ss-placeholder'}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKey}
      >
        <span className="ss-value">{current ? current.label : placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="ss-chevron"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {/* Lets the form's required check work like a normal dropdown */}
      {required && (
        <input
          className="ss-required"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={current ? String(value) : ''}
          onChange={() => {}}
          onFocus={() => button.current?.focus()}
        />
      )}
      {open && place && createPortal(
        <div
          ref={panel}
          className="ss-panel"
          style={{ left: place.left, width: place.width, top: place.top, bottom: place.bottom }}
          onKeyDown={onKey}
        >
          {showSearch && (
            <input
              ref={search}
              className="ss-search"
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search the list"
            />
          )}
          <ul ref={list} className="ss-list" role="listbox" tabIndex={-1} style={{ maxHeight: place.maxHeight - (showSearch ? 46 : 0) }}>
            {choices.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                data-index={index}
                role="option"
                aria-selected={String(option.value) === String(value ?? '')}
                aria-disabled={option.disabled || undefined}
                className={[
                  index === active ? 'active' : '',
                  String(option.value) === String(value ?? '') ? 'chosen' : '',
                  option.empty ? 'ss-empty-choice' : '',
                  option.disabled ? 'disabled' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.label}
              </li>
            ))}
            {!choices.length && <li className="ss-none">Nothing matches “{query}”</li>}
          </ul>
        </div>,
        document.body
      )}
    </span>
  );
}
