// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  routeRules: {
    '/api/**': { proxy: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/**` : 'http://localhost:8090/api/**' }
  }
})