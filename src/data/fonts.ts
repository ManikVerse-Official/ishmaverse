import { GreetingFont } from '../types';

/**
 * Curated typography styles for greeting cards. Each family is loaded in
 * index.html so the choice renders instantly in the viewer and live preview.
 * Keep this list in sync with ALLOWED_FONTS in the create-greeting Edge Function.
 */
export const greetingFonts: GreetingFont[] = [
  {
    id: 'classic-serif',
    label: 'Classic Serif',
    family: "'Playfair Display', Georgia, 'Times New Roman', serif",
    sample: 'Elegant & timeless',
    mood: 'Weddings, festivals, formal wishes',
  },
  {
    id: 'elegant-display',
    label: 'Elegant Display',
    family: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    sample: 'Luxury at a glance',
    mood: 'Premium & elite cards',
  },
  {
    id: 'luxe-display',
    label: 'Regal Caps',
    family: "'Cinzel', 'Playfair Display', Georgia, serif",
    sample: 'GRAND CELEBRATION',
    mood: 'Weddings, invitations, milestones',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    family: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
    sample: 'Refined and considered',
    mood: 'Anniversaries, formal notes',
  },
  {
    id: 'festive-decorative',
    label: 'Festive Decor',
    family: "'Rozha One', 'Playfair Display', Georgia, serif",
    sample: 'Shubh Deepavali',
    mood: 'Diwali, Holi, weddings, celebrations',
  },
  {
    id: 'modern-sans',
    label: 'Modern Sans',
    family: "'Inter', system-ui, -apple-system, sans-serif",
    sample: 'Clean & contemporary',
    mood: 'Congrats, milestones, corporate',
  },
  {
    id: 'clean-geometric',
    label: 'Friendly Geometric',
    family: "'Poppins', 'Inter', system-ui, sans-serif",
    sample: 'Warm and approachable',
    mood: 'Thank yous, friends, everyday wishes',
  },
  {
    id: 'bold-display',
    label: 'Bold Poster',
    family: "'Anton', 'Impact', system-ui, sans-serif",
    sample: 'HAPPY BIRTHDAY!',
    mood: 'Birthdays, parties, big announcements',
  },
  {
    id: 'romantic-script',
    label: 'Romantic Script',
    family: "'Great Vibes', 'Segoe Script', cursive",
    sample: 'With all my love',
    mood: 'Romance & anniversaries',
  },
  {
    id: 'festive-script',
    label: 'Festive Script',
    family: "'Dancing Script', 'Segoe Script', cursive",
    sample: 'Celebrate every moment',
    mood: 'Festivals, birthdays, joyful wishes',
  },
  {
    id: 'calligraphy',
    label: 'Fine Calligraphy',
    family: "'Sacramento', 'Segoe Script', cursive",
    sample: 'A little note for you',
    mood: 'Elegant personal notes, invitations',
  },
  {
    id: 'handwritten',
    label: 'Handwritten',
    family: "'Caveat', 'Segoe Script', cursive",
    sample: 'A personal note',
    mood: 'Thank yous, warm notes',
  },
  {
    id: 'playful',
    label: 'Playful Rounded',
    family: "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif",
    sample: 'Fun & joyful',
    mood: 'Birthdays, kids, celebrations',
  },
];

export const DEFAULT_FONT_ID = 'classic-serif';

/** Valid font ids — mirrors the allow-list in the create-greeting function. */
export const FONT_IDS: string[] = greetingFonts.map((font) => font.id);

export const getFontById = (id?: string): GreetingFont =>
  greetingFonts.find((font) => font.id === id) ?? greetingFonts[0];
