import { useEffect, useRef, useState } from 'react';
import { getFeaturedTrips, saveTripInterest } from '../../api/treks';
import SectionHeader from '../common/SectionHeader';
import RichText from '../common/RichText';
import FadeImage from '../common/FadeImage';
import useTrekImages, { FALLBACK_IMAGE } from '../../hooks/useTrekImages';
import '../../styles/trekcard.css';
import { getDisplayPrice, showsDifficulty } from '../../utils/tripPricing';
import { fromLabel, usePlaces } from '../../context/PlacesContext';

// How long each featured trip stays before the next slides in
const SLIDE_MS = 6000;

const formatPrice = (price) => {
  const numericPrice = Number(price || 0);
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice)}`;
};

// Photo slideshow at the top of a featured trip card. Shows only the
// images that exist; dots appear only when there is more than one.
// The photos change by themselves only while the mouse is over the trip
// (moving), so visitors do not download every photo of every trip.
function FeaturedTripImage({ slug, name, moving }) {
  const images = useTrekImages(slug);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    setCurrentImage(0);
  }, [slug, images.length]);

  useEffect(() => {
    if (images.length <= 1 || !moving) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCurrentImage((previous) => (previous + 1) % images.length);
    }, 2000);

    return () => clearTimeout(timer);
  }, [images.length, currentImage, moving]);

  return (
    <div className="thumb trip-thumb">
      <FadeImage
        src={images[currentImage] ?? images[0]}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = FALLBACK_IMAGE;
        }}
      />

      {images.length > 1 && (
        <div className="trek-slider-dots">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              className={`trek-slider-dot ${currentImage === index ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentImage(index);
              }}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeaturedTrips({ onTrekSelect }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interestCounts, setInterestCounts] = useState({});
  const [enquiryCounts, setEnquiryCounts] = useState({});
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false); // mouse over the slide

  // The trips only slide on while this section is on screen and the tab is
  // open (each new trip is another photo to download)
  const sectionRef = useRef(null);
  const [onScreen, setOnScreen] = useState(false);
  const [tabOpen, setTabOpen] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onChange = () => setTabOpen(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getFeaturedTrips();
        setTrips(data || []);
      } catch (err) {
        console.error('Failed to load featured trips:', err);
        setError('Unable to load featured trips right now.');
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  const handleInterested = async (event, trip) => {
    event.stopPropagation();

    try {
      await saveTripInterest(trip.id, 'interested');
      setInterestCounts((previous) => ({
        ...previous,
        [trip.id]: (previous[trip.id] || Number(trip.interested_count || 0)) + 1,
      }));
    } catch (error) {
      console.error('Failed to save interest:', error);
    }
  };

  const handleEnquire = async (event, trip) => {
    event.stopPropagation();

    try {
      await saveTripInterest(trip.id, 'enquiry');
      setEnquiryCounts((previous) => ({
        ...previous,
        [trip.id]: (previous[trip.id] || Number(trip.enquiry_count || 0)) + 1,
      }));
    } catch (error) {
      console.error('Failed to save enquiry:', error);
    }

    const message = `Hi, I want to enquire about ${trip.name}. Please share the trip details and availability.`;

    window.open(
      `https://wa.me/918762350551?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Only the featured trips for the chosen city / region; all of them when none match
  const { city, matches } = usePlaces();
  const matching = (trips || []).filter((trip) => matches(trip));
  const visibleTrips = matching.length > 0 ? matching : trips || [];

  const featuredTrips = visibleTrips.map((trip, index) => {
    const from = fromLabel(trip, city);
    const metaParts = [
      from ? `From ${from}` : null,
      trip.duration_label || trip.duration || trip.days,
      showsDifficulty(trip) ? trip.difficulty : null,
      trip.departure_time || trip.departure || trip.departure_label,
    ].filter(Boolean);

    const numericPrice = getDisplayPrice(trip);

    return {
      ...trip,
      id: trip.id,
      rank: trip.featured_label || trip.rank || (index === 0 ? 'Most booked' : index === 1 ? 'Best for beginners' : 'Long weekend'),
      name: trip.name,
      meta: metaParts.join(' · ') || 'Popular trip',
      price: numericPrice,
      displayPrice: formatPrice(numericPrice),
      interestedCount: Number(interestCounts[trip.id] ?? trip.interested_count ?? 0),
      enquiryCount: Number(enquiryCounts[trip.id] ?? trip.enquiry_count ?? 0),
    };
  });

  // One featured trip at a time; the next slides in every few seconds
  const count = featuredTrips.length;
  const shown = featuredTrips[current < count ? current : 0];
  const go = (step) => setCurrent((index) => (index + step + count) % count);

  // Counts again from the start after every change, also a click on a dot
  useEffect(() => {
    if (count <= 1 || paused || !onScreen || !tabOpen) return undefined;
    const timer = setTimeout(() => setCurrent((index) => (index + 1) % count), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [current, count, paused, onScreen, tabOpen]);

  return (
    <section className="section section-alt" id="featured" ref={sectionRef}>
      <SectionHeader eyebrow="Booking fastest right now" title="Featured trips" />

      {error && <p>{error}</p>}

      {!loading && !error && featuredTrips.length === 0 && (
        <p>No featured trips available right now.</p>
      )}

      {shown && (
        <div
          className="featured-slider"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* key: each trip slides in fresh */}
          <article className="featured-slide" key={shown.id} onClick={() => onTrekSelect?.(shown)}>
            <FeaturedTripImage slug={shown.slug} name={shown.name} moving={paused && tabOpen} />

            <div className="featured-text">
              <span className="trip-rank">{shown.rank}</span>
              {shown.region && <span className="card-region">{shown.region.name}</span>}
              <h3 className="featured-title">{shown.name}</h3>
              <p className="trip-meta">{shown.meta}</p>
              <RichText className="featured-blurb" html={shown.blurb} />
              <p className="trip-price">{shown.displayPrice} <small>/ person</small></p>

              <div className="featured-counts">
                <span>{shown.interestedCount} interested</span>
                <span>{shown.enquiryCount} enquiries</span>
              </div>

              <div className="featured-actions">
                <button type="button" className="outline" onClick={(event) => handleInterested(event, shown)}>
                  Interested
                </button>
                <button type="button" onClick={(event) => handleEnquire(event, shown)}>
                  Enquire about this trip ↗
                </button>
              </div>
            </div>
          </article>

          {count > 1 && (
            <div className="featured-nav">
              <button type="button" className="featured-arrow" aria-label="Previous featured trip" onClick={() => go(-1)}>‹</button>
              {featuredTrips.map((trip, index) => (
                <button
                  key={trip.id}
                  type="button"
                  className={`featured-dot ${index === current ? 'active' : ''}`}
                  aria-label={`Show ${trip.name}`}
                  onClick={() => setCurrent(index)}
                />
              ))}
              <button type="button" className="featured-arrow" aria-label="Next featured trip" onClick={() => go(1)}>›</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
