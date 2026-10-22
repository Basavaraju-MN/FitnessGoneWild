import { useAdmin } from '../context';
import MasterTable, { activeField } from '../components/MasterTable';
import { PageHead } from '../components/ui';

/**
 * Regions & Cities: what the website's "Select region" and "Departing from"
 * dropdowns offer. A trek's region is set in its trek form; a trek leaves
 * from every city it has pickup points in (city set on each pickup point).
 */
export default function Regions() {
  const { lookups } = useAdmin();
  const categories = lookups?.categories || [];
  const categoryName = (id) => categories.find((c) => String(c.id) === String(id))?.name;

  return (
    <>
      <PageHead
        title="Regions & Cities"
        subtitle="The website's “Select region” and “Departing from” dropdowns."
      />

      <MasterTable
        type="regions"
        title="Regions"
        singular="Region"
        note="Each trek belongs to one region (set in the trek form). A region can show only some category tabs."
        fields={[
          { name: 'name', label: 'Name', required: true, placeholder: 'North India' },
          { name: 'tagline', label: 'Short line', placeholder: 'Himalayan treks, valleys and snow peaks' },
          { name: 'sort_order', label: 'Order', type: 'number', min: 0 },
          activeField,
          {
            name: 'category_ids',
            label: 'Category tabs shown for this region',
            type: 'checklist',
            full: true,
            options: categories.map((c) => ({ value: c.id, label: c.name })),
            hint: 'None ticked = every category tab is shown.',
          },
        ]}
        prepare={(values) => ({
          ...values,
          category_ids: (Array.isArray(values.category_ids) ? values.category_ids : String(values.category_ids || '').split(','))
            .map(Number).filter(Boolean),
        })}
        columns={[
          { key: 'sort_order', label: 'Order' },
          { key: 'name', label: 'Region', render: (r) => <b>{r.name}</b> },
          { key: 'tagline', label: 'Short line' },
          {
            key: 'category_ids',
            label: 'Tabs shown',
            sortable: false,
            csv: (r) => String(r.category_ids || '').split(',').filter(Boolean).map(categoryName).join(', ') || 'All',
            render: (r) => {
              const names = String(r.category_ids || '').split(',').filter(Boolean).map(categoryName).filter(Boolean);
              return names.length ? names.join(', ') : <span className="muted">All tabs</span>;
            },
          },
          { key: 'trek_count', label: 'Treks' },
        ]}
      />

      <MasterTable
        type="departure-cities"
        title="Departure cities"
        singular="City"
        note="A city shows as “Coming soon” on the website until a trek has a pickup point in it."
        fields={[
          { name: 'name', label: 'City', required: true, placeholder: 'Hyderabad' },
          { name: 'state', label: 'State', placeholder: 'Telangana' },
          { name: 'sort_order', label: 'Order', type: 'number', min: 0 },
          activeField,
        ]}
        columns={[
          { key: 'sort_order', label: 'Order' },
          { key: 'name', label: 'City', render: (r) => <b>{r.name}</b> },
          { key: 'state', label: 'State' },
          { key: 'trek_count', label: 'Treks leaving from it' },
        ]}
      />
    </>
  );
}
