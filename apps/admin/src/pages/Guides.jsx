import MasterTable, { activeField } from '../components/MasterTable';
import { PageHead } from '../components/ui';

export default function Guides() {
  return (
    <>
      <PageHead title="Guides" subtitle="Trek leaders you assign to trips in Trip Coordination." />

      <MasterTable
        type="guides"
        title="Guides"
        singular="Guide"
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'phone', label: 'Phone' },
          { name: 'email', label: 'Email', type: 'email' },
          activeField,
          { name: 'notes', label: 'Notes', type: 'textarea', full: true },
        ]}
        columns={[
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'notes', label: 'Notes' },
        ]}
      />
    </>
  );
}
