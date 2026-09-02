import { useEffect, useRef, useState } from 'react';
import '../../styles/trekcard.css'

const formatDisplayPrice = (price) => {
  const numericPrice = Number(price || 0);

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
};

const getWithoutTransportPrice = (trip) =>
  Number(trip?.without_transport_price ?? trip?.price ?? 0);

const getPriceNote = (trip) => {
  const rawNote = trip?.price_note || 'per person';

  if (typeof rawNote !== 'string') {
    return 'per person';
  }

  const cleaned = rawNote
    .replace(/\bwith transportation\b/gi, '')
    .replace(/\btransportation included\b/gi, '')
    .replace(/\btransport included\b/gi, '')
    .replace(/\bwithout transportation\b/gi, '')
    .replace(/[,\-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || 'per person';
};

export default function TrekCard({ trek, onClick }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Brochure modal state
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [brochureError, setBrochureError] = useState('');

  const cardRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000/api';

  const images = [
    `/images/${trek.slug}1.jpg`,
    `/images/${trek.slug}2.jpg`,
    `/images/${trek.slug}3.jpg`,
    `/images/${trek.slug}4.jpg`,
    `/images/${trek.slug}5.jpg`,
  ];

  /*
   * Reset image when trek changes.
   */
  useEffect(() => {
    setCurrentImage(0);
  }, [trek.slug]);

  /*
   * Detect when card is visible.
   */
  useEffect(() => {
    const card = cardRef.current;

    if (!card || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin: '200px 0px',
      }
    );

    observer.observe(card);

    return () => observer.disconnect();
  }, []);

  /*
   * Automatic slideshow.
   */
  useEffect(() => {
    if (images.length <= 1 || !isVisible) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentImage((previous) => {
        return (previous + 1) % images.length;
      });
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [trek.slug, isVisible, images.length]);

  /*
   * Previous image.
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
   * Next image.
   */
  const handleNext = () => {
    setCurrentImage((previous) => {
      return (previous + 1) % images.length;
    });
  };

  /*
   * Open brochure modal.
   */
  const handleBrochure = () => {
    setName('');
    setMobile('');
    setBrochureError('');
    setShowBrochureModal(true);
  };

  const handleWhatsApp = () => {
    const message =
      `Hi, I am interested in booking ${trek.name}.`;

    window.open(
      `https://wa.me/918762350551?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /*
   * Close brochure modal.
   */
  const handleCloseBrochureModal = () => {
    if (isDownloading) {
      return;
    }

    setShowBrochureModal(false);
    setName('');
    setMobile('');
    setBrochureError('');
  };

  /*
   * Download brochure.
   *
   * Only trip_id, name and mobile are sent.
   *
   * The backend should find the trip and brochure details
   * using trip_id.
   */
  const handleBrochureDownload = async (event) => {
    event.preventDefault();

    setBrochureError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    /*
     * Name validation.
     */
    if (!trimmedName) {
      setBrochureError('Please enter your name.');
      return;
    }

    /*
     * Mobile validation.
     */
    if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
      setBrochureError(
        'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    /*
     * Trip ID validation.
     */
    if (!trek?.id) {
      setBrochureError(
        'Unable to identify this trek. Please try again.'
      );
      return;
    }

    try {
      setIsDownloading(true);

      const response = await fetch(
        `${API_BASE_URL}/brochure-download`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trip_id: trek.id,
            name: trimmedName,
            phone: trimmedMobile,
            email: null,
            city: null,
          }),
        }
      );

      /*
       * Backend returns JSON only for errors.
       */
      if (!response.ok) {
        let errorMessage =
          'Unable to download brochure.';

        try {
          const errorData = await response.json();

          errorMessage =
            errorData.message || errorMessage;
        } catch {
          // Response is not JSON
        }

        throw new Error(errorMessage);
      }

      /*
       * Backend returns the actual PDF.
       */
      const blob = await response.blob();

      /*
       * Get filename from backend response.
       */
      const contentDisposition =
        response.headers.get('Content-Disposition');

      let fileName = 'brochure.pdf';

      if (contentDisposition) {
        const match = contentDisposition.match(
          /filename="([^"]+)"/
        );

        if (match) {
          fileName = match[1];
        }
      }

      /*
       * Create temporary download URL.
       */
      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      /*
       * Close modal after successful download.
       */
      setShowBrochureModal(false);
      setName('');
      setMobile('');
      setBrochureError('');

    } catch (error) {
      console.error(
        'Brochure download error:',
        error
      );

      setBrochureError(
        error.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  /*
   * Image fallback.
   *
   * If kudremukh3.jpg doesn't exist,
   * fall back to the first image.
   */
  const handleImageError = (event) => {
    const fallbackImage = images[0];

    if (event.currentTarget.src.endsWith(fallbackImage)) {
      event.currentTarget.onerror = null;
      return;
    }

    event.currentTarget.src = fallbackImage;
  };

  return (
    <>
      <article
        className="trek-card"
        ref={cardRef}
        onClick={onClick}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onClick();
          }
        }}
      >
        {/* ========================= */}
        {/* IMAGE SLIDESHOW */}
        {/* ========================= */}

        <div className="thumb">
          <img
            src={images[currentImage]}
            alt={trek.name}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            style={{ cursor: 'default' }}
            onError={handleImageError}
            onClick={(event) => {
              event.stopPropagation();
            }}
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
              className="trek-slider-btn trek-slider-btn-prev"
              style={{ cursor: 'pointer' }}
              onClick={(event) => {
                event.stopPropagation();
                handlePrevious();
              }}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          {/* Next button */}
          {images.length > 1 && (
            <button
              type="button"
              className="trek-slider-btn trek-slider-btn-next"
              style={{ cursor: 'pointer' }}
              onClick={(event) => {
                event.stopPropagation();
                handleNext();
              }}
              aria-label="Next image"
            >
              ›
            </button>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div className="trek-slider-dots">
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={`trek-slider-dot ${currentImage === index
                      ? 'active'
                      : ''
                    }`}
                  style={{ cursor: 'pointer' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCurrentImage(index);
                  }}
                  aria-label={`Go to image ${index + 1
                    }`}
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

          <p>{trek.blurb}</p>

          <div className="info">
            <span>{trek.duration_label}</span>
            <span>{trek.difficulty}</span>
            <span>{trek.distance_label}</span>
          </div>

          <div className="price">
            <strong>
              ₹
              {formatDisplayPrice(
                getWithoutTransportPrice(trek)
              )}
            </strong>

            <small>{getPriceNote(trek)}</small>
          </div>

          <div className="buttons">
            <button
              className="outline"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleBrochure();
              }}
            >
              Download brochure
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleWhatsApp();
              }}
            >
              WhatsApp us
            </button>
          </div>
        </div>
      </article>

      {/* ========================= */}
      {/* BROCHURE MODAL */}
      {/* ========================= */}

      {showBrochureModal && (
        <div
          className="brochure-modal-overlay"
          onClick={handleCloseBrochureModal}
        >
          <div
            className="brochure-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* Close */}
            <button
              type="button"
              className="brochure-modal-close"
              onClick={handleCloseBrochureModal}
              disabled={isDownloading}
              aria-label="Close"
            >
              ×
            </button>

            {/* Header */}
            <div className="brochure-modal-header">
              <h2>Download Brochure</h2>

              <p>
                Enter your details to download the{' '}
                <strong>{trek.name}</strong> brochure.
              </p>
            </div>

            {/* Form */}
            <form
              className="brochure-form"
              onSubmit={handleBrochureDownload}
            >
              {/* Name */}
              <div className="brochure-form-group">
                <label
                  htmlFor={`brochure-name-${trek.id}`}
                >
                  Name
                </label>

                <input
                  id={`brochure-name-${trek.id}`}
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Enter your name"
                  disabled={isDownloading}
                  autoComplete="name"
                  required
                />
              </div>

              {/* Mobile */}
              <div className="brochure-form-group">
                <label
                  htmlFor={`brochure-mobile-${trek.id}`}
                >
                  Mobile Number
                </label>

                <input
                  id={`brochure-mobile-${trek.id}`}
                  type="tel"
                  value={mobile}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 10);

                    setMobile(value);
                  }}
                  placeholder="Enter 10-digit mobile number"
                  disabled={isDownloading}
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />
              </div>

              {/* Error */}
              {brochureError && (
                <div
                  className="brochure-form-error"
                  role="alert"
                >
                  {brochureError}
                </div>
              )}

              {/* Download */}
              <button
                type="submit"
                className="brochure-download-btn"
                disabled={isDownloading}
              >
                {isDownloading
                  ? 'Downloading...'
                  : 'Download Brochure'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}