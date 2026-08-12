import SectionHeader from '../common/SectionHeader';
import { reviews } from '../../data/content';

export default function Reviews() {
  return (
    <section className="section section-alt" id="reviews">
      <SectionHeader eyebrow="Reviews" title="What people said after" />
      <div className="reviews-layout">
        <aside className="rating-summary">
          <p className="rating-score">4.9</p>
          <p className="rating-stars">★★★★★</p>
          <p className="rating-count">Based on 1,247 verified reviews</p>
          <ul className="rating-bars">
            {[['5★','92%'],['4★','6%'],['3★','1%'],['2★','1%'],['1★','0%']].map(([label, width]) => (
              <li key={label}><span>{label}</span><div className="bar"><i style={{ width }} /></div><em>{width}</em></li>
            ))}
          </ul>
          <p className="rating-note">96% of travellers said they'd book with us again.</p>
        </aside>
        <div className="review-grid">
          {reviews.map(review => (
            <figure className="review" key={review.id}>
              <p className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
              <blockquote>{review.text}</blockquote>
              <figcaption>
                <span className="avatar">{review.initial}</span>
                <span className="who"><strong>{review.name}</strong><small>{review.trek} · {review.date}</small></span>
                <span className="verified">Verified</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
