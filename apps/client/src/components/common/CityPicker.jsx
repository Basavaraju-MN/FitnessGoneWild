import { MapPin, Mountain } from 'lucide-react';
import FilterPicker from './FilterPicker';
import { usePlaces } from '../../context/PlacesContext';

const treksNote = (n) => `${n} trek${n === 1 ? '' : 's'}`;

// "Departing from" dropdown: cities without treks show as coming soon
export default function CityPicker() {
  const { cities, city, setCityId, countTreks } = usePlaces();
  if (cities.length === 0) return null;

  const options = cities.map((c) => {
    const n = countTreks((t) => (t.city_ids || []).includes(c.id), { ignoreCity: true, ignoreRegion: true });
    return {
      id: c.id,
      name: c.name,
      note: `${c.state ? `${c.state} · ` : ''}${n ? treksNote(n) : 'Coming soon'}`,
      disabled: n === 0,
    };
  });

  return (
    <FilterPicker
      className="picker-city"
      icon={MapPin}
      label="Departing from"
      allLabel="All cities"
      allNote="Every departure"
      options={options}
      value={city?.id ?? null}
      onChange={setCityId}
    />
  );
}

// "Select region" dropdown: a region without treks still opens, to show
// its coming-soon message
export function RegionPicker() {
  const { regions, region, setRegionId, countTreks, regionOf } = usePlaces();
  if (regions.length === 0) return null;

  const options = regions.map((r) => {
    const n = countTreks((t) => regionOf(t) === r.id, { ignoreRegion: true });
    return { id: r.id, name: r.name, note: n ? treksNote(n) : 'Coming soon' };
  });

  return (
    <FilterPicker
      className="picker-region"
      icon={Mountain}
      label="Select region"
      allLabel="All regions"
      allNote="South and North India"
      options={options}
      value={region?.id ?? null}
      onChange={setRegionId}
    />
  );
}
