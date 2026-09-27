import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
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
      },
    }),
  ],
})
