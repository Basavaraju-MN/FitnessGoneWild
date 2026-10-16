import { useEffect, useState } from 'react';
import { getHero } from '../../api/treks';

// Shown until the admin's heroes load (and if they cannot load).
// Each hero (slide) has its own photo, texts, buttons and stats.
const DEFAULT_TEXT = {
  eyebrow: 'Leaving Bangalore every Friday, 10:30 PM',
  headline_line1: 'Escape the routine.',
  headline_line2: 'Sleep under the Ghats.',
  primary_label: "See this month's treks",
  primary_target: 'trips',
  secondary_label: 'Read 1,200+ reviews',
  secondary_target: 'reviews',
  facts: [
    { value: '25', label: 'max group size' },
    { value: '4.9', label: 'average rating' },
    { value: '300+', label: 'trips completed' },
    { value: '0', label: 'hidden charges' },
  ],
};

const DEFAULT_SLIDES = [
  {
    image: '/images/hero1.jpg',
    message: 'Chase the sunrise. Find your next adventure.',
  },
  {
    image: '/images/hero2.jpg',
    message: 'Leave the city behind. Follow the mountain trails.',
  },
  {
    image: '/images/hero3.jpg',
    message: 'Walk deeper into nature. Come back with stories.',
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState(() => DEFAULT_SLIDES.map((sl) => ({ ...DEFAULT_TEXT, ...sl })));
  const [seconds, setSeconds] = useState(4);

  // Heroes from the admin (Website Hero screen); empty fields stay empty
  useEffect(() => {
    let cancelled = false;
    getHero()
      .then((data) => {
        if (cancelled || !data) return;
        const heroes = (data.heroes || [])
          .filter((h) => h.image_path && h.headline_line1)
          .map((h) => ({ ...h, image: h.image_path, facts: Array.isArray(h.facts) ? h.facts : [] }));
        if (heroes.length) {
          setHeroSlides(heroes);
          setCurrentSlide(0);
        }
        if (data.slide_seconds) setSeconds(Number(data.slide_seconds));
      })
      .catch((error) => console.error('Hero could not load, showing the default:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Automatically change image every 5 seconds.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        (prev + 1) % heroSlides.length
      );
    }, Math.max(2, seconds || 4) * 1000);

    return () => clearInterval(interval);
  }, [heroSlides.length, seconds]);

  const handlePrevious = () => {
    setCurrentSlide((prev) =>
      prev === 0
        ? heroSlides.length - 1
        : prev - 1
    );
  };

  const handleNext = () => {
    setCurrentSlide((prev) =>
      (prev + 1) % heroSlides.length
    );
  };

  const slide = heroSlides[currentSlide] || heroSlides[0];
  const text = slide; // this hero's own texts, buttons and stats

  return (
    <section
      className="hero"
      id="top"
      style={{
        backgroundImage: `
          linear-gradient(
            180deg,
            rgba(10,43,38,.78),
            rgba(10,43,38,.55) 45%,
            rgba(10,43,38,.92)
          ),
          url('${slide.image}')
        `,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        transition: 'background-image 0.8s ease-in-out',
        position: 'relative',
      }}
    >

      {/* Previous button */}
      <button
        type="button"
        onClick={handlePrevious}
        aria-label="Previous image"
        style={{
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '32px',
          height: '32px',
          padding: 0,
          borderRadius: '50%',
          background: 'rgba(15, 61, 54, 0.35)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.35)',
          fontSize: '22px',
          lineHeight: '1',
          zIndex: 5,
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
        }}
      >
        ‹
      </button>

      {/* Next button */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next image"
        style={{
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '32px',
          height: '32px',
          padding: 0,
          borderRadius: '50%',
          background: 'rgba(15, 61, 54, 0.35)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.35)',
          fontSize: '22px',
          lineHeight: '1',
          zIndex: 5,
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
        }}
      >
        ›
      </button>

      <div className="hero-inner">

        {text.eyebrow && (
          <p className="eyebrow eyebrow-light">
            {text.eyebrow}
          </p>
        )}

        <h1>
          {text.headline_line1}
          {text.headline_line2 && (
            <>
              <br />
              {text.headline_line2}
            </>
          )}
        </h1>

        {/* This hero's line under the headline (removed in the admin = not shown) */}
        {slide.message ? (
          <p
            className="hero-sub"
            key={currentSlide}
            style={{
              transition: 'opacity 0.5s ease',
            }}
          >
            {slide.message}
          </p>
        ) : (
          <div style={{ height: '22px' }} />
        )}

        <div className="hero-actions">
          {text.primary_label && (
            <a
              className="btn btn-lg"
              href={`#${text.primary_target || 'trips'}`}
            >
              {text.primary_label}
            </a>
          )}

          {text.secondary_label && (
            <a
              className="btn-ghost"
              href={`#${text.secondary_target || 'reviews'}`}
            >
              {text.secondary_label} →
            </a>
          )}
        </div>

        {text.facts?.length > 0 && (
          <ul className="hero-facts">
            {text.facts.map((fact, index) => (
              <li key={index}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </li>
            ))}
          </ul>
        )}

      </div>

      {/* Image indicators */}
      <div
        style={{
          position: 'absolute',
          bottom: '25px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 5,
        }}
      >
        {heroSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            style={{
              width: currentSlide === index ? '28px' : '9px',
              height: '9px',
              padding: 0,
              border: 'none',
              borderRadius: '999px',
              background:
                currentSlide === index
                  ? '#fff'
                  : 'rgba(255,255,255,0.5)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

    </section>
  );
}