import { featuredTrips } from '../../data/content';
import SectionHeader from '../common/SectionHeader';

export default function FeaturedTrips() {
  const handleBookNow = () => {
  };
  return (
    <section className="section section-alt" id="featured">
      <SectionHeader eyebrow="Booking fastest right now" title="Featured trips" />
      <div className="featured-grid">
        {featuredTrips.map(trip => (
          <article className="trip" key={trip.id}>
            <span className="trip-rank">{trip.rank}</span>
            <h3>{trip.name}</h3>
            <p className="trip-meta">{trip.meta}</p>
            <p className="trip-price">{trip.price} <small>/ person</small></p>
            <ul className="trip-includes">{trip.includes.map(item => <li key={item}>{item}</li>)}</ul>
            <button onClick={handleBookNow}>
              Book now
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
