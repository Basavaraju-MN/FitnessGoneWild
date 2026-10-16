import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

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

export default function Home() {

  const [selectedTrek, setSelectedTrek] = useState(null);
  const [scrollBeforeDetails, setScrollBeforeDetails] = useState(0);
  const [pendingSection, setPendingSection] = useState(null);
  const location = useLocation();

  // Header link: leave the trek page (if open) and go to the section
  const handleNavigate = (id) => {
    setSelectedTrek(null);
    setPendingSection(id);
  };

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


  const handleTrekSelect = (trek) => {
    setScrollBeforeDetails(window.scrollY);
    setSelectedTrek(trek);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  };


  const handleBack = () => {
    setSelectedTrek(null);

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: scrollBeforeDetails,
        behavior: 'auto',
      });
    });

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