/**
 * Check how many tracks are analyzed vs pending
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env' })

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('📊 Track Analysis Status')
  console.log('==================================================\n')

  // Total tracks
  const { count: total } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })

  // Completed
  const { count: completed } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_status', 'completed')

  // Pending
  const { count: pending } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_status', 'pending')

  // Processing (actually running)
  const { count: processing } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_status', 'processing')
    .not('analyzed_at', 'is', null)

  // Stuck (processing but never completed)
  const { count: stuck } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_status', 'processing')
    .is('analyzed_at', null)

  // Failed
  const { count: failed } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_status', 'failed')

  // No status (NULL)
  const { count: noStatus } = await supabase
    .from('tracks')
    .select('*', { count: 'exact', head: true })
    .is('analysis_status', null)

  console.log(`Total tracks:     ${total}`)
  console.log('')
  console.log(`✅ Completed:     ${completed}`)
  console.log(`⏳ Pending:       ${pending}`)
  console.log(`🔄 Processing:    ${processing}`)
  console.log(`⚠️  Stuck:         ${stuck}`)
  console.log(`❌ Failed:        ${failed}`)
  console.log(`❓ No status:     ${noStatus}`)
  console.log('')

  const notAnalyzed = (pending || 0) + (stuck || 0) + (noStatus || 0) + (failed || 0)
  const percentAnalyzed = total ? Math.round(((completed || 0) / total) * 100) : 0

  console.log(`📈 Analysis progress: ${percentAnalyzed}% (${completed}/${total})`)
  console.log(`📋 To analyze: ${notAnalyzed} tracks (pending + stuck + failed)`)
}

main().catch(console.error)
