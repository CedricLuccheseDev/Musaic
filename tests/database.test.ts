import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

async function testDatabase() {
  console.log('\n🗄️  Testing Database operations...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Read tracks
  console.log('=== READ TEST ===')
  try {
    const { data, error, count } = await supabase
      .from('tracks')
      .select('*', { count: 'exact' })
      .limit(5)

    if (error) {
      console.error('❌ Read failed:', error.message)
      process.exit(1)
    }

    console.log(`✅ Read successful: ${count} total tracks in DB`)
    if (data && data.length > 0) {
      console.log(`   Sample: "${data[0].title}" by ${data[0].artist}`)
    }
  } catch (err) {
    console.error('❌ Read error:', err)
    process.exit(1)
  }

  // Test 2: Test RPC exec function (used by AI search)
  console.log('\n=== RPC EXEC TEST ===')
  try {
    const { data, error } = await supabase.rpc('exec', {
      query: 'SELECT COUNT(*) as count FROM tracks'
    })

    if (error) {
      console.error('❌ RPC exec failed:', error.message)
      console.log('   (This is OK if exec function is not set up)')
    } else {
      console.log('✅ RPC exec working')
      console.log(`   Result: ${JSON.stringify(data)}`)
    }
  } catch {
    console.log('⚠️  RPC exec not available (optional)')
  }

  // Test 3: Test upsert (insert or update)
  console.log('\n=== UPSERT TEST ===')
  const testTrack = {
    soundcloud_id: 999999999,
    urn: 'soundcloud:tracks:999999999',
    permalink_url: 'https://soundcloud.com/test/test-track',
    title: 'CI Test Track',
    artist: 'CI Test Artist',
    artwork: null,
    duration: 180000,
    genre: 'test',
    description: 'Test track for CI',
    soundcloud_created_at: new Date().toISOString(),
    label: null,
    tags: ['test', 'ci'],
    bpm: 128,
    key: 'C minor',
    playback_count: 0,
    likes_count: 0,
    reposts_count: 0,
    comment_count: 0,
    download_status: 'No',
    downloadable: false,
    download_url: null,
    purchase_url: null,
    purchase_title: null
  }

  try {
    const { error: upsertError } = await supabase
      .from('tracks')
      .upsert(testTrack, { onConflict: 'soundcloud_id' })

    if (upsertError) {
      console.error('❌ Upsert failed:', upsertError.message)
      process.exit(1)
    }

    console.log('✅ Upsert successful')

    // Verify it was inserted
    const { data: verifyData } = await supabase
      .from('tracks')
      .select('title, artist')
      .eq('soundcloud_id', 999999999)
      .single()

    if (verifyData) {
      console.log(`   Verified: "${verifyData.title}" by ${verifyData.artist}`)
    }

    // Clean up test data
    await supabase.from('tracks').delete().eq('soundcloud_id', 999999999)
    console.log('   Cleaned up test data')

  } catch (err) {
    console.error('❌ Upsert error:', err)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Database tests passed!\n')
}

testDatabase().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
