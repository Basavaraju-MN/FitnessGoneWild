export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-inner">
        <p className="eyebrow eyebrow-light">Leaving Bangalore every Friday, 10:30 PM</p>
        <h1>Escape the routine.<br />Sleep under the Ghats.</h1>
        <p className="hero-sub">Weekend treks, sunrise climbs, coastal backpacking and hill rides — run by certified leaders in groups small enough to know your name.</p>
        <div className="hero-actions">
          <a className="btn btn-lg" href="#trips">See this month's treks</a>
          <a className="btn-ghost" href="#reviews">Read 1,200+ reviews →</a>
        </div>
        <ul className="hero-facts">
          <li><strong>25</strong><span>max group size</span></li>
          <li><strong>4.9</strong><span>average rating</span></li>
          <li><strong>300+</strong><span>trips completed</span></li>
          <li><strong>0</strong><span>hidden charges</span></li>
        </ul>
      </div>
    </section>
  );
}
