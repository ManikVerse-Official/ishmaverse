// Validates the greeting theme catalog so a bad theme can never ship.
//
// Checks ids are unique, every category/font/frame/motion/animation is known,
// and each surface has at least two gradient stops. Run: node scripts/check-themes.mjs
import { createServer } from 'vite';

const FRAMES = new Set(['soft', 'elegant', 'polaroid', 'gold', 'neon', 'vintage']);
const MOTIONS = new Set(['fade', 'rise', 'zoom', 'cinematic']);

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { greetingThemes, greetingCategories, ANIMATION_OPTIONS } = await server.ssrLoadModule(
    '/src/data/greetingThemes.ts',
  );
  const { greetingFonts } = await server.ssrLoadModule('/src/data/fonts.ts');

  const fontIds = new Set(greetingFonts.map((f) => f.id));
  const categoryIds = new Set(greetingCategories.map((c) => c.id));
  const seen = new Set();
  const problems = [];

  for (const theme of greetingThemes) {
    const where = theme.id ?? '(missing id)';
    if (!theme.id) problems.push('a theme has no id');
    if (seen.has(theme.id)) problems.push(`${where}: duplicate theme id`);
    seen.add(theme.id);

    if (!categoryIds.has(theme.category_id)) problems.push(`${where}: unknown category "${theme.category_id}"`);
    if (!fontIds.has(theme.design?.defaultFont)) problems.push(`${where}: unknown font "${theme.design?.defaultFont}"`);
    if (!FRAMES.has(theme.design?.frame)) problems.push(`${where}: invalid frame "${theme.design?.frame}"`);
    if (!MOTIONS.has(theme.design?.motion)) problems.push(`${where}: invalid motion "${theme.design?.motion}"`);
    if (!ANIMATION_OPTIONS.includes(theme.animation)) problems.push(`${where}: invalid animation "${theme.animation}"`);
    if (!Array.isArray(theme.design?.surface) || theme.design.surface.length < 2) {
      problems.push(`${where}: surface needs at least 2 stops`);
    }
    if (typeof theme.price !== 'number' || Number.isNaN(theme.price)) {
      problems.push(`${where}: price must be a number`);
    }
  }

  console.log(`themes validated          : ${greetingThemes.length}`);
  console.log(`theme categories available: ${[...categoryIds].join(', ')}`);

  if (problems.length) {
    console.error('\n✗ Theme catalog FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log('\n✓ Theme catalog OK — every theme is well-formed.');
} finally {
  await server.close();
}
