import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['pwa-icon.svg'],
      pwaAssets: {
        image: 'public/pwa-icon.svg',
        includeHtmlHeadLinks: true,
        overrideManifestIcons: true,
      },
      manifest: {
        name: 'Forge Fitness',
        short_name: 'Forge',
        description:
          'A mobile-first calorie and macro tracker with barcode scanning, favorites, reusable meals, and offline logging.',
        theme_color: '#0f172a',
        background_color: '#f7f8fc',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        lang: 'en',
        categories: ['health', 'fitness', 'lifestyle'],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts-product-cache',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 4,
            },
          },
          {
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/cgi\/search\.pl.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts-search-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 12,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 4,
            },
          },
          {
            urlPattern: /^https:\/\/images\.openfoodfacts\.org\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'openfoodfacts-images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
