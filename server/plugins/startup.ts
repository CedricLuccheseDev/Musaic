export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()

  console.log('========================================')
  console.log('[Startup] Server is starting...')
  console.log('[Startup] SUPABASE_URL:', config.supabaseUrl ? `${String(config.supabaseUrl).substring(0, 30)}...` : 'NOT SET')
  console.log('[Startup] SUPABASE_KEY:', config.supabaseKey ? 'SET' : 'NOT SET')
  console.log('[Startup] ANTHROPIC_API_KEY:', config.anthropicApiKey ? 'SET' : 'NOT SET')
  console.log('========================================')
})
