import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import SectionHeader from '../common/SectionHeader';
import TrekCard from './TrekCard';

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

export default function TrekCategories({ onTrekSelect }) {
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

  if (categoryLoading) {
    return (
      <section className="section" id="trips">
        <SectionHeader
          eyebrow="Pick your weekend"
          title="Upcoming departures"
          description="Every trip below has confirmed dates, transport from Bangalore and a leader assigned."
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
        description="Every trip below has confirmed dates, transport from Bangalore and a leader assigned."
      />

      {error && <p>{error}</p>}

      {/* Categories */}
      <div className="tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            className={
              activeCategoryId === category.id
                ? 'tab active'
                : 'tab'
            }
            onClick={() =>
              handleCategoryChange(category.id)
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Treks */}
      {trekLoading && (
        <p>Loading treks...</p>
      )}

      {!trekLoading && !error && (
        <div className="content-grid">

          {treks.length > 0 ? (
            treks.slice(0, visibleCount).map((trek) => (
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

      {!trekLoading && !error && treks.length > TREKS_PER_PAGE && (
        <div className="load-more-wrap" ref={buttonsRef}>
          {treks.length > visibleCount && (
            <button
              type="button"
              className="load-more-btn"
              onClick={() =>
                setVisibleCount((count) => count + TREKS_PER_PAGE)
              }
            >
              View more treks ({treks.length - visibleCount} more)
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