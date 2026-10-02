import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * ReportCard Studio is embedded as a static sub-app at /reportcard/. It has its
 * own client-side router, so a deep link like /reportcard/dashboard must serve
 * the sub-app's shell — not Ishmaverse's — otherwise the iframe would render
 * the wrong app. This mirrors the production rewrite in vercel.json.
 */
const reportCardFallback = (): Plugin => {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url ?? '';
    // Serve the sub-app shell for /reportcard and extension-less
    // /reportcard/* paths (never for real assets like /reportcard/assets/*.js).
    if (url === '/reportcard' || /^\/reportcard\/(?!.*\.[a-zA-Z0-9]+(\?|$)).*$/.test(url)) {
      req.url = '/reportcard/index.html';
    }
    next();
  };

  return {
    name: 'reportcard-spa-fallback',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
};

export default defineConfig({
  plugins: [
    reportCardFallback(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Ishmaverse',
        short_name: 'Ishmaverse',
        description: 'Ishmaverse Digital Ecosystem',
        theme_color: '#8b5cf6',
        background_color: '#0b0514',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/ishmaverse.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/ishmaverse.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/ishmaverse.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // The embedded ReportCard Studio SPA ships its own shell + service
        // worker, so keep it out of Ishmaverse's precache and navigation
        // fallback — otherwise the iframe could be served Ishmaverse's page.
        globIgnores: ['**/reportcard/**'],
        navigateFallbackDenylist: [/^\/reportcard\//],
      },
    }),
  ],
})
