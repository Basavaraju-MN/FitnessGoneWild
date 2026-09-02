import { useEffect, useMemo, useState } from 'react';
import { getReviews } from '../../api/treks';
import SectionHeader from '../common/SectionHeader';

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

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getReviews();
        if (Array.isArray(data) && data.length > 0) {
          setReviews(data.map((review) => ({
            id: review.id,
            name: review.author_name || 'Traveller',
            initial: (review.author_name || 'T').trim().charAt(0).toUpperCase(),
            trek: review.trip_month || 'Trek',
            date: formatReviewDate(review.published_at || review.created_at),
            rating: Number(review.rating || 5),
            text: review.body || 'Great experience.',
          })));
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

  const ratingSummary = useMemo(() => {
    const items = (reviews || []).map((review) => Number(review.rating || 0));
    const total = items.length;
    const totalScore = items.reduce((sum, value) => sum + value, 0);
    const average = total === 0 ? '0.0' : (totalScore / total).toFixed(1);

    const breaks = [5, 4, 3, 2, 1].map((star) => {
      const count = items.filter((value) => value === star).length;
      const percent = total === 0 ? 0 : Math.round((count / total) * 100);
      return { star, count, percent };
    });

    return {
      average,
      totalReviews: items.length,
      breaks,
    };
  }, [reviews]);

  return (
    <section className="section section-alt" id="reviews">
      <SectionHeader eyebrow="Reviews" title="What people said after" />
      <div className="reviews-layout">
        <aside className="rating-summary">
          <p className="rating-score">{ratingSummary.average}</p>
          <p className="rating-stars">★★★★★</p>
          <p className="rating-count">Based on {ratingSummary.totalReviews} verified reviews</p>
          <ul className="rating-bars">
            {ratingSummary.breaks.map(({ star, percent }) => (
              <li key={star}><span>{star}★</span><div className="bar"><i style={{ width: `${percent}%` }} /></div><em>{percent}%</em></li>
            ))}
          </ul>
          <p className="rating-note">96% of travellers said they'd book with us again.</p>
        </aside>
        <div className="review-grid">
          {loading ? (
            <p>Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p>No reviews available yet.</p>
          ) : (
            reviews.map((review) => (
              <figure className="review" key={review.id}>
                <p className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                <blockquote>{review.text}</blockquote>
                <figcaption>
                  <span className="avatar">{review.initial}</span>
                  <span className="who"><strong>{review.name}</strong><small>{review.trek} · {review.date}</small></span>
                  <span className="verified">Verified</span>
                </figcaption>
              </figure>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
