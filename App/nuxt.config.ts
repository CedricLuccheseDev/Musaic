import { execSync } from 'child_process'
import pkg from './package.json'

function getVersion(): string {
  // Use APP_VERSION from CI/CD if available
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION
  }
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null').toString().trim()
  } catch {
    return `v${pkg.version}`
  }
}

export default defineNuxtConfig({
  vite: {
    define: {
      __APP_VERSION__: JSON.stringify(getVersion())
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
    analyzerUrl: process.env.ANALYZER_URL || '',
    public: {
      isDev: process.env.NODE_ENV === 'development',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_KEY || '',
      adSenseClient: process.env.ADSENSE_CLIENT || ''
    }
  }
})
