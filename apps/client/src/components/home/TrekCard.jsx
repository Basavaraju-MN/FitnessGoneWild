import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TrekCard({ trek }) {
  const navigate = useNavigate();

  const [currentImage, setCurrentImage] = useState(0);


  const images = [
    `/images/${trek.slug}1.jpg`,
    `/images/${trek.slug}2.jpg`,
    `/images/${trek.slug}3.jpg`,
    `/images/${trek.slug}4.jpg`,
    `/images/${trek.slug}5.jpg`,
  ];

  /*
   * Reset image when user changes category/card.
   */
  useEffect(() => {
    setCurrentImage(0);
  }, [trek.slug]);

  /*
   * Automatic slideshow
   */
  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentImage((previous) => {
        return (previous + 1) % images.length;
      });
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [trek.slug]);

  /*
   * Previous image
   */
  const handlePrevious = () => {
    setCurrentImage((previous) => {
      if (previous === 0) {
        return images.length - 1;
      }

      return previous - 1;
    });
  };

  /*
   * Next image
   */
  const handleNext = () => {
    setCurrentImage((previous) => {
      return (previous + 1) % images.length;
    });
  };

  /*
   * Brochure
   */
  const handleBrochure = () => {
    const isAuthenticated =
      localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    console.log('Download brochure:', trek.name);
  };

  /*
   * WhatsApp
   */
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

    console.log('WhatsApp:', trek.name);
  };

  /*
   * Image fallback
   *
   * If kudremukh3.jpg doesn't exist, for example,
   * show the main kudremukh.jpg instead.
   */
  const handleImageError = (event) => {
    event.currentTarget.src = `/images/${trek.slug}.jpg`;
  };

  return (
    <article className="trek-card">

      {/* ========================= */}
      {/* IMAGE SLIDESHOW */}
      {/* ========================= */}

      <div
        className="thumb"
        style={{
          position: 'relative',
        }}
      >
        <img
          src={images[currentImage]}
          alt={trek.name}
          onError={handleImageError}
          
        />

        {/* Badge */}
        {trek.badge_text && (
          <span
            className={`tag ${trek.badge_style === 'amber'
                ? 'tag-hot'
                : ''
              }`}
          >
            {trek.badge_text}
          </span>
        )}

        {/* Previous button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrevious}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0',
              zIndex: 2,
            }}
          >
            ‹
          </button>
        )}

        {/* Next button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '32px',
              fontWeight: 'bold',
              cursor: 'pointer',
              padding: '0',
              zIndex: 2,
            }}
          >
            ›
          </button>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '6px',
              zIndex: 2,
            }}
          >
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setCurrentImage(index)}
                style={{
                  width: '8px',
                  height: '8px',
                  padding: 0,
                  border: 'none',
                  borderRadius: '50%',
                  background:
                    currentImage === index
                      ? '#ffffff'
                      : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ========================= */}
      {/* CARD CONTENT */}
      {/* ========================= */}

      <div className="card-body">

        <h3>{trek.name}</h3>

        <p>
          {trek.blurb}
        </p>

        <div className="info">
          <span>{trek.duration_label}</span>
          <span>{trek.difficulty}</span>
          <span>{trek.distance_label}</span>
        </div>

        <div className="price">
          <strong>
            ₹{Number(trek.price).toLocaleString('en-IN')}
          </strong>

          <small>
            {trek.price_note}
          </small>
        </div>

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