import type { GreetingTier } from '../types';

export type AudioTier = 'elite' | 'premium';

/**
 * Background music (BGM) per greeting category.
 *
 * These paths mirror the files shipped in `public/audio/` EXACTLY — same casing,
 * same spaces, no `-bgm` / `-music` suffix. The flat one-track-per-category shape
 * matches what is actually on disk (there are no separate elite/premium files).
 *
 * NOTE: a few categories have no dedicated file on disk yet, so they safely
 * fall back to `/audio/default.mp3` instead of 404-ing.
 */
export const AUDIO_TRACKS_BY_CATEGORY: Record<string, string> = {
  romantic: '/audio/romantic.mp3',
  birthday: '/audio/birthday.mp3',
  marriage: '/audio/marriage.mp3',
  festival: '/audio/festival.mp3',
  event: '/audio/event.mp3',
  family: '/audio/family.mp3',
  tech_ai: '/audio/tech ai.mp3',
  education: '/audio/education.mp3',
  originals: '/audio/originals.mp3',
  wellness: '/audio/wellness.mp3',
  food: '/audio/food.mp3',
  travel: '/audio/travel.mp3',
  fashion: '/audio/fashion.mp3',
  sports: '/audio/sport.mp3',
  pets: '/audio/pets.mp3',
  nature: '/audio/nature.mp3',
  spirituality: '/audio/spirituality.mp3',
  motivational: '/audio/motivational.mp3',
  anniversary: '/audio/anniversary.mp3',
  graduation: '/audio/graduation.mp3',
  housewarming: '/audio/housewarming.mp3',
  farewell: '/audio/farewell.mp3',
  thank_you: '/audio/thankyou.mp3',
  new_baby: '/audio/new baby.mp3',
  holiday: '/audio/holiday.mp3',
  corporate: '/audio/corporate.mp3',
  // "Sorry" / apology wishes. Drop `sorry.mp3` in public/audio to activate it —
  // until it exists the viewer safely falls back to the default track.
  sorry: '/audio/sorry.mp3',
};

/** Used whenever a category has no dedicated track. */
export const DEFAULT_AUDIO_TRACKS = '/audio/default.mp3';

/** Resolves the BGM asset path for a category (with a safe default). */
export const getAudioTrackPath = (categoryId: string): string =>
  AUDIO_TRACKS_BY_CATEGORY[categoryId] ?? DEFAULT_AUDIO_TRACKS;

export const isAudioTier = (tier: GreetingTier): tier is AudioTier =>
  tier === 'elite' || tier === 'premium';

export const tierAudioLabel: Record<AudioTier, string> = {
  elite: '🎵 Background Music (instrumental loop)',
  premium: '🎶 Background Music (full track)',
};
