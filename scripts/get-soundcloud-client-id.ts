/**
 * Script to fetch a fresh SoundCloud client ID
 * Run with: npx tsx scripts/get-soundcloud-client-id.ts
 *
 * The client ID is needed for production because SoundCloud blocks
 * auto-fetch requests from datacenter IPs.
 */

async function getClientIdFromMobile(): Promise<string | null> {
  try {
    const response = await fetch('https://m.soundcloud.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/99.0.4844.47 Mobile/15E148 Safari/604.1'
      }
    })
    const html = await response.text()
    const match = html.match(/"clientId":"(\w+)"/)
    return match?.[1] || null
  } catch (error) {
    console.error('Mobile fetch failed:', error)
    return null
  }
}

async function getClientIdFromWeb(): Promise<string | null> {
  try {
    const response = await fetch('https://soundcloud.com')
    const html = await response.text()

    // Find all script URLs
    const scriptUrls = html.match(/https?:\/\/[^\s"]+\.js/g)
    if (!scriptUrls) return null

    // Check each script for client_id
    for (const scriptUrl of scriptUrls) {
      try {
        const scriptResponse = await fetch(scriptUrl)
        const script = await scriptResponse.text()
        const match = script.match(/[{,]client_id:"(\w+)"/)
        if (match) return match[1]
      } catch {
        continue
      }
    }
    return null
  } catch (error) {
    console.error('Web fetch failed:', error)
    return null
  }
}

async function main() {
  console.log('🔍 Fetching SoundCloud client ID...\n')

  // Try mobile first (faster)
  let clientId = await getClientIdFromMobile()

  if (!clientId) {
    console.log('Mobile method failed, trying web method...')
    clientId = await getClientIdFromWeb()
  }

  if (clientId) {
    console.log('✅ Client ID found!\n')
    console.log('━'.repeat(50))
    console.log(`\n  SOUNDCLOUD_CLIENT_ID=${clientId}\n`)
    console.log('━'.repeat(50))
    console.log('\n📋 Add this to your production environment variables.')
    console.log('   (Coolify, Vercel, Railway, etc.)\n')

    // Copy to clipboard if possible (works on macOS/Linux with xclip)
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const platform = process.platform
      let copyCommand = ''

      if (platform === 'darwin') {
        copyCommand = 'pbcopy'
      } else if (platform === 'linux') {
        // Try xclip first, then xsel
        try {
          await execAsync('which xclip')
          copyCommand = 'xclip -selection clipboard'
        } catch {
          try {
            await execAsync('which xsel')
            copyCommand = 'xsel --clipboard --input'
          } catch {
            // No clipboard tool available
          }
        }
      }

      if (copyCommand) {
        await execAsync(`echo -n "${clientId}" | ${copyCommand}`)
        console.log('📎 Client ID copied to clipboard!\n')
      }
    } catch {
      // Clipboard copy failed silently
    }
  } else {
    console.error('❌ Could not find client ID')
    console.error('   SoundCloud may have changed their website structure.')
    process.exit(1)
  }
}

main()
