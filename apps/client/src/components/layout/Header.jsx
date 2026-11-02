import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Scroll to a home-page section ("top" = page top); the sticky header is
// allowed for by scroll-padding-top in global.css
export const scrollToSection = (id) => {
  if (id === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const LINKS = [
  ['top', 'Home'],
  ['trips', 'Trips'],
  ['featured', 'Featured'],
  ['why', 'Why us'],
  ['reviews', 'Reviews'],
  ['faq', 'FAQ'],
];

/**
 * onNavigate(id): set by the home page so a link can first close an open
 * trek page (its sections are hidden while a trek is shown).
 */
export default function Header({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const go = (event, id) => {
    event.preventDefault();
    setOpen(false);

    if (onNavigate) onNavigate(id);
    else if (location.pathname !== '/') navigate(`/#${id}`);
    else scrollToSection(id);
  };

  return (
    <header className="site-header">
      <nav className="nav" aria-label="Main navigation">
        <a className="brand" href="/#top" onClick={(event) => go(event, 'top')}>
          <img className="brand-logo" src="/images/logo.png" alt="The Fitness Gone Wild" />
        </a>

        <button
          type="button"
          className="mobile-menu"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${open ? 'open' : ''}`}>
          {LINKS.map(([id, label]) => (
            <a key={id} href={`/#${id}`} onClick={(event) => go(event, id)}>
              {label}
            </a>
          ))}
          <a className="btn btn-sm" href="/#contact" onClick={(event) => go(event, 'contact')}>
            Talk to us
          </a>
        </div>
      </nav>
    </header>
  );
}
