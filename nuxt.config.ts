// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
  routeRules: {
    '/api/**': { proxy: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/**` : 'http://localhost:8090/api/**' }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'DART — Donor Automated Report Technology',
      short_name: 'DART',
      description: 'Offline-first CFS management for SSWOCO',
      theme_color: '#818cf8',
      background_color: '#0f0f1a',
      display: 'standalone',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    workbox: {
      // SPA shell is precached as "/" — serve it for all navigation requests
      navigateFallback: '/',
      // Precache JS, CSS, HTML shell, and static assets
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // Runtime caching for pages and API
      runtimeCaching: [
        {
          urlPattern: /^\/api\/v1\/cfs\/beneficiaries$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-beneficiaries',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
          },
        },
        {
          urlPattern: /^\/api\/v1\/cfs\/dashboard/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-dashboard',
            expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 },
          },
        },
      ],
    },
    devOptions: {
      enabled: false,
    },
  },
})