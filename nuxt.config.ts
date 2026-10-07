// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'WellReach',
      meta: [{ name: 'description', content: 'Offline-first activity tracking and donor reporting for NGOs' }],
    },
  },
  ssr: false,
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  // <AppIcon> works in every page and component without an import.
  components: [{ path: '~/components/interfaces', pathPrefix: false }, '~/components'],
  css: ['~/assets/css/main.css', '~/assets/css/project-settings.css', '~/assets/css/project-dashboard.css', '~/assets/css/teamup.css', '~/assets/css/modals.css'],
  nitro: {
    prerender: {
      routes: ['/'],
    },
  },
  routeRules: {
    '/api/**': {      proxy: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/**` : (process.env.NODE_ENV === 'production' ? 'https://api.wellreach.sswoco.org/api/**' : 'http://localhost:8090/api/**') }
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'WellReach — trusted data for children\'s wellbeing',
      short_name: 'WellReach',
      description: 'Offline-first activity tracking and donor reporting for NGOs',
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
          urlPattern: /^\/api\/v1\/dashboard/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-dashboard',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
          },
        },
        {
          urlPattern: /^\/api\/v1\/cfs\/dashboard/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cfs-dashboard',
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