import { useMemo, useState } from 'react';
import { Cpu, GraduationCap, Zap, Palette, Film, BookOpen, Heart } from 'lucide-react';
import { Product } from '../types';
import { CheckoutModal } from './CheckoutModal';
import { TiltCard } from './TiltCard';
import { SmartImage } from './SmartImage';
import { useCatalog } from '../context/CatalogContext';
import { storeCategories } from '../data/products';
import { productPriceForRegion } from '../services/catalog';
import { useCurrency } from '../context/CurrencyContext';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '1': <Cpu className="w-6 h-6" />,
  '2': <GraduationCap className="w-6 h-6" />,
  '3': <Zap className="w-6 h-6" />,
  '4': <Palette className="w-6 h-6" />,
  '5': <Film className="w-6 h-6" />,
  '6': <BookOpen className="w-6 h-6" />,
  '7': <Heart className="w-6 h-6" />,
};

const KEYWORDS = [
  'ishma', 'verse', 'ishmaverse', 'ecosystem', 'digital mall', 'digital shop', 'asset store', 'premium',
  'originals', 'autocad', 'scripts', 'py', 'python', 'electrical', 'coding', 'wiring', 'auto-wiring',
  'assistant', 'micodem', 'open-cuak', 'cad scripts', 'automation', 'notes', 'sample papers', 'student projects',
  'edu', 'study material', 'question bank', 'academic', 'results', 'comic', 'comics', 'manga', 'book series',
  'premiere', 'fx', 'studios', 'graphic novel', 'digital art', 'artwork', 'images', 'wallpaper', 'pod',
  'print on demand', 'figma', 'ui themes', 'web layouts', 'design kits', 'tshirt design', 'mockups',
  'digital gifts', 'portfolios', 'subdomain factory', 'custom gift', 'romantic gift', 'web profile', 'greeting', 'card',
];

interface CategoriesProps {
  searchTerm: string;
}

export const Categories: React.FC<CategoriesProps> = ({ searchTerm }) => {
  const { products } = useCatalog();
  const [selectedProduct, setSelectedProduct] = useState<
    (Product & { displayPrice: number; displayCurrency: 'INR' | 'USD' }) | null
  >(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { isIndia: isIndiaRegion, currency, symbol: currencySymbol } = useCurrency();

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) => {
      const category = storeCategories.find((c) => c.id === product.category_id);
      return (
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        (category?.name.toLowerCase().includes(term) ?? false) ||
        KEYWORDS.some((keyword) => keyword.toLowerCase().includes(term))
      );
    });
  }, [products, searchTerm]);

  const handleBuyProduct = (product: Product) => {
    setSelectedProduct({
      ...product,
      displayPrice: productPriceForRegion(product, isIndiaRegion),
      displayCurrency: currency,
    });
    setIsCheckoutOpen(true);
  };

  return (
    <>
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7">
          {filteredProducts.map((product) => {
            const category = storeCategories.find((c) => c.id === product.category_id);
            const displayPrice = productPriceForRegion(product, isIndiaRegion);

            return (
              <TiltCard
                key={product.id}
                glow="rgba(139, 92, 246, 0.55)"
                className="group h-full rounded-2xl"
              >
                <div className="relative h-full rounded-2xl overflow-hidden bg-bg-dark-end border border-neon-purple/30 group-hover:border-neon-purple/80 transition-colors">
                  <div className="relative rounded-xl overflow-hidden m-2">
                    <SmartImage
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-44 sm:h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-dark-end via-bg-dark-end/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                      {category && (
                        <div
                          className="p-2 rounded-full"
                          style={{ backgroundColor: `${category.color}20`, color: category.color }}
                        >
                          {CATEGORY_ICONS[category.id]}
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-white">{category?.name}</h3>
                    </div>
                  </div>

                  <div className="px-4 pb-4 flex flex-col">
                    <h4 className="text-lg font-semibold text-white mb-1">{product.name}</h4>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-2xl font-black bg-gradient-to-r from-neon-purple to-purple-400 bg-clip-text text-transparent">
                        {currencySymbol}
                        {displayPrice}
                      </span>
                      <button onClick={() => handleBuyProduct(product)} className="group/btn relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-purple via-purple-500 to-neon-purple rounded-lg blur opacity-50 group-hover/btn:opacity-100 transition duration-300" />
                        <div className="relative bg-bg-dark-end border border-neon-purple rounded-lg px-4 py-2 font-semibold text-white transition-all duration-300">
                          Buy Now
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {selectedProduct && (
        <CheckoutModal
          product={{
            ...selectedProduct,
            price: selectedProduct.displayPrice,
            currency: selectedProduct.displayCurrency,
            download_url: selectedProduct.product_file_url || selectedProduct.download_url || '',
          }}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}
    </>
  );
};
