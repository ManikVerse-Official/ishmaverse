import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { detectRegion, getCachedRegion, type Region } from '../services/region';

export type Currency = 'INR' | 'USD';
/** 'auto' follows the detected location; INR/USD are explicit visitor choices. */
export type CurrencyPreference = 'auto' | Currency;

const STORAGE_KEY = 'ishmaverse_currency_pref';

interface CurrencyContextType {
  /** The currency the visitor should be billed/displayed in right now. */
  currency: Currency;
  symbol: '₹' | '$';
  /** True when the resolved currency is INR (India). */
  isIndia: boolean;
  /** What the visitor picked: 'auto', 'INR' or 'USD'. */
  preference: CurrencyPreference;
  setPreference: (preference: CurrencyPreference) => void;
  /** The location the IP tracker resolved to (used by 'auto'). */
  detectedRegion: Region;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const readPreference = (): CurrencyPreference => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'INR' || raw === 'USD' || raw === 'auto') return raw;
  } catch {
    /* storage unavailable */
  }
  return 'auto';
};

/**
 * Resolves the display/charging currency.
 *
 * Default behaviour is "smart": an IP-based location tracker picks INR for
 * visitors in India and USD everywhere else. The visitor can also override it
 * from the switcher in the navbar, and that choice is remembered.
 */
export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [detectedRegion, setDetectedRegion] = useState<Region>(() => getCachedRegion());
  const [preference, setPreferenceState] = useState<CurrencyPreference>(() => readPreference());

  useEffect(() => {
    let active = true;
    detectRegion().then((resolved) => {
      if (active) setDetectedRegion(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: CurrencyPreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CurrencyContextType>(() => {
    const autoCurrency: Currency = detectedRegion === 'IN' ? 'INR' : 'USD';
    const currency: Currency = preference === 'auto' ? autoCurrency : preference;
    const isIndia = currency === 'INR';
    return {
      currency,
      symbol: isIndia ? '₹' : '$',
      isIndia,
      preference,
      setPreference,
      detectedRegion,
    };
  }, [detectedRegion, preference, setPreference]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
