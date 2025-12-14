import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readBody(event)

  const { email, subject, message } = body

  if (!email || !subject || !message) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  const supabaseUrl = config.supabaseUrl as string
  const supabaseKey = config.supabaseKey as string

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Supabase not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { error } = await supabase.from('issues').insert({
    email,
    subject,
    message,
    created_at: new Date().toISOString()
  })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true }
})
