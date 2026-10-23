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

const SITE_TITLE = 'The Fitness Gone Wild';

export default function Home() {

  const [selectedTrek, setSelectedTrek] = useState(null);
  const [trekMissing, setTrekMissing] = useState(false);
  const scrollBeforeDetails = useRef(0);
  const [pendingSection, setPendingSection] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  // /treks/<slug>: that trek's page (a link anyone can open)
  const { slug } = useParams();

  // Header link: leave the trek page (if open) and go to the section
  const handleNavigate = (id) => {
    setSelectedTrek(null);
    setPendingSection(id);
    if (slug) navigate('/');
  };

  // The address decides what is shown: /treks/<slug> = that trek, / = home
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
    document.title = selectedTrek ? `${selectedTrek.name} | ${SITE_TITLE}` : SITE_TITLE;
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


  // Opening a trek gives it its own address (/treks/<slug>) to copy and share
  const handleTrekSelect = (trek) => {
    scrollBeforeDetails.current = window.scrollY;
    setSelectedTrek(trek);
    navigate(`/treks/${trek.slug}`, { state: { fromList: true } });

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
                <h2>Trek not found</h2>
                <p>This trek is not available any more. Have a look at our other treks.</p>
                <button type="button" onClick={() => navigate('/#trips')}>See all treks</button>
              </>
            ) : (
              <p>Loading trek…</p>
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