import { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { SectionsGrid } from '../components/SectionsGrid';
import { Footer } from '../components/Footer';
import { Chatbot } from '../components/Chatbot';

export const Home: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark-start to-bg-dark-end">
      <Navbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <main className="pt-10 sm:pt-16">
        <Hero />
        <SectionsGrid searchTerm={searchTerm} />
      </main>
      <Footer />
      <Chatbot />
    </div>
  );
};
