import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, Handshake, LogOut, ChartColumn, History, Image as ImageIcon, Info, LayoutDashboard,
  Map as MapIcon, MapPin, MessagesSquare, Mountain, Settings as SettingsIcon,
  ShieldCheck, Star, Ticket, TicketPercent, UserRound, Users as UsersIcon, UsersRound, Wallet,
} from 'lucide-react';
import { LOGO_URL } from './assets';

import { api } from './api';
import { clearPhotoCache } from './imageCache';
import { pageFromLocation, pagePath } from './router';
import { AdminContext } from './context';
import { FormModal, useToast } from './components/ui';
import NotificationBell from './components/NotificationBell';
import ProfileMenu from './components/ProfileMenu';
import ThemeToggle from './components/ThemeToggle';
import { applyTheme, saveTheme, savedTheme } from './theme';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Packages from './pages/Packages';
import Brochures, { clearBrochureList } from './pages/Brochures';
import Coupons from './pages/Coupons';
import Bookings from './pages/Bookings';
import Coordination from './pages/Coordination';
import Customers from './pages/Customers';
import Enquiries from './pages/Enquiries';
import Payments from './pages/Payments';
import Reviews from './pages/Reviews';
import Activity from './pages/Activity';
import WebsiteHero from './pages/WebsiteHero';
import AboutPage from './pages/AboutPage';
import Reports from './pages/Reports';
import Guides from './pages/Guides';
import PickupPoints from './pages/PickupPoints';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Regions from './pages/Regions';
import B2BVendors from './pages/B2BVendors';
import { LeadBalances, LeadCustomers, LeadDashboard, LeadProfile, LeadTrips } from './pages/TrekLead';

// Sidebar sections, in menu order
const GROUPS = [
  'Overview',
  'Trip Management',
  'Bookings & Revenue',
  'Customer Management',
  'Marketing & Content',
  'Reports & Analytics',
  'System Settings',
];

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard, group: 'Overview' },
  { id: 'packages', label: 'Treks & Trips', icon: Mountain, component: Packages, group: 'Trip Management' },
  { id: 'coordination', label: 'Trip Coordination', icon: CalendarDays, component: Coordination, group: 'Trip Management' },
  { id: 'pickup-points', label: 'Pickup Points', icon: MapPin, component: PickupPoints, group: 'Trip Management' },
  { id: 'regions', label: 'Regions & Cities', icon: MapIcon, component: Regions, group: 'Trip Management' },
  { id: 'guides', label: 'Guides', icon: UsersRound, component: Guides, group: 'Trip Management' },
  { id: 'b2b', label: 'B2B Vendors', icon: Handshake, component: B2BVendors, group: 'Trip Management' },
  { id: 'bookings', label: 'Bookings', icon: Ticket, component: Bookings, group: 'Bookings & Revenue' },
  { id: 'payments', label: 'Payments', icon: Wallet, component: Payments, group: 'Bookings & Revenue' },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent, component: Coupons, group: 'Bookings & Revenue' },
  { id: 'customers', label: 'Customers', icon: UsersIcon, component: Customers, group: 'Customer Management' },
  { id: 'enquiries', label: 'Enquiries & Leads', icon: MessagesSquare, component: Enquiries, group: 'Customer Management' },
  { id: 'reviews', label: 'Reviews', icon: Star, component: Reviews, group: 'Customer Management' },
  { id: 'brochures', label: 'Brochures', icon: BookOpen, component: Brochures, group: 'Marketing & Content' },
  { id: 'hero', label: 'Website Hero', icon: ImageIcon, component: WebsiteHero, group: 'Marketing & Content' },
  { id: 'about', label: 'About Page', icon: Info, component: AboutPage, group: 'Marketing & Content' },
  { id: 'reports', label: 'Reports & Exports', icon: ChartColumn, component: Reports, group: 'Reports & Analytics' },
  { id: 'activity', label: 'Activity Log', icon: History, component: Activity, group: 'System Settings' },
  { id: 'users', label: 'Users & Roles', icon: ShieldCheck, component: Users, group: 'System Settings' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, component: Settings, group: 'System Settings' },
];

// Trek Lead accounts: their own menu (only their assigned trips)
const LEAD_GROUPS = ['My Work', 'Account'];
const LEAD_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: LeadDashboard, group: 'My Work' },
  { id: 'my-trips', label: 'My Assigned Trips', icon: CalendarDays, component: LeadTrips, group: 'My Work' },
  { id: 'my-customers', label: 'Customers', icon: UsersIcon, component: LeadCustomers, group: 'My Work' },
  { id: 'balances', label: 'Payment Balances', icon: Wallet, component: LeadBalances, group: 'My Work' },
  { id: 'profile', label: 'Profile', icon: UserRound, component: LeadProfile, group: 'Account' },
];

export default function App() {
  const toast = useToast();
  const [user, setUser] = useState(undefined); // undefined = checking session
  const [lookups, setLookups] = useState(null);
  const [page, setPage] = useState(pageFromLocation);
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [theme, setTheme] = useState(savedTheme);

  // Login page and portal follow the same switch
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const changeTheme = (next) => {
    setTheme(next);
    saveTheme(next);
  };

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

  // Browser back / forward
  useEffect(() => {
    const onPop = () => setPage(pageFromLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const reloadLookups = useCallback(async () => {
    try {
      const { data } = await api('/lookups');
      setLookups(data);
    } catch (error) {
      toast(error.message, 'error');
    }
  }, [toast]);

  const isLead = user?.role === 'trek_lead';

  // Dropdown lists for the admin screens (Trek Leads do not use them)
  useEffect(() => {
    if (user && !isLead) reloadLookups();
  }, [user, isLead, reloadLookups]);

  const go = useCallback((id) => {
    if (window.location.pathname !== pagePath(id)) window.history.pushState(null, '', pagePath(id));
    setPage(id);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  const allowedPages = useMemo(
    () => (user?.role === 'trek_lead' ? LEAD_PAGES : PAGES).filter((p) => user?.modules?.includes(p.id)),
    [user]
  );
  const groups = isLead ? LEAD_GROUPS : GROUPS;

  // Address bar shows the page actually on screen
  useEffect(() => {
    if (!user) return;
    const shown = allowedPages.find((p) => p.id === page) || allowedPages[0];
    if (shown && window.location.pathname !== pagePath(shown.id)) {
      window.history.replaceState(null, '', pagePath(shown.id) + window.location.search);
    }
  }, [user, page, allowedPages]);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    await clearPhotoCache();
    clearBrochureList();
    setUser(null);
    setLookups(null);
  };

  if (user === undefined) return <div className="loading">Loading…</div>;
  if (!user) return <Login onLogin={setUser} theme={theme} onThemeChange={changeTheme} />;

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
            <small>{isLead ? 'Trek Lead workspace' : 'Admin workspace'}</small>
          </div>

          <nav className="nav">
            {groups.map((group) => {
              const items = allowedPages.filter((p) => p.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="navgroup">
                  <div className="navlabel">{group}</div>
                  {items.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={p.id === current?.id ? 'active' : ''}
                        onClick={() => go(p.id)}
                      >
                        <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {isLead && (
              <div className="navgroup">
                <button type="button" onClick={logout}>
                  <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </nav>
        </aside>

        <main className="main">
          <header className="top">
            <button type="button" className="btn alt mobile" onClick={() => setMenuOpen((v) => !v)}>☰</button>
            <div className="top-title">{current?.label}</div>
            <div className="top-user">
              <ThemeToggle theme={theme} onChange={changeTheme} />
              {!isLead && <NotificationBell />}
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
