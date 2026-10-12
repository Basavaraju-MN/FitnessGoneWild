import { useCallback, useEffect, useMemo, useState } from 'react';
import { LOGO_URL } from './assets';

import { api } from './api';
import { AdminContext } from './context';
import { FormModal, useToast } from './components/ui';
import NotificationBell from './components/NotificationBell';
import ProfileMenu from './components/ProfileMenu';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Packages from './pages/Packages';
import Bookings from './pages/Bookings';
import Coordination from './pages/Coordination';
import Customers from './pages/Customers';
import Enquiries from './pages/Enquiries';
import Brochures from './pages/Brochures';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Masters from './pages/Masters';
import Users from './pages/Users';
import Settings from './pages/Settings';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', component: Dashboard },
  { id: 'packages', label: 'Packages & Trips', icon: '▣', component: Packages },
  { id: 'bookings', label: 'Bookings', icon: '▤', component: Bookings },
  { id: 'coordination', label: 'Trip Coordination', icon: '⌖', component: Coordination },
  { id: 'customers', label: 'Customers', icon: '♙', component: Customers },
  { id: 'enquiries', label: 'Enquiries & Leads', icon: '✉', component: Enquiries },
  { id: 'brochures', label: 'Brochure Downloads', icon: '↓', component: Brochures },
  { id: 'payments', label: 'Payments', icon: '₹', component: Payments },
  { id: 'reports', label: 'Reports & Exports', icon: '▥', component: Reports, group: 'MANAGEMENT' },
  { id: 'masters', label: 'Master Data', icon: '⚙', component: Masters, group: 'MANAGEMENT' },
  { id: 'users', label: 'Users & Roles', icon: '♟', component: Users, group: 'MANAGEMENT' },
  { id: 'settings', label: 'Settings', icon: '☷', component: Settings, group: 'MANAGEMENT' },
];

const pageFromHash = () => window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';

export default function App() {
  const toast = useToast();
  const [user, setUser] = useState(undefined); // undefined = checking session
  const [lookups, setLookups] = useState(null);
  const [page, setPage] = useState(pageFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Restore the session
  useEffect(() => {
    api('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // Any 401 (session expired) returns to the login screen
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('admin:unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const reloadLookups = useCallback(async () => {
    try {
      const { data } = await api('/lookups');
      setLookups(data);
    } catch (error) {
      toast(error.message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    if (user) reloadLookups();
  }, [user, reloadLookups]);

  const go = useCallback((id) => {
    window.location.hash = `/${id}`;
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const allowedPages = useMemo(
    () => PAGES.filter((p) => user?.modules?.includes(p.id)),
    [user]
  );

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setLookups(null);
  };

  if (user === undefined) return <div className="loading">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;

  const current = allowedPages.find((p) => p.id === page) || allowedPages[0];
  const PageComponent = current?.component;

  return (
    <AdminContext.Provider value={{ user, lookups, reloadLookups, go }}>
      <div className="app">
        <aside className={`side ${menuOpen ? 'open' : ''}`}>
          <div className="brand">
            <span className="brand-logo">
              <img src={LOGO_URL} alt="The Fitness Gone Wild" />
            </span>
            <small>Admin workspace</small>
          </div>

          <nav className="nav">
            {['WORKSPACE', 'MANAGEMENT'].map((group) => {
              const items = allowedPages.filter((p) => (p.group || 'WORKSPACE') === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <div className="navlabel">{group}</div>
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={p.id === current?.id ? 'active' : ''}
                      onClick={() => go(p.id)}
                    >
                      {p.icon} &nbsp; {p.label}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="main">
          <header className="top">
            <button type="button" className="btn alt mobile" onClick={() => setMenuOpen((v) => !v)}>☰</button>
            <div className="top-title">{current?.label}</div>
            <div className="top-user">
              <NotificationBell />
              <ProfileMenu
                user={user}
                onChangePassword={() => setChangingPassword(true)}
                onLogout={logout}
              />
            </div>
          </header>

          <div className="content">
            {PageComponent ? (
              <PageComponent key={current.id} />
            ) : (
              <div className="empty">Your role has no sections assigned.</div>
            )}
          </div>
        </main>
      </div>

      {changingPassword && (
        <FormModal
          title="Change password"
          submitLabel="Change password"
          fields={[
            { name: 'currentPassword', label: 'Current password', type: 'password', required: true, full: true },
            { name: 'newPassword', label: 'New password', type: 'password', required: true, full: true, hint: 'At least 8 characters' },
          ]}
          onClose={() => setChangingPassword(false)}
          onSubmit={async (values) => {
            await api('/auth/change-password', { method: 'POST', body: values });
            setChangingPassword(false);
            toast('Password changed');
          }}
        />
      )}
    </AdminContext.Provider>
  );
}
