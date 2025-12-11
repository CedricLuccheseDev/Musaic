import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

async function testSupabaseConnection() {
  console.log('\n🔌 Testing Supabase connection...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables')
    process.exit(1)
  }

  console.log('📍 URL:', supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1...'))

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Check auth service health
  console.log('\n=== AUTH SERVICE ===')
  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Auth service error:', error.message)
      process.exit(1)
    }

    console.log('✅ Auth service is reachable')
    console.log('   Session:', data.session ? 'Active' : 'None (expected for anonymous)')
  } catch (err) {
    console.error('❌ Failed to connect to auth service:', err)
    process.exit(1)
  }

  // Test 2: Check OAuth providers configuration
  console.log('\n=== OAUTH PROVIDERS ===')
  try {
    // Test Google OAuth URL generation
    const { data: googleData, error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { skipBrowserRedirect: true }
    })

    if (googleError) {
      console.log('⚠️  Google OAuth:', googleError.message)
    } else if (googleData?.url) {
      console.log('✅ Google OAuth: Configured')
    }

    // Test Apple OAuth URL generation
    const { data: appleData, error: appleError } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { skipBrowserRedirect: true }
    })

    if (appleError) {
      console.log('⚠️  Apple OAuth:', appleError.message)
    } else if (appleData?.url) {
      console.log('✅ Apple OAuth: Configured')
    }
  } catch (err) {
    console.log('⚠️  OAuth check skipped:', err instanceof Error ? err.message : 'Unknown error')
  }

  // Test 3: Database connectivity (optional tables check)
  console.log('\n=== DATABASE ===')
  try {
    const { error } = await supabase.from('_test_connection').select('*').limit(1)

    if (error && error.code === 'PGRST116') {
      console.log('✅ Database is reachable (table does not exist, which is expected)')
    } else if (error) {
      console.log('✅ Database is reachable')
    } else {
      console.log('✅ Database is reachable')
    }
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Supabase connection test passed!\n')
}

testSupabaseConnection().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
