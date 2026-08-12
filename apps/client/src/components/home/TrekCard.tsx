import type { Trek } from '../../types/trek';
import { useNavigate } from 'react-router-dom';

export default function TrekCard({ trek }: { trek: Trek }) {
  const navigate = useNavigate();

 const handleBrochure = () => {
  const authValue = localStorage.getItem('isAuthenticated');

  console.log('Auth value:', authValue);

  const isAuthenticated = authValue === 'true';

  console.log('Is authenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('Going to login page');

    navigate('/login');

    return;
  }

  console.log('Download brochure:', trek.name);
};

  const handleWhatsApp = () => {
    const isAuthenticated =
      localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          from: window.location.pathname,
        },
      });

      return;
    }

    // Actual WhatsApp action will be added later
    console.log('WhatsApp:', trek.name);
  };

  return (
    <article className="trek-card">
      <div className="thumb">
        <img src={trek.image} alt={trek.name} />
        {trek.tag && <span className={`tag ${trek.hot ? 'tag-hot' : ''}`}>{trek.tag}</span>}
      </div>
      <div className="card-body">
        <h3>{trek.name}</h3>
        <p>{trek.description}</p>
        <div className="info"><span>{trek.duration}</span><span>{trek.difficulty}</span><span>{trek.distance}</span></div>
        <div className="price"><strong>₹{trek.price.toLocaleString('en-IN')}</strong><small>{trek.priceText}</small></div>
        <div className="buttons">
          <button
            className="outline"
            onClick={handleBrochure}
          >
            Download brochure
          </button>

          <button onClick={handleWhatsApp}>
            WhatsApp us
          </button>
        </div>
      </div>
    </article>
  );
}
