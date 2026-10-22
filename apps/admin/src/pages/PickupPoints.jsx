import { useAdmin } from '../context';
import MasterTable, { activeField } from '../components/MasterTable';
import { PageHead } from '../components/ui';

export default function PickupPoints() {
  const { lookups } = useAdmin();

  return (
    <>
      <PageHead title="Pickup Points" subtitle="Shown in the website booking form for each trip." />

      <MasterTable
        type="pickup-points"
        title="Pickup points"
        singular="Pickup point"
        fields={[
          { name: 'trip_id', label: 'Trip', type: 'select', required: true, full: true, options: (lookups?.trips || []).map((t) => ({ value: t.id, label: t.name })) },
          { name: 'city_id', label: 'Departure city', type: 'select', required: true, options: (lookups?.departureCities || []).map((c) => ({ value: c.id, label: c.name })), hint: 'The trek shows as leaving from this city on the website' },
          { name: 'name', label: 'Name', required: true, placeholder: 'Indiranagar', hint: 'Saved with the booking and shown on the receipt' },
          { name: 'address', label: 'Landmark / address', placeholder: 'Karachi Bakery, Indiranagar' },
          { name: 'map_url', label: 'Google Maps link' },
          { name: 'sort_order', label: 'Order', type: 'number', min: 0 },
          activeField,
        ]}
        columns={[
          { key: 'trip_name', label: 'Trip' },
          { key: 'city_name', label: 'City', render: (r) => r.city_name || <span className="muted">—</span> },
          { key: 'sort_order', label: 'Order' },
          { key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> },
          { key: 'address', label: 'Landmark / address' },
        ]}
      />
    </>
  );
}
