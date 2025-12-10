import SoundcloudModule from 'soundcloud.ts'

interface SoundcloudTrack {
  id: number
  title: string
  user?: { username: string }
  permalink_url: string
  artwork_url?: string
  duration: number
  genre?: string
  description?: string
  downloadable?: boolean
  download_url?: string
  purchase_url?: string
  purchase_title?: string
}

interface SoundcloudConstructor {
  new (): SoundcloudInstance
}

interface SoundcloudInstance {
  tracks: {
    search: (params: { q: string }) => Promise<{ collection: SoundcloudTrack[] }>
  }
}

// Handle both ESM and CJS exports
const Soundcloud = (
  (SoundcloudModule as { default?: SoundcloudConstructor }).default ||
  SoundcloudModule
) as SoundcloudConstructor

const TEST_QUERIES = [
  'Bicep Glue',
  'Jeanne - Respire Fort (Quyver remix)',
  'KAMAZOTA - INTRUDERS (FREE DOWNLOAD)'
]

async function testSoundcloudTrack() {
  const soundcloud = new Soundcloud()

  for (const query of TEST_QUERIES) {
    console.log(`\n🔍 Searching for "${query}"...\n`)

    const response = await soundcloud.tracks.search({ q: query })
    const tracks = response.collection || []

    if (tracks.length === 0) {
      console.error(`❌ No tracks found for "${query}"`)
      process.exit(1)
    }

    const track = tracks[0]

    console.log('✅ Track found!\n')
    console.log('=== TRACK INFO ===')
    console.log('id:', track.id)
    console.log('title:', track.title)
    console.log('artist:', track.user?.username)
    console.log('permalink_url:', track.permalink_url)
    console.log('artwork_url:', track.artwork_url)
    console.log('duration:', track.duration)
    console.log('genre:', track.genre)
    console.log('description:', track.description?.slice(0, 100))
    console.log('')
    console.log('=== DOWNLOAD INFO ===')
    console.log('downloadable:', track.downloadable)
    console.log('download_url:', track.download_url)
    console.log('purchase_url:', track.purchase_url)
    console.log('purchase_title:', track.purchase_title)
    console.log('\n' + '='.repeat(50))
  }

  console.log('\n✅ All tests passed!')
}

testSoundcloudTrack().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
