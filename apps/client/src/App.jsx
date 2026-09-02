import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Home from './pages/Home';
import PaymentOptions from './pages/PaymentOptions';
import PaymentResult from './pages/PaymentResult';
import Placeholder from './pages/Placeholder';

import './styles/global.css';

function FloatingSocialDock() {
  return (
    <div className="floating-socials" aria-label="Social media links">
      <a
        className="floating-social-link"
        href="https://wa.me/918762350551"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.05 4.95A9.9 9.9 0 0 0 12.02 2a9.91 9.91 0 0 0-8.48 15.06L2 22l5.13-1.35a9.9 9.9 0 0 0 4.89 1.35h.01a9.9 9.9 0 0 0 6.99-3.02 9.9 9.9 0 0 0 2.07-7.03Zm-7.03 15.3a8.18 8.18 0 0 1-4.18-1.14l-.3-.18-3.04.8.81-2.96-.2-.3A8.2 8.2 0 1 1 12.02 20.25Zm4.49-6.12c-.25-.12-1.48-.73-1.71-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81 1-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.24-.74-.66-1.24-1.48-1.38-1.73-.15-.25-.02-.38.11-.5.11-.11.25-.3.37-.45.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.57-1.37-.78-1.88-.21-.5-.42-.43-.57-.44h-.48c-.17 0-.43.06-.66.31-.23.25-.88.86-.88 2.09 0 1.23.9 2.42 1.03 2.59.13.17 1.76 2.68 4.26 3.76.6.26 1.07.42 1.44.54.6.19 1.15.16 1.58.1.48-.07 1.48-.6 1.69-1.18.21-.58.21-1.08.15-1.18-.07-.1-.22-.17-.46-.29Z"/>
        </svg>
      </a>

      <a
        className="floating-social-link"
        href="https://instagram.com/thefitnessgonewild"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.25-3.25a1.25 1.25 0 1 1-1.25 1.25 1.25 1.25 0 0 1 1.25-1.25Z"/>
        </svg>
      </a>

      <a
        className="floating-social-link"
        href="tel:+918762350551"
        aria-label="Call us"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.62 10.79a15.72 15.72 0 0 0 6.59 6.59l2.2-2.2a1.12 1.12 0 0 1 1.15-.27c1.26.42 2.62.64 4.01.64a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.39.22 2.75.64 4.01a1.12 1.12 0 0 1-.27 1.15l-2.25 2.23Z"/>
        </svg>
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FloatingSocialDock />
      <Routes>

        {/* Client website */}
        <Route path="/" element={<Home />} />

        <Route
          path="/treks"
          element={<Placeholder title="Treks" />}
        />

        <Route
          path="/about"
          element={<Placeholder title="About Us" />}
        />

        <Route
          path="/reviews"
          element={<Placeholder title="Reviews" />}
        />

        <Route
          path="/faq"
          element={<Placeholder title="FAQ" />}
        />

        <Route
          path="/contact"
          element={<Placeholder title="Contact" />}
        />

        <Route
          path="/payment"
          element={<PaymentOptions />}
        />

        <Route
          path="/payment-result"
          element={<PaymentResult />}
        />

      </Routes>
    </BrowserRouter>
  );
}
