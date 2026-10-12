import { useEffect, useRef, useState } from 'react';

// Simple line icons (inherit the text colour)
const KeyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="menu-icon">
    <circle cx="8" cy="15" r="4" />
    <path d="M10.8 12.2 20 3M16 7l3 3M18 5l2 2" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="menu-icon">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const ROLE_NAMES = { admin: 'Admin', sales: 'Sales Team', operations: 'Operations Team' };

// "Basavaraju M N" -> "BM", "admin" -> "A"
const initialsOf = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

/** Round avatar with the user's initials; click for details and log out. */
export default function ProfileMenu({ user, onChangePassword, onLogout }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initials = initialsOf(user.fullName || user.username);
  const role = ROLE_NAMES[user.role] || user.role;

  return (
    <div className="profile" ref={boxRef}>
      <button
        type="button"
        className="avatar"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Account menu for ${user.fullName}`}
        aria-expanded={open}
        title={user.fullName}
      >
        {initials}
      </button>

      {open && (
        <div className="profile-panel">
          <div className="profile-head">
            <span className="avatar large">{initials}</span>
            <div>
              <b>{user.fullName}</b>
              <small>{role}</small>
            </div>
          </div>

          <div className="profile-details">
            <div><small>Username</small>{user.username}</div>
            <div><small>Email</small>{user.email}</div>
          </div>

          <button
            type="button"
            className="profile-action"
            onClick={() => {
              setOpen(false);
              onChangePassword();
            }}
          >
            <KeyIcon /> Change password
          </button>
          <button type="button" className="profile-action logout" onClick={onLogout}>
            <LogoutIcon /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
