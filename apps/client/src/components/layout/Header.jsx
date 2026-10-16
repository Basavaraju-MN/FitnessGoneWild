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
    <header
      className="site-header"
      style={{
        backgroundColor: '#008b8b',
      }}
    >
      <nav
        className="nav"
        aria-label="Main navigation"
      >
        <a
          className="brand"
          href="/#top"
          onClick={(event) => go(event, 'top')}
        >
          <img
            src="/images/logo.png"
            alt="The Fitness Gone Wild"
            style={{
              height: '85px',
              width: '130px',
            }}
          />
        </a>

        <button
          className="mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>

        <div
          className={`nav-links ${open ? 'open' : ''
            }`}
          style={{
            fontSize: '1.3rem',
            fontWeight: 'bold',
          }}
        >
          <a
          href="/#top"
          onClick={(event) => go(event, 'top')}
        >
            Home
          </a>

          <a
          href="/#trips"
          onClick={(event) => go(event, 'trips')}
        >
            Treks
          </a>

          <a
          href="/#featured"
          onClick={(event) => go(event, 'featured')}
        >
            Trips
          </a>

          <a
          href="/#why"
          onClick={(event) => go(event, 'why')}
        >
            Why us
          </a>

          <a
          href="/#reviews"
          onClick={(event) => go(event, 'reviews')}
        >
            Reviews
          </a>

          <a
          href="/#faq"
          onClick={(event) => go(event, 'faq')}
        >
            FAQ
          </a>

          <a
            className="btn btn-sm"
          href="/#contact"
          onClick={(event) => go(event, 'contact')}
        >
            Talk to us
          </a>
        </div>
      </nav>
    </header>
  );
}