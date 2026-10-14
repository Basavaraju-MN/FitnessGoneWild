import { useState } from 'react';

import { api, useApi } from '../api';
import { useAdmin } from '../context';
import DataTable from './DataTable';
import { FormModal, Pill, useToast } from './ui';

export const activeField = { name: 'is_active', label: 'Active', type: 'checkbox' };

/**
 * List + add/edit for one reusable record type (guides, pickup points,
 * categories), stored through /masters/:type.
 * prepare(values) can fill in values before saving (e.g. a slug).
 */
export default function MasterTable({ type, title, note, singular, fields, columns, prepare, exportName }) {
  const toast = useToast();
  const { reloadLookups } = useAdmin();
  const { data, loading, error, reload } = useApi(`/masters/${type}`);
  const [editing, setEditing] = useState(null);

  const save = async (values) => {
    const body = prepare ? prepare(values) : values;
    if (editing.id) {
      await api(`/masters/${type}/${editing.id}`, { method: 'PUT', body });
      toast(`${singular} updated`);
    } else {
      await api(`/masters/${type}`, { method: 'POST', body });
      toast(`${singular} added`);
    }
    setEditing(null);
    reload();
    reloadLookups();
  };

  return (
    <>
      <DataTable
        title={title}
        subtitle={note}
        rows={data}
        loading={loading}
        error={error}
        exportName={exportName || `fgw-${type}.csv`}
        searchPlaceholder={`Search ${title.toLowerCase()}…`}
        actions={<button className="btn" onClick={() => setEditing({ is_active: 1 })}>＋ Add {singular.toLowerCase()}</button>}
        columns={[
          ...columns,
          { key: 'is_active', label: 'Status', render: (r) => <Pill value={Number(r.is_active) ? 'active' : 'inactive'} />, csv: (r) => (Number(r.is_active) ? 'Active' : 'Inactive') },
          { key: 'actions', label: '', sortable: false, export: false, render: (r) => <button className="link" onClick={() => setEditing(r)}>Edit</button> },
        ]}
      />

      {editing && (
        <FormModal
          title={`${editing.id ? 'Edit' : 'Add'} ${singular.toLowerCase()}`}
          fields={fields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={save}
        />
      )}
    </>
  );
}
