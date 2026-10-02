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

/**
 * Currency chooser. Rendered once in the desktop row and once in the compact
 * mobile row, so it is extracted here instead of duplicated inline.
 */
const CurrencySwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { preference, setPreference, detectedRegion } = useCurrency();

  return (
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
              active ? 'bg-neon-purple text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {option.id === 'auto' && <Globe className="w-3.5 h-3.5" />}
            <span className={option.id === 'auto' && !compact ? 'hidden sm:inline' : ''}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const Navbar: React.FC<NavbarProps> = ({ searchTerm, setSearchTerm }) => {
  const { brand, loading } = useBrand();

  if (loading) return null;

  // Kept to a light blur: a heavy backdrop-filter on a sticky bar forces a
  // repaint on every scroll frame, which was a real jank source.
  return (
    <nav className="sticky top-0 z-50 bg-bg-dark-start/95 backdrop-blur-sm border-b border-neon-purple/30 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Phones: brand + currency on one row, full-width search on the next.
            Tablets/desktop: a single row with the brand left and controls right. */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center justify-between gap-2 sm:justify-start">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SmartImage
                src={brand.logo_url}
                alt={brand.site_name}
                className="h-9 w-9 sm:h-12 sm:w-12 object-contain bg-transparent border-0 shadow-none"
              />
              <span className="text-base sm:text-xl font-bold tracking-wider text-white truncate">
                {brand.site_name.toUpperCase()}
              </span>
            </div>

            {/* Compact currency switcher for phones only. */}
            <div className="sm:hidden shrink-0">
              <CurrencySwitcher compact />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 sm:justify-end">
            {/* Full currency switcher on tablet and up. */}
            <div className="hidden sm:block">
              <CurrencySwitcher />
            </div>

            <div className="relative group flex-1 sm:flex-none">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-purple-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative flex items-center gap-2 sm:gap-3 bg-bg-dark-end px-4 sm:px-5 py-2 rounded-full border border-neon-purple/50">
                <Search className="w-4 h-4 text-neon-purple shrink-0" />
                <input
                  type="text"
                  placeholder="SEARCH"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold placeholder-gray-400 focus:outline-none w-full sm:w-28"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
