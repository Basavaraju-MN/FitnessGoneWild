import { useState } from 'react';
import { api } from '../api';
import { PasswordInput } from '../components/ui';
import { LOGO_URL } from '../assets';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo-box">
          <img className="login-logo" src={LOGO_URL} alt="The Fitness Gone Wild" />
        </div>
        <h1>Admin Portal</h1>
        <p>Sign in to continue</p>

        <div className="field">
          <label htmlFor="username">Username or email</label>
          <input
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error-box">{error}</div>}

        <button className="btn" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
