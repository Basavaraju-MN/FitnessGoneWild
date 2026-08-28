import { useState } from 'react';

import Header from '../components/layout/Header';
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


  const handleTrekSelect = (trek) => {

    setSelectedTrek(trek);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  };


  const handleBack = () => {

    setSelectedTrek(null);

    setTimeout(() => {

      document
        .getElementById('trips')
        ?.scrollIntoView({
          behavior: 'smooth',
        });

    }, 100);

  };


  return (
    <>
      <Header />

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

            <FeaturedTrips />

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