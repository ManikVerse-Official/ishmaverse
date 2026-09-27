import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product } from '../types';
import {
  checkIsAdmin,
  getAdminSession,
  signOutAdmin,
  subscribeToAuthChanges,
} from '../services/adminAuth';

interface GreetingContextType {
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  /** True only when Supabase confirms the signed-in user is an admin. */
  isAdmin: boolean;
  /** True while the session/admin check is still resolving. */
  adminLoading: boolean;
  logoutAdmin: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerEmail: string;
  setCustomerEmail: (email: string) => void;
}

const GreetingContext = createContext<GreetingContextType | undefined>(undefined);

export const GreetingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(true);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  const refreshAdmin = useCallback(async () => {
    const session = await getAdminSession();
    if (!session) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(await checkIsAdmin());
  }, []);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const session = await getAdminSession();
      const admin = session ? await checkIsAdmin() : false;
      if (!active) return;
      setIsAdmin(admin);
      setAdminLoading(false);
    };

    sync();

    // A signed-in Supabase session is the only source of admin truth; there is
    // no client-side setter that a user could flip from the console.
    const unsubscribe = subscribeToAuthChanges(() => {
      sync();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const logoutAdmin = useCallback(async () => {
    await signOutAdmin();
    setIsAdmin(false);
  }, []);

  return (
    <GreetingContext.Provider
      value={{
        selectedProduct,
        setSelectedProduct,
        isAdmin,
        adminLoading,
        logoutAdmin,
        refreshAdmin,
        customerName,
        setCustomerName,
        customerEmail,
        setCustomerEmail,
      }}
    >
      {children}
    </GreetingContext.Provider>
  );
};

export const useGreeting = () => {
  const context = useContext(GreetingContext);
  if (context === undefined) {
    throw new Error('useGreeting must be used within a GreetingProvider');
  }
  return context;
};
