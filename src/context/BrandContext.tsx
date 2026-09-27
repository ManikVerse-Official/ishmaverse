import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { SiteSettings } from '../types';
import ishmaverseLogo from '../ishmaverse.png';

const defaultBrand: SiteSettings = {
  id: 'default',
  site_name: 'Ishmaverse',
  brand_tagline: 'Ishmaverse Ecosystem',
  logo_url: ishmaverseLogo,
  primary_color: '#8b5cf6',
  secondary_color: '#1a0b2e',
  accept_custom_orders: true,
  unavailable_days: 0,
  minimum_budget_threshold: 1000,
  admin_notification_webhook: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface BrandContextType {
  brand: SiteSettings;
  loading: boolean;
  refreshBrand: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [brand, setBrand] = useState<SiteSettings>(defaultBrand);
  const loading = false;

  const fetchBrand = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBrand(data);
        document.title = data.site_name;
      }
    } catch (err) {
      // Ignore errors, keep using default
    }
  };

  useEffect(() => {
    fetchBrand();

    let subscription: any;
    if (!isSupabaseConfigured()) return;
    try {
      subscription = supabase
        .channel('site_settings_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, fetchBrand)
        .subscribe();
    } catch (e) {
      // Ignore subscription errors
    }

    return () => {
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (e) {
          // Ignore unsubscription errors
        }
      }
    };
  }, []);

  return (
    <BrandContext.Provider value={{ brand, loading, refreshBrand: fetchBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
