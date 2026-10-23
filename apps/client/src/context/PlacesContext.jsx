import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSiteFilters } from '../api/treks';

// Where the visitor is leaving from (remembered on this device) and which
// region they are looking at. Shared by the header picker, the region tiles,
// the trek list and the booking form.
const CITY_KEY = 'fgw_departure_city';

const readCity = () => {
  try {
    return Number(localStorage.getItem(CITY_KEY)) || null;
  } catch {
    return null;
  }
};

const saveCity = (id) => {
  try {
    if (id) localStorage.setItem(CITY_KEY, String(id));
    else localStorage.removeItem(CITY_KEY);
  } catch {
    // Private mode: the choice lasts for this visit only
  }
};

// A trek's region id and city ids, from either a trek row or a filters row
const regionOf = (trek) => trek?.region_id ?? trek?.region?.id ?? null;
const citiesOf = (trek) => trek?.city_ids ?? (trek?.departure_cities || []).map((city) => city.id);

const PlacesContext = createContext(null);

export function PlacesProvider({ children }) {
  const [filters, setFilters] = useState({ regions: [], cities: [], treks: [] });
  const [loaded, setLoaded] = useState(false);
  const [cityId, setCityIdState] = useState(readCity);
  const [regionId, setRegionId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getSiteFilters({ signal: controller.signal })
      .then((data) => setFilters(data))
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  const setCityId = useCallback((id) => {
    setCityIdState(id || null);
    saveCity(id || null);
  }, []);

  // A remembered city or region that no longer exists is ignored
  const city = filters.cities.find((c) => c.id === cityId) || null;
  const region = filters.regions.find((r) => r.id === regionId) || null;

  /** Does the trek leave from the chosen city (and sit in the chosen region)? */
  const matches = useCallback((trek, { ignoreRegion = false, ignoreCity = false } = {}) => {
    const cityIds = citiesOf(trek);
    if (!ignoreCity && city && cityIds.length > 0 && !cityIds.includes(city.id)) return false;
    if (!ignoreRegion && region && regionOf(trek) !== region.id) return false;
    return true;
  }, [city, region]);

  /** How many treks pass the filters (plus an optional extra check) */
  const countTreks = useCallback(
    (extra = () => true, options) => filters.treks.filter((t) => matches(t, options) && extra(t)).length,
    [filters.treks, matches]
  );

  const value = useMemo(() => ({
    loaded,
    regions: filters.regions,
    cities: filters.cities,
    hasPlaces: filters.regions.length > 0 || filters.cities.length > 0,
    city,
    region,
    setCityId,
    setRegionId,
    matches,
    countTreks,
    regionOf,
  }), [loaded, filters, city, region, setCityId, matches, countTreks]);

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

// Outside the provider (or before the filters load) everything matches
const fallback = {
  loaded: false,
  regions: [],
  cities: [],
  hasPlaces: false,
  city: null,
  region: null,
  setCityId: () => {},
  setRegionId: () => {},
  matches: () => true,
  countTreks: () => 0,
  regionOf,
};

export const usePlaces = () => useContext(PlacesContext) || fallback;

/** "Bangalore", "Bangalore +2" — the chosen city first when the trek leaves from it */
export function fromLabel(trek, city) {
  const list = trek?.departure_cities || [];
  if (list.length === 0) return '';
  const first = (city && list.find((c) => c.id === city.id)) || list[0];
  return list.length > 1 ? `${first.name} +${list.length - 1}` : first.name;
}
