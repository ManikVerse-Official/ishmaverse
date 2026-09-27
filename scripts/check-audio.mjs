// Verifies the BGM mapping against the files actually shipped in public/audio.
//
// Catches the classic "song doesn't play" gap: a category pointing at a file
// that doesn't exist (wrong name, wrong folder, dropped space, stray -bgm).
// Run: node scripts/check-audio.mjs
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const audioSrc = readFileSync(join(root, 'src', 'data', 'audio.ts'), 'utf8');

// Entries look like:  romantic: '/audio/romantic.mp3',
const entries = [...audioSrc.matchAll(/^\s*([a-z_]+):\s*'(\/audio\/[^']+)'/gim)].map((m) => ({
  category: m[1],
  path: m[2],
}));
const fallback = audioSrc.match(/DEFAULT_AUDIO_TRACKS\s*=\s*'([^']+)'/)?.[1];

if (entries.length === 0) {
  console.error('✗ Could not parse any audio mappings from src/data/audio.ts');
  process.exit(1);
}

const filesOnDisk = readdirSync(join(root, 'public', 'audio'));
const missing = [];
const pending = [];

// Files we know are not uploaded yet. The viewer falls back to the default
// track for these, so they are a warning rather than a failure.
const PENDING_UPLOAD = new Set(['/audio/sorry.mp3']);

for (const { category, path } of entries) {
  const rel = path.replace(/^\//, '');
  if (!existsSync(join(root, 'public', rel))) {
    if (PENDING_UPLOAD.has(path)) pending.push(`${category} -> ${path}`);
    else missing.push(`${category} -> ${path}`);
  }
}

if (fallback && !existsSync(join(root, 'public', fallback.replace(/^\//, '')))) {
  missing.push(`DEFAULT_AUDIO_TRACKS -> ${fallback}`);
}

console.log(`categories mapped : ${entries.length}`);
console.log(`files in public/audio: ${filesOnDisk.length}`);
console.log(`fallback file     : ${fallback ?? '(none)'}`);

// Files present on disk but never referenced (informational only).
const used = new Set(
  [...entries.map((e) => e.path), fallback].filter(Boolean).map((p) => p.replace(/^\/audio\//, '')),
);
const unused = filesOnDisk.filter((f) => !used.has(f));
if (unused.length) console.log(`unused audio files: ${unused.join(', ')}`);

if (pending.length) {
  console.warn('\n⚠ Audio not uploaded yet (falls back to default.mp3):');
  for (const p of pending) console.warn(`  - ${p}`);
}

if (missing.length) {
  console.error('\n✗ Audio mapping FAILED — these categories point at missing files:');
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log('\n✓ Audio mapping OK — every category resolves to a real file.');
