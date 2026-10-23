import { useEffect, useState } from 'react';
import '../../styles/trekdetails.css';
import BookingModal from '../booking/BookingModal';
import RichText from '../common/RichText';
import TrekTerms from './TrekTerms';
import useTrekImages, { FALLBACK_IMAGE } from '../../hooks/useTrekImages';
import {
  getDisplayPrice,
  getWithTransportPrice,
  getWithoutTransportPrice,
  isWithTransportOnly,
  showsDifficulty,
  showsDistance,
} from '../../utils/tripPricing';
import { API_BASE_URL, getDownloadFileName, getTripTerms } from '../../api/treks';

export default function TrekDetails({ trek, onBack }) {
  const [currentImage, setCurrentImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');

  // Share this trek's own link (/treks/<slug>)
  const [shareNote, setShareNote] = useState('');
  const shareUrl = `${window.location.origin}/treks/${trek.slug}`;
  const shareTrek = async () => {
    const text = `${trek.name} with The Fitness Gone Wild`;
    if (navigator.share) {
      try {
        await navigator.share({ title: trek.name, text, url: shareUrl });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return; // closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareNote('Link copied');
    } catch {
      setShareNote(shareUrl);
    }
    setTimeout(() => setShareNote(''), 3000);
  };
  const shareOnWhatsApp = () => {
    const message = `${trek.name} with The Fitness Gone Wild: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  // Terms & Policies tab: shown only when the trek has terms
  const [terms, setTerms] = useState(null);
  useEffect(() => {
    if (!trek?.id) return undefined;
    const controller = new AbortController();
    setTerms(null);
    getTripTerms(trek.id, { signal: controller.signal })
      .then((data) => setTerms(data))
      .catch(() => {});
    return () => controller.abort();
  }, [trek?.id]);
  const hasTerms = Boolean(terms?.sections?.length);

  const [showBrochureModal, setShowBrochureModal] =
    useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [brochureError, setBrochureError] = useState('');


  // Only the images that exist, in order 1 to 5
  const images = useTrekImages(trek.slug);

  useEffect(() => {
    setCurrentImage(0);
  }, [trek.slug, images.length]);

  // Automatic slideshow, only when there is more than one image.
  // Restarts the timer after a manual arrow or dot click.
  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setCurrentImage((previous) => (previous + 1) % images.length);
    }, 4000);

    return () => clearTimeout(timer);
  }, [images.length, currentImage]);

  const normalizeList = (value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        // One item per line ("||" joins rows); commas stay inside an item
        .split(/\|\||\r?\n/)
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

  const withoutTransportPrice = getWithoutTransportPrice(trek);

  const withTransportPrice = getWithTransportPrice(trek);

  // Backpacking trips are sold only with transportation
  const transportOnly = isWithTransportOnly(trek);

  // Duration and Starting Price always show; Difficulty and Distance
  // depend on the category
  const infoBoxCount =
    2 + (showsDifficulty(trek) ? 1 : 0) + (showsDistance(trek) ? 1 : 0);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(getDisplayPrice(trek));

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
    event.currentTarget.src = FALLBACK_IMAGE;
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

  const isFeatured = Number(trek.is_featured) === 1;

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
            phone: trimmedMobile,
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

      const fileName = getDownloadFileName(
        contentDisposition,
        `${trek.name || 'brochure'}.pdf`
      );

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

        {/* BACK + SHARE */}
        <div className="trek-top-bar">
          <button
            type="button"
            className="trek-back-button"
            onClick={onBack}
          >
            ← Back to treks
          </button>

          <div className="trek-share">
            {shareNote && <span className="trek-share-note" role="status">{shareNote}</span>}
            <button type="button" className="trek-share-btn" onClick={shareOnWhatsApp} aria-label="Share on WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.05 4.95A9.9 9.9 0 0 0 12.02 2a9.91 9.91 0 0 0-8.48 15.06L2 22l5.13-1.35a9.9 9.9 0 0 0 4.89 1.35h.01a9.9 9.9 0 0 0 6.99-3.02 9.9 9.9 0 0 0 2.07-7.03Zm-7.03 15.3a8.18 8.18 0 0 1-4.18-1.14l-.3-.18-3.04.8.81-2.96-.2-.3A8.2 8.2 0 1 1 12.02 20.25Z" /></svg>
              WhatsApp
            </button>
            <button type="button" className="trek-share-btn" onClick={shareTrek}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" /></svg>
              Share link
            </button>
          </div>
        </div>

        {/* ================================= */}
        {/* IMAGE GALLERY */}
        {/* ================================= */}

        <section className="trek-details-gallery">

          <img
            src={images[currentImage] ?? images[0]}
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
            <RichText className="details-blurb" html={trek.blurb} />
          )}

          <div
            className={`details-info-grid details-info-grid-${infoBoxCount}`}
          >

            <div className="details-info-item">
              <span>Duration</span>
              <strong>
                {trek.duration_label || '-'}
              </strong>
            </div>

            {showsDifficulty(trek) && (
              <div className="details-info-item">
                <span>Difficulty</span>
                <strong>
                  {trek.difficulty}
                </strong>
              </div>
            )}

            {showsDistance(trek) && (
              <div className="details-info-item">
                <span>Distance</span>
                <strong>
                  {trek.distance_label}
                </strong>
              </div>
            )}

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

              <RichText className="details-description-text" html={trek.description} />

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

            {hasTerms && (
              <button
                type="button"
                className={
                  activeTab === 'terms'
                    ? 'details-tab active'
                    : 'details-tab'
                }
                onClick={() =>
                  setActiveTab('terms')
                }
              >
                Terms & Policies
              </button>
            )}

          </div>

          {/* ================================= */}
          {/* ITINERARY */}
          {/* ================================= */}

          {activeTab === 'itinerary' && (
            <div className="details-tab-content">

              <h2>Itinerary</h2>

              {trek.itinerary ? (
                <RichText className="itinerary-content" html={trek.itinerary} />
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

                  {!transportOnly && (
                    <div className="pricing-option">
                      <span>Without Transportation</span>
                      <strong>
                        ₹{new Intl.NumberFormat('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(withoutTransportPrice)}
                      </strong>
                    </div>
                  )}

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

          {/* ================================= */}
          {/* TERMS & POLICIES */}
          {/* ================================= */}

          {activeTab === 'terms' && hasTerms && (
            <TrekTerms trek={trek} terms={terms} />
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

          {/* No Book Now for featured trips (is_featured = 1) */}
          {!isFeatured && (
            <button
              type="button"
              className="trek-action-book"
              onClick={handleBookNow}
            >
              Book Now
            </button>
          )}

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