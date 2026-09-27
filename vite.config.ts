import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH wird im GitHub-Pages-Build auf "/<repo-name>/" gesetzt.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // Icons (PWA, Apple, Favicon) werden beim Build aus public/favicon.svg erzeugt
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'Anstoß – Fußball live',
        short_name: 'Anstoß',
        description: 'Spiele, Live-Stände, Aufstellungen und Tabellen',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#0f7a4a',
        background_color: '#f2f5f3',
        categories: ['sports'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Spieldaten: immer zuerst frisch aus dem Netz, bei Offline den letzten Stand zeigen
            urlPattern: ({ url }) => url.hostname.endsWith('api.espn.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'football-data',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 300, maxAgeSeconds: 2 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Spielerfotos und Wikimedia-Metadaten ändern sich selten
            urlPattern: ({ url }) => /(^|\.)wiki(data|media)\.org$/.test(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wikimedia',
              expiration: { maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Logos ändern sich praktisch nie
            urlPattern: ({ url }) => url.hostname === 'a.espncdn.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'logos',
              expiration: { maxEntries: 600, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  test: {
    environment: 'node',
  },
})
