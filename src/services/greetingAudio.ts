import { fileToDataUrl } from './catalog';
import { isSupabaseConfigured, supabase } from './supabase';

/** Uploads larger than this are rejected (matches the storage bucket limit). */
export const MAX_GREETING_AUDIO_BYTES = 8 * 1024 * 1024; // 8 MB

/** True when the file looks like an MP3 (by MIME type or extension). */
export const isMp3File = (file: File): boolean =>
  file.type === 'audio/mpeg' ||
  file.type === 'audio/mp3' ||
  file.type === 'audio/mpeg3' ||
  /\.mp3$/i.test(file.name);

/** Human-readable file size for the upload hint. */
export const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const randomId = () => Math.random().toString(36).slice(2, 8);

/**
 * Stores a sender's custom background track and returns a URL the viewer can
 * play.
 *
 * Premium/Elite cards are the only themes that expose this in the builder. When
 * a Supabase project is configured the MP3 goes to the public `greeting-audio`
 * bucket; without a backend it falls back to a local object URL so the preview
 * (and the dev-only locally stored card) still plays the song.
 */
export const uploadGreetingAudio = async (file: File): Promise<string> => {
  if (!file) throw new Error('No audio file selected.');
  if (!isMp3File(file)) throw new Error('Please choose an MP3 (.mp3) file.');
  if (file.size > MAX_GREETING_AUDIO_BYTES) {
    throw new Error(`Audio must be ${formatBytes(MAX_GREETING_AUDIO_BYTES)} or smaller.`);
  }

  if (isSupabaseConfigured()) {
    const path = `tracks/${Date.now()}-${randomId()}.mp3`;
    const { error } = await supabase.storage
      .from('greeting-audio')
      .upload(path, file, { contentType: 'audio/mpeg', cacheControl: '172800' });
    if (error) throw new Error('Could not upload your music. Please try again.');
    return supabase.storage.from('greeting-audio').getPublicUrl(path).data.publicUrl;
  }

  // No backend configured: a data URL keeps the track playable for the session
  // (small files only; larger MP3s fall back to a temporary object URL).
  if (file.size <= 1_500_000) {
    return fileToDataUrl(file);
  }
  return URL.createObjectURL(file);
};
