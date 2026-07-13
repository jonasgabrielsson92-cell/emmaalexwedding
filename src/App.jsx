import { useEffect, useState } from 'react';
import Countdown from './components/Countdown';
import Contacts from './components/Contacts';
import EventDetails from './components/EventDetails';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Hero from './components/Hero';
import Information from './components/Information';
import Navigation from './components/Navigation';
import RSVPForm from './components/RSVPForm';
import Story from './components/Story';
import VenueDetails from './components/VenueDetails';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Navigation menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((open) => !open)} onNavigate={() => setMenuOpen(false)} scrolled={scrolled} />
      <main>
        <Hero />
        <Countdown />
        <Story />
        <EventDetails />
        <VenueDetails />
        <Information />
        <Gallery />
        <Contacts />
        <FAQ />
        <RSVPForm />
      </main>
      <Footer />
    </>
  );
}
