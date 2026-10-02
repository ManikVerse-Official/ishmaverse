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

  /* ---- Extra faces — wider variety of looks for every occasion ---- */
  {
    id: 'marcellus',
    label: 'Marcellus',
    family: "'Marcellus', 'Playfair Display', Georgia, serif",
    sample: 'Grace in every word',
    mood: 'Invitations, elegant formal wishes',
  },
  {
    id: 'dm-serif',
    label: 'DM Serif',
    family: "'DM Serif Display', 'Playfair Display', Georgia, serif",
    sample: 'Timeless sophistication',
    mood: 'Weddings, anniversaries, luxury',
  },
  {
    id: 'yeseva',
    label: 'Yeseva Display',
    family: "'Yeseva One', 'Playfair Display', Georgia, serif",
    sample: 'Celebrate in style',
    mood: 'Festivals, milestones, bold elegance',
  },
  {
    id: 'lora',
    label: 'Lora',
    family: "'Lora', Georgia, 'Times New Roman', serif",
    sample: 'Warm and well-read',
    mood: 'Personal notes, anniversaries',
  },
  {
    id: 'josefin',
    label: 'Josefin',
    family: "'Josefin Sans', 'Poppins', system-ui, sans-serif",
    sample: 'Graceful modern',
    mood: 'Congrats, invitations, minimal cards',
  },
  {
    id: 'outfit',
    label: 'Outfit',
    family: "'Outfit', 'Inter', system-ui, sans-serif",
    sample: 'Fresh and contemporary',
    mood: 'Corporate, milestones, everyday',
  },
  {
    id: 'fredoka',
    label: 'Fredoka',
    family: "'Fredoka', 'Baloo 2', system-ui, sans-serif",
    sample: 'Bubbly and cheerful',
    mood: 'Kids, birthdays, fun wishes',
  },
  {
    id: 'bebas',
    label: 'Bebas Headline',
    family: "'Bebas Neue', 'Anton', Impact, sans-serif",
    sample: 'BIG BOLD WISHES',
    mood: 'Parties, announcements, posters',
  },
  {
    id: 'satisfy',
    label: 'Satisfy Script',
    family: "'Satisfy', 'Segoe Script', cursive",
    sample: 'Just for you',
    mood: 'Romance, friendly notes',
  },
  {
    id: 'kaushan',
    label: 'Kaushan Script',
    family: "'Kaushan Script', 'Segoe Script', cursive",
    sample: 'Every moment counts',
    mood: 'Festivals, birthdays, joyful wishes',
  },
  {
    id: 'parisienne',
    label: 'Parisienne',
    family: "'Parisienne', 'Segoe Script', cursive",
    sample: 'A touch of Paris',
    mood: 'Weddings, elegant notes, romance',
  },
  {
    id: 'permanent-marker',
    label: 'Marker',
    family: "'Permanent Marker', 'Comic Sans MS', cursive",
    sample: 'Hand-drawn vibes',
    mood: 'Fun, casual, kids, friends',
  },
];

export const DEFAULT_FONT_ID = 'classic-serif';

/** Valid font ids — mirrors the allow-list in the create-greeting function. */
export const FONT_IDS: string[] = greetingFonts.map((font) => font.id);

export const getFontById = (id?: string): GreetingFont =>
  greetingFonts.find((font) => font.id === id) ?? greetingFonts[0];
