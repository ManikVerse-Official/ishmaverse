import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { mallSections } from '../data/sections';
import { TiltCard } from './TiltCard';

interface SectionsGridProps {
  searchTerm: string;
}

export const SectionsGrid: React.FC<SectionsGridProps> = ({ searchTerm }) => {
  const navigate = useNavigate();
  const query = searchTerm.trim().toLowerCase();

  const visibleSections = mallSections.filter(
    (section) =>
      !query ||
      section.name.toLowerCase().includes(query) ||
      section.tagline.toLowerCase().includes(query),
  );


  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Explore the Mall</h2>
            <p className="text-sm text-gray-400 mt-1">Pick a section to walk into</p>
          </div>
        </div>

        {query && (
          <button
            onClick={() => navigate(`/section/greetings?q=${encodeURIComponent(searchTerm)}`)}
            className="w-full mb-6 text-left group relative"
          >
            <div className="relative flex items-center gap-3 bg-bg-dark-end border border-neon-purple/50 rounded-2xl px-5 py-4 group-hover:border-neon-purple transition-all">
              <span className="text-sm text-gray-300">
                Looking for <span className="text-white font-semibold">"{searchTerm}"</span>? Search
                it inside Digital Greetings
              </span>
              <ArrowRight className="w-4 h-4 text-neon-purple ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {visibleSections.map((section) => (
            <TiltCard key={section.id} glow={`${section.accent}99`} className="group h-full rounded-2xl">
            <button
              onClick={() => navigate(`/section/${section.id}`)}
              className="relative text-left w-full h-full"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r ${section.gradient} rounded-2xl blur opacity-40 group-hover:opacity-80 transition duration-300`}
              />
              <div className="relative h-full flex flex-col bg-bg-dark-end border border-neon-purple/30 rounded-2xl p-6 group-hover:border-neon-purple/70 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{section.emoji}</span>
                  {!section.available && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-300 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                      <Lock className="w-3 h-3" />
                      Coming soon
                    </span>
                  )}
                  {section.available && (
                    <span
                      className="text-[11px] font-semibold uppercase tracking-wider rounded-full px-3 py-1"
                      style={{ backgroundColor: `${section.accent}22`, color: section.accent }}
                    >
                      Live now
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{section.name}</h3>
                <p className="text-sm text-gray-400 flex-grow">{section.tagline}</p>

                <div className="mt-5 flex items-center gap-2 font-semibold" style={{ color: section.accent }}>
                  <span>{section.available ? 'Enter section' : 'Preview'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
};
