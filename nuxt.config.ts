export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui', '@nuxt/icon', '@nuxt/fonts', '@nuxt/eslint', '@nuxtjs/supabase'],
  components: [
    { path: '~/components/common', pathPrefix: false },
    { path: '~/components/home', pathPrefix: false },
    { path: '~/components/search', pathPrefix: false },
    { path: '~/components/auth', pathPrefix: false }
  ],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' }
  },
  runtimeConfig: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY
  },
  supabase: {
    redirect: false
  }
})
