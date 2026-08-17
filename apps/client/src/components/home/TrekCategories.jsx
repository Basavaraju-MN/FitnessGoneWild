import { useEffect, useState } from 'react';
import SectionHeader from '../common/SectionHeader';
import TrekCard from './TrekCard';
import {
  getTrekCategories,
  getTreksByCategory,
} from '../../api/treks';

export default function TrekCategories() {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [treks, setTreks] = useState([]);

  const [categoryLoading, setCategoryLoading] = useState(true);
  const [trekLoading, setTrekLoading] = useState(false);

  const [error, setError] = useState('');

  // Load trek categories when the screen loads
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setCategoryLoading(true);
        setError('');

        console.log('Fetching trek categories...');

        const data = await getTrekCategories();

        console.log('Trek categories:', data);

        setCategories(data);

        // Automatically select the first category
        if (data.length > 0) {
          setActiveCategoryId(data[0].id);
        }
      } catch (err) {
        console.error(
          'Failed to load trek categories:',
          err
        );

        setError(
          'Unable to load trek categories. Please try again.'
        );
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Load treks whenever the selected category changes
  useEffect(() => {
    if (!activeCategoryId) {
      return;
    }

    const fetchTreks = async () => {
      try {
        setTrekLoading(true);
        setError('');

        console.log(
          'Fetching treks for category:',
          activeCategoryId
        );

        const data = await getTreksByCategory(
          activeCategoryId
        );

        console.log('Treks:', data);

        setTreks(data);
      } catch (err) {
        console.error(
          'Failed to load treks:',
          err
        );

        setTreks([]);

        setError(
          'Unable to load treks. Please try again.'
        );
      } finally {
        setTrekLoading(false);
      }
    };

    fetchTreks();
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

      {/* Categories from backend */}
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
              setActiveCategoryId(category.id)
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Treks from backend */}
      {trekLoading && (
        <p>Loading treks...</p>
      )}

      {!trekLoading && !error && (
        <div className="content-grid">
          {treks.length > 0 ? (
            treks.map((trek) => (
              <TrekCard
                key={trek.id}
                trek={trek}
              />
            ))
          ) : (
            <p>
              No treks available for this category.
            </p>
          )}
        </div>
      )}
    </section>
  );
}