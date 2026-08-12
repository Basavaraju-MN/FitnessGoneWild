import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Hero from '../components/home/Hero';
import TrekCategories from '../components/home/TrekCategories';
import FeaturedTrips from '../components/home/FeaturedTrips';
import WhyChooseUs from '../components/home/WhyChooseUs';
import Reviews from '../components/home/Reviews';
import FAQ from '../components/home/FAQ';
import ContactCTA from '../components/home/ContactCTA';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrekCategories />
        <FeaturedTrips />
        <WhyChooseUs />
        <Reviews />
        <FAQ />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}
