import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import { dateTime } from '../format';
import DataTable from '../components/DataTable';
import { FormModal, PageHead, Pill, useToast } from '../components/ui';
import RolePermissions from '../components/RolePermissions';

// What each role can see is set below, in Role permissions
const ROLES = [
  { value: 'admin', label: 'Admin — every screen' },
  { value: 'sales', label: 'Sales Team' },
  { value: 'operations', label: 'Operations Team' },
];
const roleName = (role) => ({ admin: 'Admin', sales: 'Sales Team', operations: 'Operations Team' }[role] || role);

export default function Users() {
  const toast = useToast();
  const { user: me, reloadLookups } = useAdmin();
  const { data, loading, error, reload } = useApi('/users');
  const [form, setForm] = useState(null); // 'new' | user (edit) | { reset: user }

  const done = (message) => {
    toast(message);
    setForm(null);
    reload();
    reloadLookups();
  };

  return (
    <>
      <PageHead title="Users & Roles" subtitle="Who can sign in to the admin, and what each person can see.">
        <button className="btn" onClick={() => setForm('new')}>＋ Add User</button>
      </PageHead>

      <DataTable
        title="Admin users"
        rows={data}
        loading={loading}
        error={error}
        searchPlaceholder="Search users…"
        initialSort={{ key: 'full_name', dir: 'asc' }}
        columns={[
          { key: 'full_name', label: 'User', render: (r) => <><b>{r.full_name}</b>{r.id === me.id ? <span className="muted"> (you)</span> : null}</> },
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (r) => roleName(r.role) },
          { key: 'last_login_at', label: 'Last login', render: (r) => dateTime(r.last_login_at) },
          { key: 'is_active', label: 'Status', render: (r) => <Pill value={Number(r.is_active) ? 'active' : 'inactive'} /> },
          {
            key: 'actions', label: '', sortable: false,
            render: (r) => (
              <>
                <button className="link" onClick={() => setForm(r)}>Edit</button>
                <button className="link" onClick={() => setForm({ reset: r })}>Reset password</button>
              </>
            ),
          },
        ]}
      />

      <RolePermissions />

      {form === 'new' && (
        <FormModal
          title="Add User"
          initial={{ role: 'sales' }}
          fields={[
            { name: 'full_name', label: 'Full name', required: true },
            { name: 'username', label: 'Username', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'role', label: 'Role', type: 'select', required: true, options: ROLES },
            { name: 'password', label: 'Password', type: 'password', required: true, full: true, hint: 'At least 8 characters. Share it with the person privately.' },
          ]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api('/users', { method: 'POST', body: values });
            done('User added');
          }}
        />
      )}

      {form && form !== 'new' && !form.reset && (
        <FormModal
          title={`Edit ${form.full_name}`}
          initial={form}
          fields={[
            { name: 'full_name', label: 'Full name', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'role', label: 'Role', type: 'select', required: true, options: ROLES, full: true },
            { name: 'is_active', label: 'Active (can sign in)', type: 'checkbox' },
          ]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api(`/users/${form.id}`, {
              method: 'PUT',
              body: { full_name: values.full_name, email: values.email, role: values.role, is_active: values.is_active },
            });
            done('User updated');
          }}
        />
      )}

      {form?.reset && (
        <FormModal
          title={`Reset password · ${form.reset.full_name}`}
          submitLabel="Reset password"
          fields={[{ name: 'password', label: 'New password', type: 'password', required: true, full: true, hint: 'At least 8 characters' }]}
          onClose={() => setForm(null)}
          onSubmit={async (values) => {
            await api(`/users/${form.reset.id}/reset-password`, { method: 'POST', body: values });
            done('Password reset');
          }}
        />
      )}
    </>
  );
}
