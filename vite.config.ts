import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const nutritionFields = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'serving_size',
  'nutriments',
  'image_front_small_url',
  'image_front_url',
].join(',')

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  server: {
    proxy: {
      '/api/search': {
        target: 'https://search.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://127.0.0.1')
          const params = new URLSearchParams({
            q: url.searchParams.get('q') ?? '',
            page_size: '24',
            langs: 'en',
            fields: nutritionFields,
          })

          return `/search?${params.toString()}`
        },
      },
      '/api/barcode': {
        target: 'https://world.openfoodfacts.org',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://127.0.0.1')
          const barcode = url.pathname.split('/').filter(Boolean).pop() ?? ''
          const params = new URLSearchParams({
            fields: nutritionFields,
          })

          return `/api/v2/product/${barcode}.json?${params.toString()}`
        },
      },
    },
  },
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /\/api\/barcode\/.*/i,
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
            urlPattern: /\/api\/search.*/i,
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
