import { useEffect, useMemo, useState } from 'react';

import { api, useApi } from '../api';
import { useToast } from './ui';

const ROLE_INFO = {
  admin: { name: 'Admin', note: 'Every screen, always' },
  sales: { name: 'Sales Team', note: 'Leads and bookings' },
  operations: { name: 'Operations Team', note: 'Trips and coordination' },
};

// Same icons as the side menu
const ICONS = {
  dashboard: '▦', packages: '▣', bookings: '▤', coordination: '⌖', customers: '♙',
  enquiries: '✉', payments: '₹', reviews: '★', reports: '▥', guides: '⛰',
  'pickup-points': '⚑', regions: '◎', hero: '▭', activity: '☰', users: '♟', settings: '☷',
};

/**
 * Users & Roles → Role permissions: switch which screens each role can open.
 * Admin is always on (admins keep every screen). The server checks the same
 * list, so a screen that is off is blocked, not only hidden from the menu.
 */
export default function RolePermissions() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/role-permissions');
  const [grants, setGrants] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setGrants(data.grants);
  }, [data]);

  const groups = useMemo(() => {
    const list = [];
    for (const screen of data?.screens || []) {
      const group = list.find((g) => g.name === screen.group);
      if (group) group.screens.push(screen);
      else list.push({ name: screen.group || 'Screens', screens: [screen] });
    }
    return list;
  }, [data]);

  if (error) return <div className="error-box">{error}</div>;
  if (loading && !data) return <div className="loading">Loading…</div>;
  if (!data) return null;

  const saved = (module, role) => role === 'admin' || (data.grants[module] || []).includes(role);
  const has = (module, role) => role === 'admin' || (grants[module] || []).includes(role);
  const isChanged = (module, role) => has(module, role) !== saved(module, role);
  const changes = data.screens.reduce((n, s) => n + data.editableRoles.filter((r) => isChanged(s.module, r)).length, 0);
  const countFor = (role) => data.screens.filter((s) => has(s.module, role)).length;

  const setCell = (module, role, on) => setGrants((g) => {
    const list = (g[module] || []).filter((r) => r !== role);
    return { ...g, [module]: on ? [...list, role] : list };
  });
  const setColumn = (role, on) => setGrants((g) => Object.fromEntries(
    data.screens.map((s) => {
      const list = (g[s.module] || []).filter((r) => r !== role);
      return [s.module, on ? [...list, role] : list];
    })
  ));

  const save = async () => {
    setSaving(true);
    try {
      await api('/role-permissions', { method: 'PUT', body: { grants } });
      toast('Saved. People see the change the next time they open or reload the admin.');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card perms">
      <header className="perms-head">
        <div>
          <h2>Role permissions</h2>
          <p>Turn screens on or off for each role. The menu and the server both follow this list.</p>
        </div>
        <div className="perms-actions">
          {changes > 0 && <span className="perms-unsaved">{changes} unsaved change{changes === 1 ? '' : 's'}</span>}
          {changes > 0 && (
            <button className="btn alt" onClick={() => setGrants(data.grants)} disabled={saving}>Undo</button>
          )}
          <button className="btn" onClick={save} disabled={!changes || saving}>
            {saving ? 'Saving…' : 'Save permissions'}
          </button>
        </div>
      </header>

      <div className="perms-scroll">
        <table className="perms-table">
          <thead>
            <tr>
              <th className="perms-screen-col">Screen</th>
              {data.roles.map((role) => (
                <th key={role} className={`perms-role role-${role}`}>
                  <span className="perms-role-name">{ROLE_INFO[role]?.name || role}</span>
                  <span className="perms-role-note">{ROLE_INFO[role]?.note}</span>
                  <span className="perms-count">
                    <b>{countFor(role)}</b> / {data.screens.length} screens
                  </span>
                  {role !== 'admin' && (
                    <span className="perms-bulk">
                      <button type="button" onClick={() => setColumn(role, true)} disabled={saving}>All</button>
                      <span aria-hidden="true">·</span>
                      <button type="button" onClick={() => setColumn(role, false)} disabled={saving}>None</button>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map((group) => (
            <tbody key={group.name}>
              <tr className="perms-group">
                <td colSpan={data.roles.length + 1}>{group.name}</td>
              </tr>
              {group.screens.map((screen) => (
                <tr key={screen.module}>
                  <td className="perms-screen">
                    <span className="perms-icon" aria-hidden="true">{ICONS[screen.module] || '•'}</span>
                    {screen.label}
                  </td>
                  {data.roles.map((role) => (
                    <td key={role} className={`perms-cell ${isChanged(screen.module, role) ? 'changed' : ''}`}>
                      {role === 'admin' ? (
                        <span className="perms-always" title="Admins always see every screen">🔒 Always</span>
                      ) : (
                        <label className="switch" title={`${ROLE_INFO[role]?.name || role}: ${screen.label}`}>
                          <input
                            type="checkbox"
                            checked={has(screen.module, role)}
                            disabled={saving}
                            onChange={(e) => setCell(screen.module, role, e.target.checked)}
                            aria-label={`${ROLE_INFO[role]?.name || role} can see ${screen.label}`}
                          />
                          <span className="switch-track"><span className="switch-thumb" /></span>
                        </label>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
