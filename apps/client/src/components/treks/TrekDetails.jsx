import { useState } from 'react';
import '../../styles/trekdetails.css';
import BookingModal from '../booking/BookingModal';

export default function TrekDetails({ trek, onBack }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');

  const [showBrochureModal, setShowBrochureModal] =
    useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [brochureError, setBrochureError] = useState('');

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

  const normalizeList = (value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(/\|\||\n|,/) 
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const inclusionItems = normalizeList(
    trek.includes || trek.inclusion || []
  );

  const exclusions = normalizeList(
    trek.excludes || trek.exclusions || trek.exclusion || []
  );

  const withoutTransportPrice = Number(
    trek.without_transport_price ??
      trek.price ??
      0
  );

  const withTransportPrice = Number(
    trek.with_transport_price ??
      trek.transportation_price ??
      withoutTransportPrice
  );

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(withoutTransportPrice);

  /* ============================= */
  /* IMAGE SLIDER */
  /* ============================= */

  const handlePrevious = () => {
    setCurrentImage((previous) =>
      previous === 0
        ? images.length - 1
        : previous - 1
    );
  };

  const handleNext = () => {
    setCurrentImage((previous) =>
      (previous + 1) % images.length
    );
  };

  const handleImageError = (event) => {
    event.currentTarget.onerror = null;

    if (currentImage !== 0) {
      setCurrentImage(0);
    }
  };

  /* ============================= */
  /* WHATSAPP */
  /* ============================= */

  const handleWhatsApp = () => {
    const message =
      `Hi, I am interested in booking ${trek.name}.`;

    window.open(
      `https://wa.me/918762350551?text=${encodeURIComponent(
        message
      )}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  /* ============================= */
  /* BOOK NOW */
  /* ============================= */

  const handleBookNow = () => {
    setShowBookingModal(true);

    // Add booking/payment logic here
  };

  /* ============================= */
  /* BROCHURE */
  /* ============================= */

  const handleBrochure = () => {
    setName('');
    setMobile('');
    setBrochureError('');
    setShowBrochureModal(true);
  };

  const handleCloseBrochureModal = () => {
    if (isDownloading) {
      return;
    }

    setShowBrochureModal(false);
    setName('');
    setMobile('');
    setBrochureError('');
  };

  const handleBrochureDownload = async (event) => {
    event.preventDefault();

    setBrochureError('');

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      setBrochureError(
        'Please enter your name.'
      );
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedMobile)) {
      setBrochureError(
        'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

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
            mobile: trimmedMobile,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage =
          'Unable to download brochure.';

        try {
          const errorData =
            await response.json();

          errorMessage =
            errorData.message ||
            errorMessage;
        } catch {
          // Not JSON
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      const contentDisposition =
        response.headers.get(
          'Content-Disposition'
        );

      let fileName = 'brochure.pdf';

      if (contentDisposition) {
        const match =
          contentDisposition.match(
            /filename="([^"]+)"/
          );

        if (match) {
          fileName = match[1];
        }
      }

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

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

  return (
  <>
    <main className="trek-details-page">

      {/* ================================= */}
      {/* MAIN CONTENT */}
      {/* ================================= */}

      <div className="trek-details-container">

        {/* BACK */}
        <button
          type="button"
          className="trek-back-button"
          onClick={onBack}
        >
          ← Back to treks
        </button>

        {/* ================================= */}
        {/* IMAGE GALLERY */}
        {/* ================================= */}

        <section className="trek-details-gallery">

          <img
            src={images[currentImage]}
            alt={trek.name}
            className="trek-details-image"
            onError={handleImageError}
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="details-slider-button details-prev"
                onClick={handlePrevious}
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                className="details-slider-button details-next"
                onClick={handleNext}
                aria-label="Next image"
              >
                ›
              </button>

              <div className="details-image-dots">

                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    className={
                      currentImage === index
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setCurrentImage(index)
                    }
                    aria-label={`Go to image ${
                      index + 1
                    }`}
                  />
                ))}

              </div>
            </>
          )}

        </section>

        {/* ================================= */}
        {/* TREK INFORMATION */}
        {/* ================================= */}

        <section className="trek-details-overview">

          <h1>{trek.name}</h1>

          {trek.blurb && (
            <p className="details-blurb">
              {trek.blurb}
            </p>
          )}

          <div className="details-info-grid">

            <div className="details-info-item">
              <span>Duration</span>
              <strong>
                {trek.duration_label || '-'}
              </strong>
            </div>

            <div className="details-info-item">
              <span>Difficulty</span>
              <strong>
                {trek.difficulty || '-'}
              </strong>
            </div>

            <div className="details-info-item">
              <span>Distance</span>
              <strong>
                {trek.distance_label || '-'}
              </strong>
            </div>

            <div className="details-info-item">
              <span>Starting Price</span>
              <strong>
                ₹{formattedPrice}
              </strong>
            </div>

          </div>

          {/* ================================= */}
          {/* DESCRIPTION */}
          {/* ================================= */}

          {trek.description && (
            <div className="details-description">

              <h2>
                About {trek.name}
              </h2>

              <div className="details-description-text">
                {trek.description}
              </div>

            </div>
          )}

        </section>

        {/* ================================= */}
        {/* TABS */}
        {/* ================================= */}

        <section className="trek-details-tabs">

          <div className="details-tab-buttons">

            <button
              type="button"
              className={
                activeTab === 'itinerary'
                  ? 'details-tab active'
                  : 'details-tab'
              }
              onClick={() =>
                setActiveTab('itinerary')
              }
            >
              Itinerary
            </button>

            <button
              type="button"
              className={
                activeTab === 'pricing'
                  ? 'details-tab active'
                  : 'details-tab'
              }
              onClick={() =>
                setActiveTab('pricing')
              }
            >
              Pricing
            </button>

            <button
              type="button"
              className={
                activeTab === 'inclusion'
                  ? 'details-tab active'
                  : 'details-tab'
              }
              onClick={() =>
                setActiveTab('inclusion')
              }
            >
              Inclusion & Exclusion
            </button>

          </div>

          {/* ================================= */}
          {/* ITINERARY */}
          {/* ================================= */}

          {activeTab === 'itinerary' && (
            <div className="details-tab-content">

              <h2>Itinerary</h2>

              {trek.itinerary ? (
                <div className="itinerary-content">
                  {trek.itinerary}
                </div>
              ) : (
                <p className="details-empty">
                  Itinerary details will be
                  updated soon.
                </p>
              )}

            </div>
          )}

          {/* ================================= */}
          {/* PRICING */}
          {/* ================================= */}

          {activeTab === 'pricing' && (
            <div className="details-tab-content">

              <div className="pricing-block">

                <h2>Pricing</h2>

                <div className="pricing-main">

                  <div className="pricing-option">
                    <span>Without Transportation</span>
                    <strong>
                      ₹{new Intl.NumberFormat('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(withoutTransportPrice)}
                    </strong>
                  </div>

                  <div className="pricing-option">
                    <span>With Transportation</span>
                    <strong>
                      ₹{new Intl.NumberFormat('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(withTransportPrice)}
                    </strong>
                  </div>

                </div>

              </div>

            </div>
          )}

          {activeTab === 'inclusion' && (
            <div className="details-tab-content">

              <div className="include-exclude-grid">

                <div className="include-block">

                  <h2>What's included</h2>

                  {inclusionItems.length > 0 ? (
                    <ul>

                      {inclusionItems.map(
                        (item, index) => (
                          <li key={index}>

                            <span className="include-icon">
                              ✓
                            </span>

                            {item}

                          </li>
                        )
                      )}

                    </ul>
                  ) : (
                    <p className="details-empty">
                      Inclusion details are
                      not available.
                    </p>
                  )}

                </div>

                <div className="exclude-block">

                  <h2>What's not included</h2>

                  {exclusions.length > 0 ? (
                    <ul>

                      {exclusions.map(
                        (item, index) => (
                          <li key={index}>

                            <span className="exclude-icon">
                              ×
                            </span>

                            {item}

                          </li>
                        )
                      )}

                    </ul>
                  ) : (
                    <p className="details-empty">
                      Exclusion details are
                      not available.
                    </p>
                  )}

                </div>

              </div>

            </div>
          )}

        </section>

        {/* Space so fixed buttons don't cover content */}
        <div className="trek-details-bottom-space" />

      </div>

      {/* ================================= */}
      {/* FIXED ACTION BAR */}
      {/* ================================= */}

      <div className="trek-details-action-bar">

        <div className="trek-action-container">

          <button
            type="button"
            className="trek-action-back"
            onClick={onBack}
          >
            ←
            <span>Back</span>
          </button>

          <button
            type="button"
            className="trek-action-brochure"
            onClick={handleBrochure}
          >
            Download Brochure
          </button>

          <button
            type="button"
            className="trek-action-whatsapp"
            onClick={handleWhatsApp}
          >
            WhatsApp
          </button>

          <button
            type="button"
            className="trek-action-book"
            onClick={handleBookNow}
          >
            Book Now
          </button>

        </div>

      </div>

      {/* ================================= */}
      {/* BROCHURE MODAL */}
      {/* ================================= */}

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
            <button
              type="button"
              className="brochure-modal-close"
              onClick={handleCloseBrochureModal}
              disabled={isDownloading}
            >
              ×
            </button>

            <div className="brochure-modal-header">
              <h2>
                Download Brochure
              </h2>

              <p>
                Enter your details to download
                the <strong>{trek.name}</strong>{' '}
                brochure.
              </p>
            </div>

            <form
              className="brochure-form"
              onSubmit={handleBrochureDownload}
            >
              <div className="brochure-form-group">
                <label>
                  Name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Enter your name"
                  disabled={isDownloading}
                  required
                />
              </div>

              <div className="brochure-form-group">
                <label>
                  Mobile Number
                </label>

                <input
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
                  required
                />
              </div>

              {brochureError && (
                <div
                  className="brochure-form-error"
                  role="alert"
                >
                  {brochureError}
                </div>
              )}

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

    </main>

    {showBookingModal && (
      <BookingModal
        trek={trek}
        onClose={() =>
          setShowBookingModal(false)
        }
      />
    )}
  </>
  );
}