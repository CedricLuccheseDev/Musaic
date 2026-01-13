import { sendAnalysisRequest } from '~/server/utils/analyzer'

interface AnalyzeRequest {
  soundcloud_ids: number[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<AnalyzeRequest>(event)

  if (!body.soundcloud_ids || !Array.isArray(body.soundcloud_ids) || body.soundcloud_ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'soundcloud_ids array required'
    })
  }

  // Use analyzer service with batch size limit of 100
  const result = await sendAnalysisRequest(body.soundcloud_ids, { batchSize: 100 })

  return result
})
