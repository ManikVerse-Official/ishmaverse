// End-to-end smoke test for the manage/delete flow.
//
// No live Supabase is configured (placeholder URL), so we run the REAL service
// module through Vite's SSR loader with a fake localStorage/window and exercise
// the same functions the /manage page calls. Run: node scripts/smoke-manage.mjs
import { createServer } from 'vite';

// --- minimal browser globals the service touches ---------------------------
const store = new Map();
globalThis.window = { location: { origin: 'http://localhost:5173' } };
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.URL.createObjectURL ??= () => 'blob:stub';
// supabase-js builds a Realtime client at import time; Node 20 has no global
// WebSocket, so provide a no-op stub (the fallback path never uses it).
globalThis.WebSocket ??= class WebSocketStub {
  constructor() {}
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
};

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const svc = await server.ssrLoadModule('/src/services/greetingService.ts');

  // 1. management_token must never be part of the client-selectable columns.
  check(
    'CARD_PUBLIC_COLUMNS excludes management_token',
    !svc.CARD_PUBLIC_COLUMNS.includes('management_token'),
  );

  // 2. Create a card through the service (local fallback path).
  const created = await svc.createGreetingCard({
    sender_name: 'Smoke Sender',
    receiver_name: 'Smoke Receiver',
    message: 'Hello from the smoke test',
    theme: 'romantic-rose-note',
    external_image_url: '',
    currency: 'INR',
    // Fully-custom card + audio must survive a round-trip.
    title: 'Happy Birthday',
    eyebrow: 'A LITTLE NOTE FOR YOU',
    signoff: 'Yours always,',
    background_color_start: '#22d3ee',
    background_color_end: '#7c3aed',
    background_gradient_angle: 210,
    audio_track: '/audio/romantic.mp3',
  });
  const { card } = created;
  const token = card.management_token;

  check('createGreetingCard returns a card', Boolean(card?.id), card?.id);
  check(
    'created card carries a UUID management_token',
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token ?? ''),
    token,
  );

  // 2b. Customisation + audio round-trip.
  check('custom title round-trips', card.title === 'Happy Birthday', card.title);
  check('custom eyebrow round-trips', card.eyebrow === 'A LITTLE NOTE FOR YOU');
  check('custom sign-off round-trips', card.signoff === 'Yours always,');
  check('gradient start round-trips', card.background_color_start === '#22d3ee');
  check('gradient end round-trips', card.background_color_end === '#7c3aed');
  check('gradient angle round-trips', card.background_gradient_angle === 210);
  check('audio track round-trips', card.audio_track === '/audio/romantic.mp3', card.audio_track);

  // 3. The manage page's read resolves by token.
  const fetched = await svc.getManagedCard(token);
  check('getManagedCard finds the card by token', fetched.card?.id === card.id, fetched.card?.id);
  check('fresh card is not expired', fetched.expired === false);
  check('getManagedCard keeps the audio track', fetched.card?.audio_track === '/audio/romantic.mp3');

  const publicCard = await svc.getGreetingCard(card.id);
  check('public read keeps the custom title', publicCard?.title === 'Happy Birthday');
  check('public read keeps the audio track', publicCard?.audio_track === '/audio/romantic.mp3');

  // 4. Unknown token is treated as "not found" (never throws).
  const missing = await svc.getManagedCard('00000000-0000-0000-0000-000000000000');
  check('getManagedCard returns null for an unknown token', missing.card === null);

  // 5. Expiry is reported for a card past its 48h window.
  const expiredCard = {
    ...card,
    id: 'expired1',
    management_token: '11111111-1111-1111-1111-111111111111',
    created_at: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
    expires_at: undefined,
  };
  const seeded = JSON.parse(localStorage.getItem('ishmaverse_greeting_cards') || '[]');
  localStorage.setItem('ishmaverse_greeting_cards', JSON.stringify([expiredCard, ...seeded]));
  const expired = await svc.getManagedCard(expiredCard.management_token);
  check('getManagedCard reports expired for a 49h-old card', expired.expired === true);

  // 6. Deleting removes the card (and its public view).
  const deleted = await svc.deleteManagedCard(token);
  check('deleteManagedCard resolves true', deleted === true);
  const after = await svc.getManagedCard(token);
  check('card is gone after delete', after.card === null);
  const publicView = await svc.getGreetingCard(card.id);
  check('public getGreetingCard also returns null after delete', publicView === null);

  // 7. Deleting an already-deleted token throws a clean error.
  let threw = false;
  try {
    await svc.deleteManagedCard(token);
  } catch {
    threw = true;
  }
  check('deleteManagedCard throws for a missing card', threw);

  // 8. buildManageUrl points at the /manage route.
  check('buildManageUrl builds /manage/<token>', svc.buildManageUrl(token).endsWith(`/manage/${token}`));
} finally {
  await server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) process.exit(1);
