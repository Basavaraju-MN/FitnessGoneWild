export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div className="footer-logo">FGW</div>
          <h3>The Fitness Gone Wild</h3>
          <p>Experience with us</p>
          <p className="footer-note">Running treks and trips out of Bangalore since 2018.</p>
        </div>
        <div>
          <h4>Trips</h4>
          <ul>
            <li><a href="#trips">Weekend treks</a></li>
            <li><a href="#trips">One day treks</a></li>
            <li><a href="#trips">Backpacking</a></li>
            <li><a href="#trips">Bike rides</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="#why">Why choose us</a></li>
            <li><a href="#reviews">Reviews</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4>Reach us</h4>
          <ul>
            <li><a href="tel:+919876543210">+91 98765 43210</a></li>
            <li><a href="mailto:hello@fitnessgonewild.in">hello@fitnessgonewild.in</a></li>
            <li>Indiranagar, Bengaluru</li>
            <li><a href="#">Instagram</a> · <a href="#">YouTube</a></li>
          </ul>
        </div>
      </div>
      <p className="copyright">© 2026 The Fitness Gone Wild · All rights reserved</p>
    </footer>
  );
}
