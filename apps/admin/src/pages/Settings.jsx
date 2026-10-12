import { useEffect, useState } from 'react';

import { api, useApi } from '../api';
import { PageHead, useToast } from '../components/ui';

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi('/settings');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setValues(Object.fromEntries(data.map((s) => [s.setting_key, s.setting_value])));
    }
  }, [data]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api('/settings', { method: 'PUT', body: { settings: values } });
      toast('Settings saved');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Settings" subtitle="Business details stored in the settings table." />

      {error && <div className="error-box">{error}</div>}
      {loading && !data && <div className="loading">Loading…</div>}

      {data && (
        <div className="card">
          <div className="cardhead"><h2>General Settings</h2></div>
          <form className="form" onSubmit={save}>
            {data.length === 0 && <p className="muted full">No settings yet. Run admin_portal.sql to add the defaults.</p>}
            {data.map((setting) => (
              <div className="field" key={setting.setting_key}>
                <label htmlFor={setting.setting_key}>{setting.label}</label>
                <input
                  id={setting.setting_key}
                  value={values[setting.setting_key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [setting.setting_key]: e.target.value }))}
                />
                <small>{setting.setting_key}</small>
              </div>
            ))}
            <div className="notice warn full">
              These values are stored for reference. The website still uses its own built-in prices, GST and contact details.
            </div>
            <div className="full">
              <button className="btn" disabled={saving || !data.length}>{saving ? 'Saving…' : 'Save Settings'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
