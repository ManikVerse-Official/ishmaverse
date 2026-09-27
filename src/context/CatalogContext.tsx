import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { GreetingTheme, Product } from '../types';
import {
  applyThemePatches,
  buildCustomTheme,
  CatalogState,
  CustomThemeInput,
  fetchRemoteProducts,
  fetchRemoteThemeCatalog,
  fetchRemoteThemePrices,
  loadCatalogState,
  normalizeProduct,
  persistCatalogState,
  pushRemoteCustomTheme,
  pushRemoteProduct,
  pushRemoteThemeOverride,
  pushRemoteThemePrice,
  removeRemoteCustomTheme,
  removeRemoteProduct,
  removeRemoteThemePrice,
  ThemePatch,
} from '../services/catalog';

export type NewProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

interface CatalogContextType {
  /** Live, merged theme list (built-ins + admin edits + custom themes). */
  themes: GreetingTheme[];
  /** Live store product list. */
  products: Product[];
  loading: boolean;
  /** Ids of built-in themes an admin has hidden (shown so they can be restored). */
  deletedThemeIds: string[];
  /** True when an admin has deleted a built-in theme (so it can be restored). */
  isThemeDeleted: (id: string) => boolean;
  addTheme: (input: CustomThemeInput) => GreetingTheme;
  updateTheme: (id: string, patch: ThemePatch) => void;
  deleteTheme: (id: string) => void;
  restoreTheme: (id: string) => void;
  addProduct: (input: NewProductInput) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CatalogState>(() => loadCatalogState());
  const [loading, setLoading] = useState(false);

  // Persist every change locally, immediately.
  useEffect(() => {
    persistCatalogState(state);
  }, [state]);

  // Pull remote products, admin theme edits (incl. uploaded artwork), custom
  // themes and admin-set prices once, when Supabase is configured.
  useEffect(() => {
    let active = true;
    (async () => {
      const [remoteProducts, remotePrices, remoteThemeCatalog] = await Promise.all([
        fetchRemoteProducts(),
        fetchRemoteThemePrices(),
        fetchRemoteThemeCatalog(),
      ]);
      if (!active) return;
      setState((prev) => {
        const next: CatalogState = { ...prev };
        if (remoteProducts && remoteProducts.length > 0) {
          next.products = remoteProducts;
        }

        const themePatches = { ...prev.themePatches };
        if (remoteThemeCatalog) {
          // Server edits first, so any edit made in this browser still wins.
          for (const [id, override] of Object.entries(remoteThemeCatalog.overrides)) {
            themePatches[id] = { ...override.patch, ...themePatches[id] };
          }

          const byId = new Map<string, GreetingTheme>();
          for (const theme of remoteThemeCatalog.customThemes) byId.set(theme.id, theme);
          for (const theme of prev.customThemes) byId.set(theme.id, theme);
          next.customThemes = [...byId.values()];

          const deleted = new Set([
            ...prev.deletedThemeIds,
            ...Object.entries(remoteThemeCatalog.overrides)
              .filter(([, override]) => override.deleted)
              .map(([id]) => id),
          ]);
          next.deletedThemeIds = [...deleted];
        }

        if (remotePrices) {
          // Money always follows the server-side price table.
          for (const [id, price] of Object.entries(remotePrices)) {
            themePatches[id] = { ...themePatches[id], price: price.price, price_usd: price.price_usd };
          }
        }
        next.themePatches = themePatches;
        return next;
      });
    })();
    setLoading(false);
    return () => {
      active = false;
    };
  }, []);

  const themes = useMemo(() => applyThemePatches(state), [state]);

  const isThemeDeleted = useCallback(
    (id: string) => state.deletedThemeIds.includes(id),
    [state.deletedThemeIds],
  );

  const addTheme = useCallback((input: CustomThemeInput): GreetingTheme => {
    const theme = buildCustomTheme(input);
    setState((prev) => ({
      ...prev,
      customThemes: [...prev.customThemes, theme],
      deletedThemeIds: prev.deletedThemeIds.filter((id) => id !== theme.id),
    }));
    void pushRemoteThemePrice(theme.id, theme.price, theme.price_usd);
    void pushRemoteCustomTheme(theme);
    return theme;
  }, []);

  const updateTheme = useCallback((id: string, patch: ThemePatch) => {
    setState((prev) => {
      if (patch.price !== undefined || patch.price_usd !== undefined) {
        const current = applyThemePatches(prev).find((theme) => theme.id === id);
        void pushRemoteThemePrice(
          id,
          patch.price ?? current?.price ?? 0,
          patch.price_usd ?? current?.price_usd ?? 0,
        );
      }
      const isCustom = prev.customThemes.some((theme) => theme.id === id);
      if (isCustom) {
        const updated = { ...prev.customThemes.find((theme) => theme.id === id)!, ...patch };
        void pushRemoteCustomTheme(updated);
        return {
          ...prev,
          customThemes: prev.customThemes.map((theme) => (theme.id === id ? updated : theme)),
        };
      }
      const merged: ThemePatch = { ...prev.themePatches[id], ...patch };
      // Publish the edit (background artwork, colours, copy…) for every visitor.
      void pushRemoteThemeOverride(id, merged);
      return {
        ...prev,
        themePatches: { ...prev.themePatches, [id]: merged },
      };
    });
  }, []);

  const deleteTheme = useCallback((id: string) => {
    void removeRemoteThemePrice(id);
    setState((prev) => {
      const wasCustom = prev.customThemes.some((theme) => theme.id === id);
      const themePatches = { ...prev.themePatches };
      delete themePatches[id];
      if (wasCustom) {
        void removeRemoteCustomTheme(id);
      } else {
        // Hide it for visitors too, keeping any edit so a restore brings it back.
        void pushRemoteThemeOverride(id, prev.themePatches[id] ?? {}, true);
      }
      return {
        ...prev,
        customThemes: prev.customThemes.filter((theme) => theme.id !== id),
        deletedThemeIds: wasCustom
          ? prev.deletedThemeIds
          : Array.from(new Set([...prev.deletedThemeIds, id])),
        themePatches,
      };
    });
  }, []);

  const restoreTheme = useCallback((id: string) => {
    setState((prev) => {
      void pushRemoteThemeOverride(id, prev.themePatches[id] ?? {}, false);
      return {
        ...prev,
        deletedThemeIds: prev.deletedThemeIds.filter((themeId) => themeId !== id),
      };
    });
  }, []);

  const addProduct = useCallback((input: NewProductInput): Product => {
    const product = normalizeProduct({
      ...input,
      id: input.id ?? `product-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setState((prev) => ({ ...prev, products: [product, ...prev.products] }));
    void pushRemoteProduct(product);
    return product;
  }, []);

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setState((prev) => {
      const products = prev.products.map((product) =>
        product.id === id
          ? normalizeProduct({ ...product, ...patch, updated_at: new Date().toISOString() })
          : product,
      );
      const updated = products.find((product) => product.id === id);
      if (updated) void pushRemoteProduct(updated);
      return { ...prev, products };
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setState((prev) => ({ ...prev, products: prev.products.filter((product) => product.id !== id) }));
    void removeRemoteProduct(id);
  }, []);

  const value = useMemo<CatalogContextType>(
    () => ({
      themes,
      products: state.products,
      loading,
      deletedThemeIds: state.deletedThemeIds,
      isThemeDeleted,
      addTheme,
      updateTheme,
      deleteTheme,
      restoreTheme,
      addProduct,
      updateProduct,
      deleteProduct,
    }),
    [
      themes,
      state.products,
      loading,
      state.deletedThemeIds,
      isThemeDeleted,
      addTheme,
      updateTheme,
      deleteTheme,
      restoreTheme,
      addProduct,
      updateProduct,
      deleteProduct,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export const useCatalog = (): CatalogContextType => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
