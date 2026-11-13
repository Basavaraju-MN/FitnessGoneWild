import { date } from '../format';
import MasterTable, { activeField } from '../components/MasterTable';
import { PageHead, Pill } from '../components/ui';

// A guide with a username and password can log in: they then see only the
// trips they are a guide on (Trip Coordination), with those trips'
// customers and balances, read-only. The login is set in the same form.
export default function Guides() {
  return (
    <>
      <PageHead
        title="Guides"
        subtitle="Trek leaders you assign to trips in Trip Coordination. Give a username and password and the guide can log in to see their own trips, customers and balances."
      />

      <MasterTable
        type="guides"
        title="Guides"
        singular="Guide"
        // A new guide's login is on as soon as a username is given
        addInitial={{ is_active: 1, login_active: 1 }}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'phone', label: 'Phone' },
          { name: 'email', label: 'Email', type: 'email', hint: 'Needed for the login' },
          activeField,
          { name: 'notes', label: 'Notes', type: 'textarea', full: true },
          {
            name: 'login_info', type: 'info', label: 'Login (optional)', full: true,
            text: 'With a username and password the guide can log in and see only their own trips: customers, contact numbers, bookings and balances. Read-only. Leave empty for no login.',
          },
          { name: 'login_username', label: 'Username', placeholder: 'e.g. ravi.guide', hint: 'They log in with this or their email' },
          {
            name: 'login_password', label: 'Password', type: 'password',
            hint: (values) => (values.login_username ? 'At least 8 characters. When editing, leave empty to keep the current password.' : ''),
          },
          {
            name: 'login_active', label: 'Can log in', type: 'checkbox', full: true,
            hidden: (values) => !values.login_username,
            hint: 'Untick to stop this guide logging in (the guide stays in your list).',
          },
        ]}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          {
            key: 'login_username', label: 'Login',
            render: (r) => (r.login_username ? (
              <span>
                <b>{r.login_username}</b>{' '}
                <Pill value={Number(r.login_active) ? 'active' : 'inactive'} />
                <div className="muted">{r.last_login_at ? `Last login ${date(r.last_login_at)}` : 'Never logged in'}</div>
              </span>
            ) : <span className="muted">No login</span>),
            csv: (r) => r.login_username || '',
          },
          { key: 'notes', label: 'Notes' },
        ]}
      />
    </>
  );
}
