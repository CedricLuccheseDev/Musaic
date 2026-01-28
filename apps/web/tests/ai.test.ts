import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `SQL and response generator for music search. Output JSON only.
OUTPUT FORMAT (strict JSON, no markdown):
{"sql":"SELECT ...","phrase":"Short response"}
SCHEMA: tracks(soundcloud_id PK, title, artist, genre, duration ms, download_status, downloadable, playback_count, likes_count, tags[], soundcloud_created_at, bpm, key, label)
DEFAULTS: SELECT * FROM tracks, ILIKE for text, ORDER BY playback_count DESC, LIMIT 20`

async function testAiConnection() {
  console.log('\n🤖 Testing Anthropic AI...\n')

  if (!apiKey) {
    console.error('❌ Missing ANTHROPIC_API_KEY environment variable')
    process.exit(1)
  }

  console.log('🔑 API Key:', apiKey.slice(0, 15) + '...')

  const anthropic = new Anthropic({ apiKey })

  // Test 1: Connection test
  console.log('\n=== CONNECTION TEST ===')
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply "OK"' }]
    })

    const content = message.content[0]
    if (content.type === 'text') {
      console.log('✅ AI connected:', content.text.trim())
    }
  } catch (err) {
    console.error('❌ Connection failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  // Test 2: SQL Generation
  console.log('\n=== SQL GENERATION TEST ===')
  const testQueries = [
    'dubstep tracks',
    'chill music for studying',
    'tracks like Skrillex'
  ]

  for (const query of testQueries) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: query }]
      })

      const content = message.content[0]
      if (content.type !== 'text') {
        console.error(`❌ "${query}": Non-text response`)
        continue
      }

      // Parse JSON
      let text = content.text.trim()
      text = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '')

      const result = JSON.parse(text)

      if (!result.sql || !result.sql.toLowerCase().startsWith('select')) {
        console.error(`❌ "${query}": Invalid SQL`)
        console.error('   Response:', text.slice(0, 100))
        process.exit(1)
      }

      console.log(`✅ "${query}"`)
      console.log(`   SQL: ${result.sql.slice(0, 60)}...`)
      console.log(`   Phrase: ${result.phrase || '(none)'}`)

    } catch (err) {
      console.error(`❌ "${query}":`, err instanceof Error ? err.message : err)
      process.exit(1)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ AI tests passed!\n')
}

testAiConnection().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
