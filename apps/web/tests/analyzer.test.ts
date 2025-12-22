import 'dotenv/config'

const ANALYZER_URL = process.env.ANALYZER_URL

async function testAnalyzerConnection() {
  console.log('\n🔍 MusaicAnalyzer ping...\n')

  if (!ANALYZER_URL) {
    console.error('❌ ANALYZER_URL is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(`${ANALYZER_URL}/health`)

    if (!response.ok) {
      console.error(`❌ ${response.status}`)
      process.exit(1)
    }

    const data = await response.json() as { status: string; queue_size: number; version: string }
    console.log(`✅ ${data.status} | queue: ${data.queue_size} | v${data.version}`)
  } catch (error) {
    console.error('❌', error)
    process.exit(1)
  }
}

testAnalyzerConnection()
