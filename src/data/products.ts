import { Product } from '../types';

/**
 * Seed products for the storefront.
 *
 * These are only the initial values used the very first time the catalog loads.
 * Every price here can be edited (or the product deleted) from the Admin Panel,
 * and the storefront reads the live catalog instead of these defaults.
 */
export const defaultProducts: Product[] = [
  {
    id: 'greeting-card',
    category_id: '7',
    name: 'Dynamic Digital Greeting Card',
    description: 'Create magical, animated greeting cards that stay live for 48 hours.',
    price: 499,
    price_inr: 499,
    price_usd: 7,
    currency: 'INR',
    download_url: '',
    product_file_url: '',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=magical%20greeting%20card%20glowing%20neon%20purple%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '1',
    category_id: '1',
    name: 'AutoCAD AI Wiring Assistant',
    description: 'Automated wiring diagrams for electrical projects',
    price: 499,
    price_inr: 499,
    price_usd: 7,
    currency: 'INR',
    download_url: 'https://example.com/download/wiring-assistant',
    product_file_url: 'https://example.com/download/wiring-assistant',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=futuristic%20brain%20neural%20network%20glowing%20neon%20purple%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    category_id: '2',
    name: '7-Day Premium Study Pack',
    description: 'Complete study materials and sample papers',
    price: 299,
    price_inr: 299,
    price_usd: 5,
    currency: 'INR',
    download_url: 'https://example.com/download/study-pack',
    product_file_url: 'https://example.com/download/study-pack',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=academic%20books%20study%20education%20glowing%20neon%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    category_id: '3',
    name: 'Digital Art Collection',
    description: 'Premium digital artwork and wallpapers',
    price: 799,
    price_inr: 799,
    price_usd: 12,
    currency: 'INR',
    download_url: 'https://example.com/download/art-collection',
    product_file_url: 'https://example.com/download/art-collection',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=original%20digital%20art%20abstract%20glowing%20neon%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    category_id: '4',
    name: 'UI Theme Kit Pro',
    description: 'Professional UI themes and design kits',
    price: 1499,
    price_inr: 1499,
    price_usd: 22,
    currency: 'INR',
    download_url: 'https://example.com/download/ui-theme-kit',
    product_file_url: 'https://example.com/download/ui-theme-kit',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=ui%20design%20themes%20web%20layouts%20glowing%20neon%20purple%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    category_id: '5',
    name: 'FX Video Effects Pack',
    description: 'Professional video effects and transitions',
    price: 2499,
    price_inr: 2499,
    price_usd: 35,
    currency: 'INR',
    download_url: 'https://example.com/download/fx-pack',
    product_file_url: 'https://example.com/download/fx-pack',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=film%20studio%20fx%20vfx%20glowing%20neon%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    category_id: '6',
    name: 'Comic Series Volume 1',
    description: 'Complete first volume of our comic series',
    price: 499,
    price_inr: 499,
    price_usd: 7,
    currency: 'INR',
    download_url: 'https://example.com/download/comic-volume1',
    product_file_url: 'https://example.com/download/comic-volume1',
    image_url:
      'https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=comic%20book%20manga%20graphic%20novel%20glowing%20neon%20cyberpunk%20style&image_size=square',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/** Store categories shared by the storefront and the admin panel. */
export interface StoreCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const storeCategories: StoreCategory[] = [
  { id: '1', name: 'Tech & AI', color: '#8b5cf6', icon: 'cpu' },
  { id: '2', name: 'Education', color: '#06b6d4', icon: 'graduation-cap' },
  { id: '3', name: 'Originals', color: '#f59e0b', icon: 'zap' },
  { id: '4', name: 'UI Themes & Scripts', color: '#ec4899', icon: 'palette' },
  { id: '5', name: 'FX / Studios', color: '#10b981', icon: 'film' },
  { id: '6', name: 'Comics', color: '#ef4444', icon: 'book' },
  { id: '7', name: 'Greetings', color: '#ec4899', icon: 'heart' },
];

export const getStoreCategoryName = (id: string): string =>
  storeCategories.find((category) => category.id === id)?.name ?? 'Uncategorised';
