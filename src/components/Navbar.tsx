import { useBrand } from '../context/BrandContext';
import { useCurrency, type CurrencyPreference } from '../context/CurrencyContext';
import { Globe, Search } from 'lucide-react';
import { SmartImage } from './SmartImage';

interface NavbarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const CURRENCY_OPTIONS: { id: CurrencyPreference; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'INR', label: '₹ INR' },
  { id: 'USD', label: '$ USD' },
];

export const Navbar: React.FC<NavbarProps> = ({ searchTerm, setSearchTerm }) => {
  const { brand, loading } = useBrand();
  const { preference, setPreference, detectedRegion } = useCurrency();

  if (loading) return null;

  // Kept to a light blur: a heavy backdrop-filter on a sticky bar forces a
  // repaint on every scroll frame, which was a real jank source.
  return (
    <nav className="sticky top-0 z-50 bg-bg-dark-start/95 backdrop-blur-sm border-b border-neon-purple/30 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <SmartImage
              src={brand.logo_url}
              alt={brand.site_name}
              className="h-12 w-12 object-contain bg-transparent border-0 shadow-none"
            />
            <span className="text-xl font-bold tracking-wider text-white">
              {brand.site_name.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end">
            {/* Currency switcher: Auto (geo-detected) or an explicit choice. */}
            <div
              className="flex items-center gap-1 bg-bg-dark-end border border-neon-purple/40 rounded-full p-1"
              title={`Prices update instantly. Auto follows your detected location (${
                detectedRegion === 'IN' ? 'India → ₹ INR' : 'International → $ USD'
              }).`}
            >
              {CURRENCY_OPTIONS.map((option) => {
                const active = preference === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setPreference(option.id)}
                    aria-pressed={active}
                    aria-label={
                      option.id === 'auto'
                        ? 'Auto-detect currency from my location'
                        : `Show prices in ${option.id}`
                    }
                    className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-neon-purple text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {option.id === 'auto' && <Globe className="w-3.5 h-3.5" />}
                    <span className={option.id === 'auto' ? 'hidden sm:inline' : ''}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative flex items-center gap-3 bg-bg-dark-end px-5 py-2 rounded-full border border-neon-purple/50">
                <Search className="w-4 h-4 text-neon-purple" />
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold placeholder-gray-400 focus:outline-none w-28"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
