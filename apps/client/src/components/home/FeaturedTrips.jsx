import { useEffect, useState } from 'react';
import { getFeaturedTrips, saveTripInterest } from '../../api/treks';
import SectionHeader from '../common/SectionHeader';
import useTrekImages, { FALLBACK_IMAGE } from '../../hooks/useTrekImages';
import '../../styles/trekcard.css';
import { getDisplayPrice, showsDifficulty } from '../../utils/tripPricing';

const formatPrice = (price) => {
  const numericPrice = Number(price || 0);
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice)}`;
};

// Photo slideshow at the top of a featured trip card. Shows only the
// images that exist; dots appear only when there is more than one.
function FeaturedTripImage({ slug, name }) {
  const images = useTrekImages(slug);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    setCurrentImage(0);
  }, [slug, images.length]);

  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCurrentImage((previous) => (previous + 1) % images.length);
    }, 3500);

    return () => clearTimeout(timer);
  }, [images.length, currentImage]);

  return (
    <div className="thumb trip-thumb">
      <img
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

  const featuredTrips = (trips || []).map((trip, index) => {
    const metaParts = [
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

  return (
    <section className="section section-alt" id="featured">
      <SectionHeader eyebrow="Booking fastest right now" title="Featured trips" />

      {error && <p>{error}</p>}

      {!loading && !error && featuredTrips.length === 0 && (
        <p>No featured trips available right now.</p>
      )}

      <div className="featured-grid">
        {featuredTrips.map((trip) => (
          <article
            className="trip"
            key={trip.id}
            onClick={() => onTrekSelect?.(trip)}
            style={{ cursor: 'pointer' }}
          >
            <FeaturedTripImage slug={trip.slug} name={trip.name} />

            <span className="trip-rank">{trip.rank}</span>
            <h3>{trip.name}</h3>
            <p className="trip-meta">{trip.meta}</p>
            <p className="trip-price">{trip.displayPrice} <small>/ person</small></p>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '14px', fontSize: '0.8rem', color: '#56655F' }}>
              <span>{trip.interestedCount} interested</span>
              <span>{trip.enquiryCount} enquiries</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={(event) => handleInterested(event, trip)}
                style={{
                  flex: 1,
                  border: '1px solid #DDE4DE',
                  background: '#fff',
                  color: '#0F3D36',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Interested
              </button>
              <button
                type="button"
                onClick={(event) => handleEnquire(event, trip)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: '#E4881F',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Enquire
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
