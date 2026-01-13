import { saveIssue } from '~/server/services/database'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, subject, message } = body

  if (!email || !subject || !message) {
    throw createError({ statusCode: 400, message: 'Missing required fields: email, subject, message' })
  }

  // Extract optional metadata
  const headers = getHeaders(event)
  const userAgent = headers['user-agent'] || null
  const url = headers['referer'] || null

  const success = await saveIssue({
    email,
    subject,
    message,
    user_agent: userAgent,
    url
  })

  if (!success) {
    throw createError({ statusCode: 500, message: 'Failed to save issue' })
  }

  return { success: true }
})
