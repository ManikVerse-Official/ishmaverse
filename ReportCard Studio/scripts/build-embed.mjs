/*
 * Builds ReportCard Studio for embedding inside Ishmaverse.
 *
 * The Studio is a self-contained SPA, so it is shipped as a static sub-app at
 * `/reportcard/` and rendered inside the Ishmaverse section view through an
 * iframe. Building with `VITE_BASE=/reportcard/` makes every asset, the PWA
 * manifest and the service worker scope resolve under that folder, and the
 * output is copied into `public/reportcard` so `npm run build` (and `vite dev`)
 * on Ishmaverse serve it with zero extra wiring.
 *
 *   node scripts/build-embed.mjs        (or: npm run build:embed)
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(here, '..');
const distDir = resolve(studioRoot, 'dist');
const targetDir = resolve(studioRoot, '..', 'public', 'reportcard');

console.log('[reportcard] Building with base=/reportcard/ …');

const result = spawnSync('npx', ['vite', 'build'], {
  cwd: studioRoot,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_BASE: '/reportcard/' },
});

if (result.status !== 0) {
  console.error('[reportcard] Build failed.');
  process.exit(result.status ?? 1);
}

if (!existsSync(distDir)) {
  console.error('[reportcard] No dist/ output found after build.');
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(distDir, targetDir, { recursive: true });

console.log(`[reportcard] Copied build → ${targetDir}`);
