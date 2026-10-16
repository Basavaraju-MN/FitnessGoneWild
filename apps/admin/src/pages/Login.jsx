import { useEffect, useState } from 'react';
import { api } from '../api';
import { PasswordInput } from '../components/ui';
import { LOGO_URL } from '../assets';
import ThemeToggle from '../components/ThemeToggle';

// Photos in apps/admin/public/login, with the line shown on each
const SLIDES = [
  { image: 'login/kudremukh.jpg', text: 'Every trek, booking and traveller in one place.' },
  { image: 'login/netravati.jpg', text: 'Plan the trips. Track every rupee.' },
  { image: 'login/gokarna.jpg', text: 'Keep every group moving, from enquiry to summit.' },
];
const imageUrl = (file) => `${import.meta.env.BASE_URL}${file}`;

const UserIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);

export default function Login({ onLogin, theme, onThemeChange }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  // Photos change every 6 seconds
  useEffect(() => {
    const timer = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-theme">
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>

      <div className="login-frame">
        {/* Photo side */}
        <section className="login-hero" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <div
              key={s.image}
              className={`login-hero-photo ${i === slide ? 'on' : ''}`}
              style={{ backgroundImage: `url(${imageUrl(s.image)})` }}
            />
          ))}
          <div className="login-hero-shade" />

          <div className="login-hero-text">
            <h2 key={slide}>{SLIDES[slide].text}</h2>
            <div className="login-dashes">
              {SLIDES.map((s, i) => (
                <button
                  key={s.image}
                  type="button"
                  tabIndex={-1}
                  className={i === slide ? 'on' : ''}
                  onClick={() => setSlide(i)}
                />
              ))}
            </div>
          </div>

          <div className="login-hero-foot">
            <b>Need help? <span>→</span></b>
            <a href="tel:+918762350551"><PhoneIcon /> +91 87623 50551</a>
            <a href="mailto:gonewildfitness@gmail.com"><MailIcon /> gonewildfitness@gmail.com</a>
          </div>
        </section>

        {/* Form card, overlapping the photo */}
        <form className="login-card" onSubmit={submit}>
          <img className="login-logo" src={LOGO_URL} alt="The Fitness Gone Wild" />

          <h1><b>ADMIN</b> PORTAL</h1>
          <p className="login-intro">Sign in to manage treks, bookings, customers and payments.</p>

          <div className="login-field">
            <label htmlFor="username">Username or email</label>
            <div className="login-input">
              <UserIcon />
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-input">
              <LockIcon />
              <PasswordInput
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn login-submit" disabled={loading}>{loading ? 'Signing in…' : 'Login'}</button>

          <p className="login-help">Forgot password? <b>Ask your admin to reset it</b></p>

        </form>
      </div>

      <footer className="login-legal">
        © {new Date().getFullYear()} The Fitness Gone Wild. All rights reserved.
      </footer>
    </div>
  );
}
