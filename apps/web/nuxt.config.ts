import pkg from './package.json'

export default defineNuxtConfig({
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(`v${pkg.version}`)
    }
  },
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxt/ui', '@nuxt/icon', '@nuxt/fonts', '@nuxt/eslint', '@vueuse/motion/nuxt'],
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
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    soundcloudClientId: process.env.SOUNDCLOUD_CLIENT_ID || '',
    soundcloudClientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET || '',
    soundcloudPublicClientId: process.env.SOUNDCLOUD_PUBLIC_CLIENT_ID || '',
    analyzerUrl: process.env.ANALYZER_URL || '',
    analyzerApiKey: process.env.ANALYZER_API_KEY || '',
    public: {
      isDev: process.env.NODE_ENV === 'development',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_KEY || '',
      adSenseClient: process.env.ADSENSE_CLIENT || ''
    }
  }
})
