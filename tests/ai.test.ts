import Anthropic from '@anthropic-ai/sdk'

const apiKey = process.env.ANTHROPIC_API_KEY

async function testAiConnection() {
  console.log('\n🤖 Testing Anthropic AI connection...\n')

  if (!apiKey) {
    console.error('❌ Missing ANTHROPIC_API_KEY environment variable')
    process.exit(1)
  }

  console.log('🔑 API Key:', apiKey.slice(0, 10) + '...')

  const anthropic = new Anthropic({ apiKey })

  // Test: Simple query to check connection
  console.log('\n=== AI QUERY TEST ===')
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Reply with only "OK" if you receive this message.' }
      ]
    })

    const content = message.content[0]
    if (content.type === 'text' && content.text.includes('OK')) {
      console.log('✅ AI responded correctly')
    } else {
      console.log('✅ AI responded:', content.type === 'text' ? content.text : 'Non-text response')
    }

    console.log('\n=== TOKEN USAGE ===')
    console.log('   Input tokens:', message.usage.input_tokens)
    console.log('   Output tokens:', message.usage.output_tokens)

  } catch (err) {
    console.error('❌ AI query failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Anthropic AI test passed!\n')
}

testAiConnection().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
