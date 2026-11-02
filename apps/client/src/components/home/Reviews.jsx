import { useEffect, useState } from 'react';
import { getReviews } from '../../api/treks';
import SectionHeader from '../common/SectionHeader';

const FIRST_REVIEWS = 6;

const formatReviewDate = (value) => {
  if (!value) return 'Recent';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getReviews();
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data.map((review) => {
            const date = formatReviewDate(review.published_at || review.created_at);
            // Small line under the name: "Google review · June 2026", or the trip month
            // ("June 2026") when that is not just the same as the date
            const when = review.trip_month && review.trip_month !== date ? `${review.trip_month} · ${date}` : date;
            return {
              id: review.id,
              name: review.author_name || 'Traveller',
              detail: review.source === 'google' ? `Google review · ${date}` : when,
              rating: Number(review.rating || 5),
              text: review.body || 'Great experience.',
            };
          }));
        } else {
          setReviews([]);
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  // 6 cards (two rows of three) at first; "Show more" adds the rest
  const shown = showAll ? reviews : reviews.slice(0, FIRST_REVIEWS);

  return (
    <section className="section section-alt" id="reviews">
      <SectionHeader
        eyebrow="Traveller stories"
        title="What adventurers say"
        description="Real words from people who have trekked with us."
      />
      <div className="reviews-layout">
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p>No reviews available yet.</p>
        ) : (
          <div className="review-grid">
            {shown.map((review) => (
              <figure className="review" key={review.id}>
                <p className="stars" aria-label={`${review.rating} out of 5 stars`}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </p>
                <blockquote>“{review.text}”</blockquote>
                <figcaption>
                  <strong>{review.name}</strong>
                  <small>{review.detail}</small>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        {!showAll && reviews.length > FIRST_REVIEWS && (
          <div className="load-more-wrap">
            <button type="button" className="load-more-btn" onClick={() => setShowAll(true)}>
              Show more reviews ({reviews.length - FIRST_REVIEWS} more)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
