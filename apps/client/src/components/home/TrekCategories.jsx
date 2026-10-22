import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import SectionHeader from '../common/SectionHeader';
import CityPicker, { RegionPicker } from '../common/CityPicker';
import TrekCard from './TrekCard';
import { usePlaces } from '../../context/PlacesContext';
import '../../styles/places.css';

import {
  getTrekCategories,
  getTreksByCategory,
} from '../../api/treks';

// 3 cards per row x 3 rows
const TREKS_PER_PAGE = 9;

// Kept outside the component so the list comes back as it was
// (same tab, same "View more" state) after returning from a trek's
// details page. Resets on a full page reload.
const listMemory = {
  categoryId: null,
  visibleCount: TREKS_PER_PAGE,
};
let categoriesCache = null;
const treksCache = new Map();

const WHATSAPP = '918762350551';

// Text a trek can be found by: name, short description, duration, region, cities
const plain = (html) => String(html || '').replace(/<[^>]*>/g, ' ');
const searchText = (trek) => [
  trek.name,
  plain(trek.blurb),
  trek.duration_label,
  trek.difficulty,
  trek.region?.name,
  ...(trek.departure_cities || []).map((c) => c.name),
].filter(Boolean).join(' ').toLowerCase();

// Section text: which city the transport leaves from
const describe = (city) =>
  `Every trip below has confirmed dates, transport from ${city ? city.name : 'your departure city'} and a leader assigned.`;

export default function TrekCategories({ onTrekSelect }) {
  const { city, region, setRegionId, setCityId, matches, countTreks, hasPlaces } = usePlaces();

  const [categories, setCategories] = useState(categoriesCache || []);
  const [activeCategoryId, setActiveCategoryId] = useState(
    listMemory.categoryId
  );

  const [treks, setTreks] = useState(
    treksCache.get(listMemory.categoryId) || []
  );
  const [visibleCount, setVisibleCount] = useState(
    listMemory.visibleCount
  );

  useEffect(() => {
    listMemory.categoryId = activeCategoryId;
    listMemory.visibleCount = visibleCount;
  }, [activeCategoryId, visibleCount]);

  const handleCategoryChange = (categoryId) => {
    if (categoryId === activeCategoryId) return;

    setVisibleCount(TREKS_PER_PAGE);
    setActiveCategoryId(categoryId);
  };

  // Keeps the View more / View less buttons at the same spot on
  // screen when the list shrinks, so the page does not jump.
  const buttonsRef = useRef(null);
  const buttonsTopRef = useRef(null);

  useLayoutEffect(() => {
    if (buttonsTopRef.current === null || !buttonsRef.current) {
      return;
    }

    const newTop = buttonsRef.current.getBoundingClientRect().top;
    window.scrollBy({
      top: newTop - buttonsTopRef.current,
      behavior: 'instant',
    });

    buttonsTopRef.current = null;
  }, [visibleCount]);

  const [categoryLoading, setCategoryLoading] = useState(!categoriesCache);
  const [trekLoading, setTrekLoading] = useState(false);

  const [error, setError] = useState('');

  // Load trek categories
  useEffect(() => {
    const controller = new AbortController();

    const fetchCategories = async () => {
      try {
        if (!categoriesCache) setCategoryLoading(true);
        setError('');

        const data = await getTrekCategories({
          signal: controller.signal,
        });

        categoriesCache = data;
        setCategories(data);

        // Keep the remembered tab; otherwise start on the first one
        setActiveCategoryId((current) =>
          data.some((category) => category.id === current)
            ? current
            : data[0]?.id ?? null
        );
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(
          'Failed to load trek categories:',
          err
        );

        setError(
          'Unable to load trek categories. Please try again.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setCategoryLoading(false);
        }
      }
    };

    fetchCategories();

    return () => controller.abort();
  }, []);

  // Load treks when category changes
  useEffect(() => {
    if (!activeCategoryId) {
      return;
    }

    // Abort the previous request so a slow response for an old
    // category cannot overwrite the treks of the selected one.
    const controller = new AbortController();

    // Show cached treks straight away (no loading text), then refresh
    const cached = treksCache.get(activeCategoryId);

    const fetchTreks = async () => {
      try {
        if (cached) {
          setTreks(cached);
        } else {
          setTrekLoading(true);
        }
        setError('');

        const data = await getTreksByCategory(
          activeCategoryId,
          { signal: controller.signal }
        );

        treksCache.set(activeCategoryId, data);
        setTreks(data);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error(
          'Failed to load treks:',
          err
        );

        // A failed background refresh keeps the cached treks on screen
        if (cached) {
          return;
        }

        setTreks([]);
        setError(
          'Unable to load treks. Please try again.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setTrekLoading(false);
        }
      }
    };

    fetchTreks();

    return () => controller.abort();
  }, [activeCategoryId]);

  // Search: looks through the treks of every tab
  const [query, setQuery] = useState('');
  const [allTreks, setAllTreks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searching = query.trim().length > 0;

  useEffect(() => {
    if (!searching || categories.length === 0) return undefined;
    const controller = new AbortController();
    const load = async () => {
      setSearchLoading(categories.some((c) => !treksCache.has(c.id)));
      try {
        const lists = await Promise.all(categories.map(async (category) => {
          if (treksCache.has(category.id)) return treksCache.get(category.id);
          const data = await getTreksByCategory(category.id, { signal: controller.signal });
          treksCache.set(category.id, data);
          return data;
        }));
        const seen = new Set();
        setAllTreks(lists.flat().filter((trek) => !seen.has(trek.id) && seen.add(trek.id)));
      } catch {
        // Keep whatever was found so far
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [searching, categories]);

  useEffect(() => {
    setVisibleCount(TREKS_PER_PAGE);
  }, [query]);

  const words = query.trim().toLowerCase().split(/s+/).filter(Boolean);
  const searchResults = allTreks
    .filter((trek) => matches(trek))
    .filter((trek) => {
      const text = searchText(trek);
      return words.every((word) => text.includes(word));
    });

  // Treks for the chosen city / region, and how many each tab has
  const shownTreks = searching ? searchResults : treks.filter((trek) => matches(trek));
  const tabCount = (categoryId) =>
    countTreks((t) => !t.is_featured && t.category_id === categoryId);
  const filtering = hasPlaces && Boolean(city || region);

  // Tabs: a region can be set to show only some categories (in its order);
  // a region without that setting, or "All regions", shows every category
  const regionCategoryIds = region?.category_ids || [];
  const tabs = regionCategoryIds.length > 0
    ? regionCategoryIds
      .map((id) => categories.find((category) => category.id === id))
      .filter(Boolean)
    : categories;

  // The open tab is not shown for this region, or has nothing for this
  // city / region: move to one that has treks
  useEffect(() => {
    if (!activeCategoryId || tabs.length === 0) return;
    const shown = tabs.some((category) => category.id === activeCategoryId);
    if (shown && (!filtering || tabCount(activeCategoryId) > 0)) return;
    const next = tabs.find((category) => !filtering || tabCount(category.id) > 0) || tabs[0];
    if (next && next.id !== activeCategoryId) {
      setVisibleCount(TREKS_PER_PAGE);
      setActiveCategoryId(next.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtering, city?.id, region?.id, categories, activeCategoryId]);

  const nothingAnywhere = filtering && tabs.every((category) => tabCount(category.id) === 0);

  const notifyMe = () => {
    const what = region ? `${region.name} treks` : 'treks';
    const from = city ? ` from ${city.name}` : '';
    const message = `Hi, please let me know when ${what}${from} open for booking.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  if (categoryLoading) {
    return (
      <section className="section" id="trips">
        <SectionHeader
          eyebrow="Pick your weekend"
          title="Upcoming departures"
          description={describe(city)}
        />

        <p>Loading trek categories...</p>
      </section>
    );
  }

  return (
    <section className="section" id="trips">

      <SectionHeader
        eyebrow="Pick your weekend"
        title="Upcoming departures"
        description={describe(city)}
      />

      {/* Search + region + departure city */}
      <div className="trek-filter-bar">
        <label className="trek-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search treks, places or duration…"
            aria-label="Search treks"
          />
          {query && (
            <button type="button" className="trek-search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>

        {hasPlaces && <RegionPicker />}

        {hasPlaces && <CityPicker />}
      </div>

      {error && <p>{error}</p>}

      {searching && (
        <p className="trek-search-summary">
          {searchLoading
            ? 'Searching…'
            : `${shownTreks.length} trek${shownTreks.length === 1 ? '' : 's'} found for “${query.trim()}”${city ? ` from ${city.name}` : ''}${region ? ` in ${region.name}` : ''}`}
          <button type="button" className="outline btn-sm" onClick={() => setQuery('')}>Clear search</button>
        </p>
      )}

      {/* Categories */}
      {!nothingAnywhere && !searching && (
        <div className="tabs">
          {tabs.map((category) => {
            const n = hasPlaces ? tabCount(category.id) : null;
            return (
              <button
                key={category.id}
                className={[
                  'tab',
                  activeCategoryId === category.id ? 'active' : '',
                  filtering && n === 0 ? 'tab-empty' : '',
                ].filter(Boolean).join(' ')}
                onClick={() =>
                  handleCategoryChange(category.id)
                }
              >
                {category.name}
                {n !== null && <em>{n}</em>}
              </button>
            );
          })}
        </div>
      )}

      {/* Treks */}
      {(searching ? searchLoading && allTreks.length === 0 : trekLoading) && (
        <p>Loading treks...</p>
      )}

      {!(searching ? searchLoading && allTreks.length === 0 : trekLoading) && !error && (
        <div className="content-grid">

          {searching && !searchLoading && shownTreks.length === 0 ? (
            <div className="trek-empty">
              <h3>No treks match “{query.trim()}”</h3>
              <p>Try another name or place{city || region ? ', or show all cities and regions' : ''}.</p>
              <div className="trek-empty-actions">
                <button type="button" onClick={() => setQuery('')}>Clear search</button>
                {(city || region) && (
                  <button
                    type="button"
                    className="outline"
                    onClick={() => {
                      setRegionId(null);
                      setCityId(null);
                    }}
                  >
                    All cities and regions
                  </button>
                )}
              </div>
            </div>
          ) : !searching && (nothingAnywhere || (filtering && shownTreks.length === 0)) ? (
            <div className="trek-empty">
              <h3>
                {region ? `${region.name} is coming soon` : 'No treks here yet'}
              </h3>
              <p>
                {region && city
                  ? `We are planning ${region.name} departures from ${city.name}. Get a WhatsApp message the day bookings open.`
                  : region
                    ? `We are planning our first ${region.name} departures. Get a WhatsApp message the day bookings open.`
                    : `No departures from ${city?.name || 'this city'} in this list yet. Try another tab or city.`}
              </p>
              <div className="trek-empty-actions">
                <button type="button" onClick={notifyMe}>Notify me on WhatsApp</button>
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setRegionId(null);
                    if (!region) setCityId(null);
                  }}
                >
                  {region ? 'See all regions' : 'Show all cities'}
                </button>
              </div>
            </div>
          ) : shownTreks.length > 0 ? (
            shownTreks.slice(0, visibleCount).map((trek) => (
              <TrekCard
                key={trek.id}
                trek={trek}
                onClick={() => {
                  if (onTrekSelect) {
                    onTrekSelect(trek);
                  }
                }}
              />
            ))
          ) : (
            <p>
              No treks available for this category.
            </p>
          )}

        </div>
      )}

      {!trekLoading && !error && shownTreks.length > TREKS_PER_PAGE && (
        <div className="load-more-wrap" ref={buttonsRef}>
          {shownTreks.length > visibleCount && (
            <button
              type="button"
              className="load-more-btn"
              onClick={() =>
                setVisibleCount((count) => count + TREKS_PER_PAGE)
              }
            >
              View more treks ({shownTreks.length - visibleCount} more)
            </button>
          )}

          {visibleCount > TREKS_PER_PAGE && (
            <button
              type="button"
              className="load-more-btn"
              onClick={() => {
                buttonsTopRef.current =
                  buttonsRef.current?.getBoundingClientRect().top ?? null;
                setVisibleCount(TREKS_PER_PAGE);
              }}
            >
              View less
            </button>
          )}
        </div>
      )}

    </section>
  );
}