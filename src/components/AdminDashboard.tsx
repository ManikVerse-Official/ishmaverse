import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Heart,
  Package,
  Tag,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  Copy,
  Search,
  Trash2,
  Edit,
  Upload,
  Save,
  X,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Sparkles,
  ImageOff,
} from 'lucide-react';
import { GreetingCard, GreetingTheme, GreetingTier, Product, Transaction } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import {
  CustomThemeInput,
  deriveUsdPrice,
  fileToDataUrl,
  getThemePriceRanges,
  shrinkImageFile,
  uploadProductImage,
  uploadThemeArtwork,
} from '../services/catalog';
import { CARD_PUBLIC_COLUMNS } from '../services/greetingService';
import { SmartImage } from './SmartImage';
import {
  ANIMATION_OPTIONS,
  GRADIENT_PRESETS,
  TIER_LABELS,
  TIER_OPTIONS,
  buildDesignForTier,
  greetingCategories,
  greetingThemes,
} from '../data/greetingThemes';
import { getStoreCategoryName, storeCategories } from '../data/products';
import { useBrand } from '../context/BrandContext';
import { useGreeting } from '../context/GreetingContext';
import { useCatalog } from '../context/CatalogContext';

type Tab = 'overview' | 'greetings' | 'products' | 'pricing' | 'transactions' | 'cards' | 'settings';

interface ThemeForm {
  name: string;
  tagline: string;
  category_id: string;
  tier: GreetingTier;
  price: number;
  price_usd: number;
  emoji: string;
  accent: string;
  gradient: string;
  animation: GreetingTheme['animation'];
  tags: string;
  artwork_url: string;
}

interface ProductForm {
  name: string;
  description: string;
  price_inr: number;
  price_usd: number;
  category_id: string;
  image_url: string;
  product_file_url: string;
}

const emptyThemeForm = (): ThemeForm => ({
  name: '',
  tagline: '',
  category_id: greetingCategories[0]?.id ?? 'romantic',
  tier: 'basic',
  price: 49,
  price_usd: 2,
  emoji: '✨',
  accent: '#8b5cf6',
  gradient: GRADIENT_PRESETS[2].value,
  animation: 'sparkles',
  tags: '',
  artwork_url: '',
});

const emptyProductForm = (): ProductForm => ({
  name: '',
  description: '',
  price_inr: 0,
  price_usd: 0,
  category_id: storeCategories[0].id,
  image_url: '',
  product_file_url: '',
});

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-300 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{hint}</p>}
  </div>
);

const inputClass =
  'w-full bg-bg-dark-start border border-neon-purple/30 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-neon-purple transition-colors';

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
    <div className="relative w-full max-w-2xl bg-gradient-to-br from-bg-dark-start to-bg-dark-end border border-neon-purple/50 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-neon-purple/20">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

/** Inline price editor — commits on blur/Enter so typing stays smooth. */
const InlinePrice: React.FC<{
  value: number;
  onCommit: (value: number) => void;
  label: string;
  currency?: 'INR' | 'USD';
}> = ({ value, onCommit, label, currency = 'INR' }) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const raw = Number(draft) || 0;
    const next = Math.max(0, currency === 'INR' ? Math.round(raw) : Math.round(raw * 100) / 100);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div
      className="relative"
      title="Edit the price, then click away or press Enter to save — it goes live instantly"
    >
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
        {currency === 'INR' ? '₹' : '$'}
      </span>
      <input
        type="number"
        min={0}
        step={currency === 'INR' ? 1 : 0.01}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        aria-label={label}
        className="w-28 bg-bg-dark-start border border-neon-purple/30 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { brand, refreshBrand } = useBrand();
  const { isAdmin, adminLoading, logoutAdmin, setCustomerName, setCustomerEmail } = useGreeting();
  const {
    themes,
    products,
    deletedThemeIds,
    addTheme,
    updateTheme,
    deleteTheme,
    restoreTheme,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<GreetingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<GreetingTheme | null>(null);
  const [themeForm, setThemeForm] = useState<ThemeForm>(emptyThemeForm());

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm());
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);

  const [brandForm, setBrandForm] = useState({
    siteName: brand.site_name,
    brandTagline: brand.brand_tagline,
    logoUrl: brand.logo_url,
  });

  useEffect(() => {
    setBrandForm({
      siteName: brand.site_name,
      brandTagline: brand.brand_tagline,
      logoUrl: brand.logo_url,
    });
  }, [brand]);

  /* Redirect non-admins out to the login screen. */
  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/admin', { replace: true });
  }, [adminLoading, isAdmin, navigate]);

  /* Ledger + cards come from Supabase when available; otherwise stay empty. */
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const [transactionsRes, cardsRes] = await Promise.all([
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('greeting_cards').select(CARD_PUBLIC_COLUMNS).order('created_at', { ascending: false }),
        ]);
        if (!active) return;
        if (!transactionsRes.error) setTransactions(transactionsRes.data || []);
        if (!cardsRes.error) setCards(cardsRes.data || []);
      } catch {
        /* offline — leave the tables empty */
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'greetings', label: 'Manage Greetings', icon: Heart },
    { id: 'products', label: 'Upload Products', icon: Package },
    { id: 'pricing', label: 'Pricing Control', icon: Tag },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'cards', label: 'Greeting Cards', icon: Sparkles },
    { id: 'settings', label: 'Site Settings', icon: Settings },
  ];

  const priceRanges = useMemo(() => getThemePriceRanges(themes), [themes]);

  const filteredThemes = useMemo(
    () =>
      themes.filter(
        (theme) =>
          !searchTerm ||
          theme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          theme.tagline.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [themes, searchTerm],
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          !searchTerm ||
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [products, searchTerm],
  );

  const filteredTransactions = transactions.filter(
    (tx) =>
      tx.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.client_email ?? '').toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCards = cards.filter(
    (card) =>
      card.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalRevenue = transactions.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);

  /* ----------------------------- actions ----------------------------- */

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/greet/${id}`);
  };

  const handleGenerateCard = () => {
    setCustomerName('Admin');
    setCustomerEmail('admin@ishmaverse.com');
    navigate('/create-greeting');
  };

  const openThemeModal = (theme?: GreetingTheme) => {
    if (theme) {
      setEditingTheme(theme);
      setThemeForm({
        name: theme.name,
        tagline: theme.tagline,
        category_id: theme.category_id,
        tier: theme.tier,
        price: theme.price,
        price_usd: theme.price_usd ?? deriveUsdPrice(theme.price),
        emoji: theme.emoji,
        accent: theme.accent,
        gradient: theme.gradient,
        animation: theme.animation,
        tags: theme.tags.join(', '),
        artwork_url: theme.artwork_url ?? '',
      });
    } else {
      setEditingTheme(null);
      setThemeForm(emptyThemeForm());
    }
    setThemeModalOpen(true);
  };

  const saveTheme = () => {
    const tags = themeForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (editingTheme) {
      const patch: Parameters<typeof updateTheme>[1] = {
        name: themeForm.name.trim(),
        tagline: themeForm.tagline.trim(),
        category_id: themeForm.category_id,
        tier: themeForm.tier,
        price: Number(themeForm.price) || 0,
        price_usd: Number(themeForm.price_usd) || 0,
        emoji: themeForm.emoji,
        accent: themeForm.accent,
        gradient: themeForm.gradient,
        animation: themeForm.animation,
        tags,
        artwork_url: themeForm.artwork_url.trim() || undefined,
      };
      // Rebuild the rendered-card design when the tier or accent changes.
      if (
        editingTheme.id.startsWith('custom') ||
        editingTheme.tier !== themeForm.tier ||
        editingTheme.accent !== themeForm.accent
      ) {
        patch.design = buildDesignForTier(themeForm.tier, themeForm.accent);
      }
      updateTheme(editingTheme.id, patch);
    } else {
      const input: CustomThemeInput = {
        name: themeForm.name,
        tagline: themeForm.tagline,
        category_id: themeForm.category_id,
        tier: themeForm.tier,
        price: Number(themeForm.price) || 0,
        price_usd: Number(themeForm.price_usd) || 0,
        emoji: themeForm.emoji,
        accent: themeForm.accent,
        gradient: themeForm.gradient,
        animation: themeForm.animation,
        tags,
        artwork_url: themeForm.artwork_url.trim() || undefined,
      };
      addTheme(input);
    }
    setThemeModalOpen(false);
  };

  const confirmDeleteTheme = (theme: GreetingTheme) => {
    if (
      !confirm(
        `Delete "${theme.name}"? It will be removed from the live website immediately. Built-in themes can be restored later.`,
      )
    )
      return;
    deleteTheme(theme.id);
  };

  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description,
        price_inr: product.price_inr ?? product.price ?? 0,
        price_usd: product.price_usd ?? deriveUsdPrice(product.price_inr ?? product.price ?? 0),
        category_id: product.category_id,
        image_url: product.image_url ?? '',
        product_file_url: product.product_file_url ?? '',
      });
    } else {
      setEditingProduct(null);
      setProductForm(emptyProductForm());
    }
    setThumbnailFile(null);
    setProductModalOpen(true);
  };

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const url = isSupabaseConfigured()
        ? await uploadProductImage(file)
        : await fileToDataUrl(file);
      setProductForm((form) => ({ ...form, image_url: url }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not process that image.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleArtworkUpload = async (file: File) => {
    setUploadingArtwork(true);
    try {
      // Shrink big photos first so the card loads fast and never bloats storage.
      const prepared = await shrinkImageFile(file);
      const url = isSupabaseConfigured()
        ? await uploadThemeArtwork(prepared)
        : await fileToDataUrl(prepared);
      setThemeForm((form) => ({ ...form, artwork_url: url }));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not process that image.');
    } finally {
      setUploadingArtwork(false);
    }
  };

  const saveProduct = () => {
    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      price: Number(productForm.price_inr) || 0,
      price_inr: Number(productForm.price_inr) || 0,
      price_usd: Number(productForm.price_usd) || 0,
      category_id: productForm.category_id,
      image_url: productForm.image_url,
      product_file_url: productForm.product_file_url,
      download_url: productForm.product_file_url,
      currency: 'INR' as const,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
    } else {
      addProduct(payload);
    }
    setProductModalOpen(false);
  };

  const confirmDeleteProduct = (product: Product) => {
    if (!confirm(`Delete "${product.name}"? It will be removed from the storefront immediately.`))
      return;
    deleteProduct(product.id);
  };

  const saveBranding = async () => {
    if (!isSupabaseConfigured()) {
      alert('Brand settings are stored in Supabase. Connect a project to edit them.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({
          site_name: brandForm.siteName,
          brand_tagline: brandForm.brandTagline,
          logo_url: brandForm.logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brand.id);
      if (error) throw error;
      await refreshBrand();
      alert('Branding saved.');
    } catch {
      alert('Could not save branding. Check your Supabase connection.');
    } finally {
      setBusy(false);
    }
  };

  if (adminLoading || (!isAdmin && !adminLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg-dark-start to-bg-dark-end flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full" />
      </div>
    );
  }

  const searchPlaceholder =
    activeTab === 'products' || activeTab === 'pricing'
      ? 'Search products...'
      : activeTab === 'transactions'
        ? 'Search transactions...'
        : activeTab === 'cards'
          ? 'Search cards...'
          : 'Search themes...';

  const showSearch = ['greetings', 'products', 'pricing', 'transactions', 'cards'].includes(activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark-start to-bg-dark-end lg:flex">
      {/* Sidebar */}
      <aside className="lg:w-72 lg:min-h-screen bg-bg-dark-end/60 lg:border-r border-b lg:border-b-0 border-neon-purple/20 lg:flex lg:flex-col">
        <div className="p-6 border-b border-neon-purple/20 flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-neon-purple" />
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">Admin Panel</h1>
            <p className="text-xs text-gray-500">Dynamic control center</p>
          </div>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? 'bg-neon-purple/15 border border-neon-purple text-neon-purple'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 lg:mt-auto border-t border-neon-purple/20">
          <button
            onClick={() => {
              void logoutAdmin();
              navigate('/');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 pt-24 lg:pt-10 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === 'overview' && 'A quick snapshot of your live catalog and sales.'}
                {activeTab === 'greetings' && 'Add, edit, price or remove any greeting theme.'}
                {activeTab === 'products' && 'Upload and manage every store product.'}
                {activeTab === 'pricing' && 'Set every price in one place — changes go live instantly.'}
                {activeTab === 'transactions' && 'Every settled payment on the ledger.'}
                {activeTab === 'cards' && 'All generated greeting cards and their share links.'}
                {activeTab === 'settings' && 'Brand name, tagline and logo.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {showSearch && (
                <div className="relative" title={searchPlaceholder}>
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-bg-dark-end border border-neon-purple/30 rounded-xl text-white text-sm focus:outline-none focus:border-neon-purple w-52"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Revenue"
                  value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                  icon={<TrendingUp className="w-5 h-5 text-green-400" />}
                />
                <StatCard
                  label="Settled Payments"
                  value={String(transactions.length)}
                  icon={<DollarSign className="w-5 h-5 text-yellow-400" />}
                />
                <StatCard
                  label="Greeting Themes"
                  value={String(themes.length)}
                  icon={<Heart className="w-5 h-5 text-pink-400" />}
                />
                <StatCard
                  label="Store Products"
                  value={String(products.length)}
                  icon={<Package className="w-5 h-5 text-blue-400" />}
                />
              </div>

              <div className="bg-bg-dark-end border border-neon-purple/30 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-1">Live pricing</h3>
                <p className="text-sm text-gray-400">
                  Greeting cards currently range from{' '}
                  <span className="text-neon-purple font-semibold">
                    ₹{priceRanges.inrMin}–₹{priceRanges.inrMax}
                  </span>{' '}
                  in India and{' '}
                  <span className="text-neon-purple font-semibold">
                    ${priceRanges.usdMin}–${priceRanges.usdMax}
                  </span>{' '}
                  internationally. Both prices are editable per item in Pricing Control.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => openThemeModal()}
                  className="flex items-center gap-2 px-5 py-3 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New greeting theme
                </button>
                <button
                  onClick={() => openProductModal()}
                  className="flex items-center gap-2 px-5 py-3 border border-neon-purple/50 text-neon-purple rounded-xl font-semibold hover:bg-neon-purple/10 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  Upload product
                </button>
                <button
                  onClick={handleGenerateCard}
                  className="flex items-center gap-2 px-5 py-3 border border-gray-700 text-gray-300 rounded-xl font-semibold hover:border-gray-500 hover:text-white transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate free card
                </button>
              </div>
            </div>
          )}

          {/* Manage Greetings */}
          {activeTab === 'greetings' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-400">
                  {filteredThemes.length} theme{filteredThemes.length === 1 ? '' : 's'} live. Prices
                  update on the website the moment you edit them.
                </p>
                <button
                  onClick={() => openThemeModal()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add theme
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="group bg-bg-dark-end border border-neon-purple/25 rounded-2xl p-4 flex gap-4 transition-all hover:border-neon-purple/60"
                  >
                    <div
                      className="relative w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-3xl overflow-hidden"
                      style={{ background: `linear-gradient(140deg, ${theme.design.surface.join(', ')})` }}
                    >
                      {theme.artwork_url && (
                        <SmartImage
                          src={theme.artwork_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <span className="relative drop-shadow">{theme.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">{theme.name}</h3>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                          style={{ background: `${theme.accent}22`, color: theme.accent }}
                        >
                          {TIER_LABELS[theme.tier]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{theme.tagline}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <InlinePrice
                          value={theme.price}
                          onCommit={(price) => updateTheme(theme.id, { price })}
                          label={`INR price for ${theme.name}`}
                        />
                        <InlinePrice
                          value={theme.price_usd ?? 0}
                          currency="USD"
                          onCommit={(price_usd) => updateTheme(theme.id, { price_usd })}
                          label={`USD price for ${theme.name}`}
                        />
                        <button
                          onClick={() => openThemeModal(theme)}
                          title="Edit this theme's details and design"
                          className="p-2 rounded-lg bg-purple-600/15 border border-neon-purple/40 text-neon-purple hover:bg-purple-600/25 transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDeleteTheme(theme)}
                          title="Delete this theme from the live website"
                          className="p-2 rounded-lg bg-red-600/15 border border-red-600/40 text-red-400 hover:bg-red-600/25 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {deletedThemeIds.length > 0 && (
                <div className="bg-bg-dark-end border border-yellow-500/30 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-yellow-200 mb-1">Hidden built-in themes</h3>
                  <p className="text-xs text-gray-400 mb-3">
                    These were removed from the storefront. Click restore to bring one back.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {deletedThemeIds.map((id) => {
                      const original = greetingThemes.find((theme) => theme.id === id);
                      return (
                        <button
                          key={id}
                          onClick={() => restoreTheme(id)}
                          title="Restore this theme to the live website"
                          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {original ? `${original.emoji} ${original.name}` : id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Products */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-gray-400">
                  {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} in the
                  storefront.
                </p>
                <button
                  onClick={() => openProductModal()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add product
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-bg-dark-end border border-neon-purple/25 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-neon-purple/70 hover:shadow-neon"
                  >
                    <div className="relative h-40 bg-bg-dark-start overflow-hidden">
                      {product.image_url ? (
                        <SmartImage
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <ImageOff className="w-8 h-8" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 text-gray-200">
                        {getStoreCategoryName(product.category_id)}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white mb-1 truncate">{product.name}</h3>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{product.description}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <InlinePrice
                            value={product.price_inr ?? product.price}
                            onCommit={(price) => updateProduct(product.id, { price, price_inr: price })}
                            label={`INR price for ${product.name}`}
                          />
                          <InlinePrice
                            value={product.price_usd ?? 0}
                            currency="USD"
                            onCommit={(price_usd) => updateProduct(product.id, { price_usd })}
                            label={`USD price for ${product.name}`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openProductModal(product)}
                            title="Edit this product"
                            className="p-2 rounded-lg bg-purple-600/15 border border-neon-purple/40 text-neon-purple hover:bg-purple-600/25 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => confirmDeleteProduct(product)}
                            title="Delete this product"
                            className="p-2 rounded-lg bg-red-600/15 border border-red-600/40 text-red-400 hover:bg-red-600/25 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Control */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 bg-neon-purple/10 border border-neon-purple/30 rounded-2xl px-5 py-4">
                <DollarSign className="w-5 h-5 text-neon-purple shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">
                  Set both the INR and USD price for every item. Type an amount and click away (or
                  press Enter) to save — it goes live immediately. Indian visitors see ₹ and pay via
                  Razorpay; everyone else sees $ and pays via PayPal.
                </p>
              </div>

              <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-neon-purple/20 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <h3 className="font-semibold text-white">Greeting theme prices</h3>
                </div>
                <div className="divide-y divide-neon-purple/10">
                  {filteredThemes.map((theme) => (
                    <div key={theme.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl">{theme.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{theme.name}</div>
                          <div className="text-[11px] text-gray-500">
                            {TIER_LABELS[theme.tier]} · {greetingCategories.find((c) => c.id === theme.category_id)?.name ?? 'Uncategorised'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <InlinePrice
                          value={theme.price}
                          onCommit={(price) => updateTheme(theme.id, { price })}
                          label={`INR price for ${theme.name}`}
                        />
                        <InlinePrice
                          value={theme.price_usd ?? 0}
                          currency="USD"
                          onCommit={(price_usd) => updateTheme(theme.id, { price_usd })}
                          label={`USD price for ${theme.name}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-neon-purple/20 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Product prices</h3>
                </div>
                <div className="divide-y divide-neon-purple/10">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{product.name}</div>
                        <div className="text-[11px] text-gray-500">
                          {getStoreCategoryName(product.category_id)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <InlinePrice
                          value={product.price_inr ?? product.price}
                          onCommit={(price) => updateProduct(product.id, { price, price_inr: price })}
                          label={`INR price for ${product.name}`}
                        />
                        <InlinePrice
                          value={product.price_usd ?? 0}
                          currency="USD"
                          onCommit={(price_usd) => updateProduct(product.id, { price_usd })}
                          label={`USD price for ${product.name}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Transactions */}
          {activeTab === 'transactions' && (
            <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl overflow-hidden">
              {!isSupabaseConfigured() && (
                <p className="px-5 py-3 text-xs text-yellow-200 bg-yellow-500/10 border-b border-yellow-500/20">
                  Connect Supabase to see live payments here.
                </p>
              )}
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin w-10 h-10 border-4 border-neon-purple border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        {['Client', 'Email', 'Product', 'Payment ID', 'Date'].map((heading) => (
                          <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neon-purple/10">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5">
                          <td className="px-5 py-3 text-white text-sm">{tx.client_name}</td>
                          <td className="px-5 py-3 text-gray-400 text-sm">{tx.client_email}</td>
                          <td className="px-5 py-3 text-white text-sm">{tx.product_name}</td>
                          <td className="px-5 py-3 text-gray-400 text-sm">{tx.payment_id}</td>
                          <td className="px-5 py-3 text-gray-500 text-sm">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-gray-500 text-sm">
                            No transactions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Greeting Cards */}
          {activeTab === 'cards' && (
            <div className="space-y-4">
              <button
                onClick={handleGenerateCard}
                className="flex items-center gap-2 px-5 py-2.5 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Generate free card
              </button>
              <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5">
                      <tr>
                        {['Sender', 'Receiver', 'Theme', 'Created', 'Link'].map((heading) => (
                          <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neon-purple/10">
                      {filteredCards.map((card) => (
                        <tr key={card.id} className="hover:bg-white/5">
                          <td className="px-5 py-3 text-white text-sm">{card.sender_name}</td>
                          <td className="px-5 py-3 text-gray-400 text-sm">{card.receiver_name}</td>
                          <td className="px-5 py-3 text-white text-sm">{card.theme}</td>
                          <td className="px-5 py-3 text-gray-500 text-sm">
                            {new Date(card.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => copyLink(card.id)}
                              title="Copy the shareable link for this card"
                              className="flex items-center gap-1.5 text-neon-purple hover:text-purple-300 text-sm transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCards.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-gray-500 text-sm">
                            No greeting cards yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Site Settings */}
          {activeTab === 'settings' && (
            <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl p-6 max-w-2xl space-y-5">
              <Field label="Brand name" hint="Shown in the navbar, the hero and the card watermark.">
                <input
                  type="text"
                  value={brandForm.siteName}
                  onChange={(e) => setBrandForm({ ...brandForm, siteName: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Brand tagline" hint="A short line that appears under your brand name.">
                <input
                  type="text"
                  value={brandForm.brandTagline}
                  onChange={(e) => setBrandForm({ ...brandForm, brandTagline: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Logo URL" hint="Paste a hosted image URL for your logo.">
                <input
                  type="text"
                  value={brandForm.logoUrl}
                  onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <button
                onClick={() => void saveBranding()}
                disabled={busy}
                className="flex items-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {busy ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Theme modal */}
      {themeModalOpen && (
        <Modal
          title={editingTheme ? 'Edit greeting theme' : 'Add greeting theme'}
          onClose={() => setThemeModalOpen(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Theme name">
                <input
                  type="text"
                  value={themeForm.name}
                  onChange={(e) => setThemeForm({ ...themeForm, name: e.target.value })}
                  placeholder="e.g. Midnight Proposal"
                  className={inputClass}
                />
              </Field>
              <Field label="Emoji">
                <input
                  type="text"
                  value={themeForm.emoji}
                  onChange={(e) => setThemeForm({ ...themeForm, emoji: e.target.value })}
                  placeholder="✨"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Tagline" hint="One short line describing the theme.">
              <input
                type="text"
                value={themeForm.tagline}
                onChange={(e) => setThemeForm({ ...themeForm, tagline: e.target.value })}
                placeholder="Cinematic particles and a letter-by-letter reveal"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Category">
                <select
                  value={themeForm.category_id}
                  onChange={(e) => setThemeForm({ ...themeForm, category_id: e.target.value })}
                  className={inputClass}
                >
                  {greetingCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.emoji} {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tier" hint="Higher tiers render richer designs.">
                <select
                  value={themeForm.tier}
                  onChange={(e) => setThemeForm({ ...themeForm, tier: e.target.value as GreetingTier })}
                  className={inputClass}
                >
                  {TIER_OPTIONS.map((tier) => (
                    <option key={tier} value={tier}>
                      {TIER_LABELS[tier]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Price in INR (₹)" hint="Charged to Indian buyers via Razorpay.">
                <input
                  type="number"
                  min={0}
                  value={themeForm.price}
                  onChange={(e) => setThemeForm({ ...themeForm, price: Number(e.target.value) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Price in USD ($)" hint="Charged to overseas buyers via PayPal.">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={themeForm.price_usd}
                  onChange={(e) => setThemeForm({ ...themeForm, price_usd: Number(e.target.value) })}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Accent colour" hint="Used for glow, borders and the price label.">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeForm.accent}
                    onChange={(e) => setThemeForm({ ...themeForm, accent: e.target.value })}
                    className="h-10 w-14 bg-transparent border border-neon-purple/30 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={themeForm.accent}
                    onChange={(e) => setThemeForm({ ...themeForm, accent: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </Field>
              <Field label="Gradient">
                <select
                  value={themeForm.gradient}
                  onChange={(e) => setThemeForm({ ...themeForm, gradient: e.target.value })}
                  className={inputClass}
                >
                  {GRADIENT_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Animation">
                <select
                  value={themeForm.animation}
                  onChange={(e) =>
                    setThemeForm({ ...themeForm, animation: e.target.value as GreetingTheme['animation'] })
                  }
                  className={inputClass}
                >
                  {ANIMATION_OPTIONS.map((animation) => (
                    <option key={animation} value={animation}>
                      {animation}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Search tags" hint="Comma separated keywords customers can search.">
                <input
                  type="text"
                  value={themeForm.tags}
                  onChange={(e) => setThemeForm({ ...themeForm, tags: e.target.value })}
                  placeholder="romantic, propose, premium"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field
              label="Background artwork (optional)"
              hint={
                isSupabaseConfigured()
                  ? 'Upload a full-card illustration or photo — it is stored in Supabase Storage and shown behind the text with a readability scrim.'
                  : 'Upload a full-card illustration or photo. It is embedded locally until you connect Supabase.'
              }
            >
              {themeForm.artwork_url && (
                <SmartImage
                  src={themeForm.artwork_url}
                  alt="Artwork preview"
                  className="w-full h-40 object-cover rounded-xl mb-3 border border-neon-purple/30"
                />
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <div
                  onClick={() => document.getElementById('theme-artwork-input')?.click()}
                  className="flex-1 border-2 border-dashed border-neon-purple/30 rounded-xl p-4 text-center cursor-pointer hover:border-neon-purple transition-colors"
                >
                  {uploadingArtwork ? (
                    <div className="w-6 h-6 border-2 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <Upload className="w-5 h-5" />
                      {themeForm.artwork_url ? 'Replace artwork' : 'Upload artwork'}
                    </div>
                  )}
                  <input
                    id="theme-artwork-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleArtworkUpload(file);
                    }}
                  />
                </div>
                {themeForm.artwork_url && (
                  <button
                    type="button"
                    onClick={() => setThemeForm({ ...themeForm, artwork_url: '' })}
                    className="px-4 py-3 rounded-xl border border-red-600/40 text-red-400 text-sm font-semibold hover:bg-red-600/15 transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                value={themeForm.artwork_url.startsWith('data:') ? '' : themeForm.artwork_url}
                onChange={(e) => setThemeForm({ ...themeForm, artwork_url: e.target.value })}
                placeholder="…or paste a hosted image URL"
                className={`${inputClass} mt-2`}
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setThemeModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-700 rounded-xl text-gray-400 hover:border-gray-600 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveTheme}
                disabled={!themeForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                Save theme
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Product modal */}
      {productModalOpen && (
        <Modal
          title={editingProduct ? 'Edit product' : 'Upload product'}
          onClose={() => setProductModalOpen(false)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <Field label="Product name">
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. AutoCAD AI Wiring Assistant"
                className={inputClass}
              />
            </Field>

            <Field label="Description" hint="A short summary shown on the product card.">
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
                placeholder="What the customer gets"
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Price in INR (₹)" hint="Charged to Indian buyers via Razorpay.">
                <input
                  type="number"
                  min={0}
                  value={productForm.price_inr}
                  onChange={(e) => setProductForm({ ...productForm, price_inr: Number(e.target.value) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Price in USD ($)" hint="Charged to overseas buyers via PayPal.">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={productForm.price_usd}
                  onChange={(e) => setProductForm({ ...productForm, price_usd: Number(e.target.value) })}
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className={inputClass}
                >
                  {storeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="Product file URL"
              hint="The download link delivered after purchase (Google Drive, Mega, etc.)."
            >
              <input
                type="url"
                value={productForm.product_file_url}
                onChange={(e) => setProductForm({ ...productForm, product_file_url: e.target.value })}
                placeholder="https://example.com/product.zip"
                className={inputClass}
              />
            </Field>

            <Field
              label="Thumbnail"
              hint={
                isSupabaseConfigured()
                  ? 'Upload an image — it is stored in Supabase Storage.'
                  : 'Upload an image — it is embedded locally until you connect Supabase.'
              }
            >
              {productForm.image_url && (
                <SmartImage
                  src={productForm.image_url}
                  alt="Thumbnail preview"
                  className="w-full h-40 object-cover rounded-xl mb-3"
                />
              )}
              <div
                onClick={() => document.getElementById('admin-thumbnail-input')?.click()}
                className="border-2 border-dashed border-neon-purple/30 rounded-xl p-5 text-center cursor-pointer hover:border-neon-purple transition-colors"
              >
                {uploadingThumbnail ? (
                  <div className="w-6 h-6 border-2 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Upload className="w-5 h-5" />
                    {thumbnailFile ? thumbnailFile.name : 'Click to upload a thumbnail'}
                  </div>
                )}
                <input
                  id="admin-thumbnail-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setThumbnailFile(file);
                      void handleThumbnailUpload(file);
                    }
                  }}
                />
              </div>
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setProductModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-700 rounded-xl text-gray-400 hover:border-gray-600 hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={!productForm.name.trim() || uploadingThumbnail}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-neon-purple text-white rounded-xl font-semibold hover:bg-purple-600 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                Save product
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="bg-bg-dark-end border border-neon-purple/25 rounded-2xl p-5">
    <div className="flex items-center gap-2 mb-2">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400 mt-0.5">{label}</div>
  </div>
);
