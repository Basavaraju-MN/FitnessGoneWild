import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

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
          href="#top"
          onClick={close}
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
          <a href="#top" onClick={close}>
            Home
          </a>

          <a href="#trips" onClick={close}>
            Treks
          </a>

          <a href="#featured" onClick={close}>
            Trips
          </a>

          <a href="#why" onClick={close}>
            Why us
          </a>

          <a href="#reviews" onClick={close}>
            Reviews
          </a>

          <a href="#faq" onClick={close}>
            FAQ
          </a>

          <a
            className="btn btn-sm"
            href="#contact"
            onClick={close}
          >
            Talk to us
          </a>
        </div>
      </nav>
    </header>
  );
}