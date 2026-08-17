import { useEffect, useState } from 'react';

const heroSlides = [
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
  {
    image: '/images/hero4.jpg',
    message: 'New trails. New friends. Unforgettable weekends.',
  },
  {
    image: '/images/hero5.jpg',
    message: 'The mountains are calling. Are you ready to go?',
  },
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  /*
   * Automatically change image every 5 seconds.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        (prev + 1) % heroSlides.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const slide = heroSlides[currentSlide];

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
          width: '45px',
          height: '45px',
          padding: 0,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.35)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          fontSize: '32px',
          lineHeight: '1',
          zIndex: 5,
          cursor: 'pointer',
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
          width: '45px',
          height: '45px',
          padding: 0,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.35)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.4)',
          fontSize: '32px',
          lineHeight: '1',
          zIndex: 5,
          cursor: 'pointer',
        }}
      >
        ›
      </button>

      <div className="hero-inner">

        <p className="eyebrow eyebrow-light">
          Leaving Bangalore every Friday, 10:30 PM
        </p>

        <h1>
          Escape the routine.
          <br />
          Sleep under the Ghats.
        </h1>

        {/* Dynamic trekking message */}
        <p
          className="hero-sub"
          key={currentSlide}
          style={{
            transition: 'opacity 0.5s ease',
          }}
        >
          {slide.message}
        </p>

        <div className="hero-actions">
          <a
            className="btn btn-lg"
            href="#trips"
          >
            See this month's treks
          </a>

          <a
            className="btn-ghost"
            href="#reviews"
          >
            Read 1,200+ reviews →
          </a>
        </div>

        <ul className="hero-facts">
          <li>
            <strong>25</strong>
            <span>max group size</span>
          </li>

          <li>
            <strong>4.9</strong>
            <span>average rating</span>
          </li>

          <li>
            <strong>300+</strong>
            <span>trips completed</span>
          </li>

          <li>
            <strong>0</strong>
            <span>hidden charges</span>
          </li>
        </ul>

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