import { useEffect, useState } from 'react';
import { getTrekCategories } from '../../api/treks';

export default function Footer() {
  const [tripCategories, setTripCategories] = useState([]);

  useEffect(() => {
    const fetchTripCategories = async () => {
      try {
        const categories = await getTrekCategories();
        setTripCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Failed to load footer trip categories:', error);
        setTripCategories([]);
      }
    };

    fetchTripCategories();
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <img
            src="/images/logo.png"
            alt="The Fitness Gone Wild"
            style={{
              // Light box behind the logo so its dark colours show on the
              // dark footer (size includes the padding, logo stays 110×72)
              height: '88px',
              width: '134px',
              padding: '8px 12px',
              background: '#F7F5EC',
              borderRadius: '12px',
              objectFit: 'contain',
              display: 'block',
              marginBottom: '12px',
            }}
          />
          <h3>The Fitness Gone Wild</h3>
          <p>Experience with us</p>
          <p className="footer-note">Running treks and trips out of Bangalore since 2018.</p>
        </div>
        <div>
          <h4>Trips</h4>
          <ul>
            {tripCategories.length > 0 ? (
              tripCategories.map((category) => (
                <li key={category.id}>
                  <a href="#trips">{category.name}</a>
                </li>
              ))
            ) : (
              <li><a href="#trips">Trips</a></li>
            )}
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
            <li><a href="tel:+918762350551">+91 87623 50551</a></li>
            <li><a href="mailto:gonewildfitness@gmail.com">gonewildfitness@gmail.com</a></li>
            <li>Rajajinagar, Bengaluru</li>
            <li>
              <a
                href="https://instagram.com/thefitnessgonewild"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="copyright">© 2026 The Fitness Gone Wild · All rights reserved</p>
    </footer>
  );
}
