import { useEffect, useRef, useState } from 'react';
import { getHero } from '../../api/treks';

// Shown until the admin's heroes load (and if they cannot load).
// Each hero (slide) has its own photo, texts, buttons and stats.
const DEFAULT_TEXT = {
  eyebrow: 'Leaving Bangalore every Friday, 10:30 PM',
  headline_line1: 'Escape the routine.',
  headline_line2: 'Sleep under the Ghats.',
  primary_label: "See this month's trips",
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

// How long one hero photo takes to fade into the next (keep in step with .hero-photo in global.css)
const HERO_FADE_MS = 1200;

// The built-in slides; their photos are only used when the admin has no heroes
const defaultSlides = () => DEFAULT_SLIDES.map((sl) => ({ ...DEFAULT_TEXT, ...sl }));

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  // Until the admin's heroes arrive: the default text on the dark background,
  // without a photo, so no photo is downloaded twice
  const [heroSlides, setHeroSlides] = useState(() => defaultSlides().slice(0, 1).map((sl) => ({ ...sl, image: null })));
  const [seconds, setSeconds] = useState(4);

  // Heroes from the admin (Website Hero screen); empty fields stay empty
  useEffect(() => {
    let cancelled = false;
    getHero()
      .then((data) => {
        if (cancelled) return;
        const heroes = (data?.heroes || [])
          .filter((h) => h.image_path && h.headline_line1)
          .map((h) => ({ ...h, image: h.image_path, facts: Array.isArray(h.facts) ? h.facts : [] }));
        setHeroSlides(heroes.length ? heroes : defaultSlides());
        setCurrentSlide(0);
        if (data?.slide_seconds) setSeconds(Number(data.slide_seconds));
      })
      .catch((error) => {
        console.error('Hero could not load, showing the default:', error);
        if (!cancelled) setHeroSlides(defaultSlides());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The slides only move while the hero is on screen and the tab is open,
  // so a visitor who scrolls down or leaves does not download every photo
  const heroRef = useRef(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabOpen, setTabOpen] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const section = heroRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onChange = () => setTabOpen(!document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  const moving = onScreen && tabOpen && heroSlides.length > 1;

  /*
   * Automatically change image every few seconds (admin setting).
   */
  useEffect(() => {
    if (!moving) return undefined;
    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        (prev + 1) % heroSlides.length
      );
    }, Math.max(2, seconds || 4) * 1000);

    return () => clearInterval(interval);
  }, [heroSlides.length, seconds, moving]);

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

  // Load only the next slide's photo, while this one is showing, so it is
  // ready when the slide changes (not every photo up front)
  useEffect(() => {
    if (!moving) return;
    const next = heroSlides[(currentSlide + 1) % heroSlides.length];
    if (next?.image) new Image().src = next.image;
  }, [heroSlides, currentSlide, moving]);

  // Photo layers: the new photo fades in over the previous one (once it has
  // loaded), and each photo zooms in slowly while it shows
  const [layers, setLayers] = useState([]); // [{ id, image, ready }]
  const layerId = useRef(0);
  useEffect(() => {
    if (!slide.image) return;
    setLayers((list) => {
      if (list[list.length - 1]?.image === slide.image) return list;
      layerId.current += 1;
      return [...list.slice(-1), { id: layerId.current, image: slide.image, ready: false }];
    });
  }, [slide.image]);
  useEffect(() => {
    const top = layers[layers.length - 1];
    if (!top) return undefined;
    if (!top.ready) {
      // Shown two frames after it has loaded, so the browser has drawn it
      // see-through first and fades it in (a photo already downloaded would
      // otherwise appear at once)
      let frame;
      const show = () => {
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => setLayers((list) => list.map((l) => (l.id === top.id ? { ...l, ready: true } : l))));
        });
      };
      const img = new Image();
      img.onload = show;
      img.onerror = show;
      img.src = top.image;
      return () => { img.onload = null; img.onerror = null; cancelAnimationFrame(frame); };
    }
    if (layers.length > 1) {
      // Faded in: the photo underneath is no longer needed
      const timer = setTimeout(() => setLayers((list) => list.filter((l) => l.id === top.id)), HERO_FADE_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [layers]);
  // The zoom lasts a little longer than a slide, so it never stops while showing
  const zoomSeconds = Math.max(2, seconds || 4) + 2;

  return (
    <section
      ref={heroRef}
      className="hero"
      id="top"
    >
      {/* The photos (fading into each other), then the shade: dark on the
          left behind the text, the photo shows on the right */}
      <div className="hero-photos" aria-hidden="true">
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`hero-photo ${layer.ready ? 'is-ready' : ''}`}
            style={{ backgroundImage: `url('${layer.image}')`, animationDuration: `${zoomSeconds}s` }}
          />
        ))}
      </div>
      <div className="hero-shade" aria-hidden="true" />

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

      {/* Every hero's text is laid in the same place and only the current
          one shows: the hero is always as tall as its tallest slide, so it
          does not grow or shrink (and the photo does not jump) between slides */}
      <div className="hero-inner hero-stack">
        {heroSlides.map((text, index) => (
          <div
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            aria-hidden={index !== currentSlide}
          >
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
                  <span className="accent">{text.headline_line2}</span>
                </>
              )}
            </h1>

            {/* This hero's line under the headline (removed in the admin = not shown) */}
            {text.message ? (
              <p className="hero-sub">{text.message}</p>
            ) : (
              <div style={{ height: '22px' }} />
            )}

            <div className="hero-actions">
              {text.primary_label && (
                <a
                  className="btn btn-lg"
                  href={`#${text.primary_target || 'trips'}`}
                  tabIndex={index === currentSlide ? undefined : -1}
                >
                  {text.primary_label}
                </a>
              )}

              {text.secondary_label && (
                <a
                  className="btn-ghost"
                  href={`#${text.secondary_target || 'reviews'}`}
                  tabIndex={index === currentSlide ? undefined : -1}
                >
                  {text.secondary_label} →
                </a>
              )}
            </div>

            {text.facts?.length > 0 && (
              <ul className="hero-facts">
                {text.facts.map((fact, i) => (
                  <li key={i}>
                    <strong>{fact.value}</strong>
                    <span>{fact.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
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