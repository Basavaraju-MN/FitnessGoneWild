import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import Header, { scrollToSection } from '../components/layout/Header';
import Footer from '../components/layout/Footer';

import Hero from '../components/home/Hero';
import TrekCategories from '../components/home/TrekCategories';
import FeaturedTrips from '../components/home/FeaturedTrips';
import WhyChooseUs from '../components/home/WhyChooseUs';
import Reviews from '../components/home/Reviews';
import FAQ from '../components/home/FAQ';
import ContactCTA from '../components/home/ContactCTA';

import TrekDetails from '../components/treks/TrekDetails';
import { getTrekBySlug } from '../api/treks';
import { tripPath } from '../utils/tripPricing';

const SITE_TITLE = 'The Fitness Gone Wild';
const HOME_TITLE = 'Weekend Treks & Trips from Bangalore | The Fitness Gone Wild';

export default function Home() {

  const [selectedTrek, setSelectedTrek] = useState(null);
  const [trekMissing, setTrekMissing] = useState(false);
  const scrollBeforeDetails = useRef(0);
  const [pendingSection, setPendingSection] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  // /treks/<slug> or /trips/<slug>: that trip's page (a link anyone can open)
  const { slug } = useParams();

  // Header link: leave the trek page (if open) and go to the section
  const handleNavigate = (id) => {
    setSelectedTrek(null);
    setPendingSection(id);
    if (slug) navigate('/');
  };

  // The address decides what is shown: /treks/<slug> or /trips/<slug> = that trip, / = home
  useEffect(() => {
    if (!slug) {
      setTrekMissing(false);
      if (selectedTrek) {
        // Back from a trek (button or browser): home at the same place as before
        setSelectedTrek(null);
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: scrollBeforeDetails.current, behavior: 'auto' });
        });
      }
      return undefined;
    }
    if (selectedTrek?.slug === slug) return undefined;

    // Opened from a shared link: load the trek
    const controller = new AbortController();
    setTrekMissing(false);
    getTrekBySlug(slug, { signal: controller.signal })
      .then((trek) => {
        if (trek) {
          // Treks under /treks/, other trips under /trips/: fix the address
          // when a link used the other one (e.g. an old /treks/goa link)
          if (location.pathname !== tripPath(trek)) {
            navigate(`${tripPath(trek)}${location.search}${location.hash}`, { replace: true });
          }
          setSelectedTrek(trek);
          window.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          setSelectedTrek(null);
          setTrekMissing(true);
        }
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') setTrekMissing(true);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Browser tab title: the trek's name on its page
  useEffect(() => {
    // Same titles as the server sends (utils/seo.js, trekShare.js)
    document.title = selectedTrek ? `${selectedTrek.name} | ${SITE_TITLE}` : HOME_TITLE;
  }, [selectedTrek]);

  // Opened as /#trips (e.g. from another page): go to that section
  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (id) setPendingSection(id);
  }, [location.hash]);

  // Scroll once the home sections are on screen again
  useEffect(() => {
    if (!pendingSection || selectedTrek) return undefined;
    const id = pendingSection;
    const first = setTimeout(() => scrollToSection(id), 60);
    // Treks / reviews load again and can move the sections: settle once more
    const settle = setTimeout(() => {
      if (id !== 'top') scrollToSection(id);
      setPendingSection(null);
    }, 700);
    return () => {
      clearTimeout(first);
      clearTimeout(settle);
    };
  }, [pendingSection, selectedTrek]);


  // Opening a trip gives it its own address (/treks/<slug> or /trips/<slug>) to copy and share
  const handleTrekSelect = (trek) => {
    scrollBeforeDetails.current = window.scrollY;
    setSelectedTrek(trek);
    navigate(tripPath(trek), { state: { fromList: true } });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  };


  // Back: to the list it came from, or the home page for a shared link
  const handleBack = () => {
    if (location.state?.fromList) navigate(-1);
    else navigate('/');
  };


  return (
    <>
      <Header onNavigate={handleNavigate} />

      <main>

        {selectedTrek ? (

          <TrekDetails
            trek={selectedTrek}
            onBack={handleBack}
          />

        ) : slug ? (

          // Shared link: loading the trek, or it does not exist (any more)
          <section className="section trek-link-state">
            {trekMissing ? (
              <>
                <h2>Trip not found</h2>
                <p>This trip is not available any more. Have a look at our other trips.</p>
                <button type="button" onClick={() => navigate('/#trips')}>See all trips</button>
              </>
            ) : (
              <p>Loading trip…</p>
            )}
          </section>

        ) : (

          <>
            <Hero />

            <TrekCategories
              onTrekSelect={handleTrekSelect}
            />

            <FeaturedTrips onTrekSelect={handleTrekSelect} />

            <WhyChooseUs />

            <Reviews />

            <FAQ />

            <ContactCTA />
          </>

        )}

      </main>

      <Footer />
    </>
  );
}