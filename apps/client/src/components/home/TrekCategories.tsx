import { useMemo, useState } from 'react';
import { categories, treks } from '../../data/treks';
import type { TrekCategory } from '../../types/trek';
import SectionHeader from '../common/SectionHeader';
import TrekCard from './TrekCard';

export default function TrekCategories() {
  const [active, setActive] = useState<TrekCategory>('weekend');
  const filtered = useMemo(() => treks.filter(t => t.category === active), [active]);

  return (
    <section className="section" id="trips">
      <SectionHeader eyebrow="Pick your weekend" title="Upcoming departures" description="Every trip below has confirmed dates, transport from Bangalore and a leader assigned." />
      <div className="tabs">
        {categories.map(category => {
          const count = treks.filter(t => t.category === category.id).length;
          return (
            <button key={category.id} className={active === category.id ? 'tab active' : 'tab'} onClick={() => setActive(category.id)}>
              {category.label}<em>{count}</em>
            </button>
          );
        })}
      </div>
      <div className="content-grid">
        {filtered.map(trek => <TrekCard key={trek.id} trek={trek} />)}
      </div>
    </section>
  );
}
