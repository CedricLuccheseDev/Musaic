import type { WaveformSample } from './types'

const WAVEFORM_SAMPLES_PER_SECOND = 50

const waveformCache = new Map<number, WaveformSample[]>()

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

async function applyLowPassAsync(samples: Float32Array, cutoff: number, sampleRate: number): Promise<Float32Array> {
  const rc = 1 / (2 * Math.PI * cutoff)
  const dt = 1 / sampleRate
  const alpha = dt / (rc + dt)
  const output = new Float32Array(samples.length)
  output[0] = samples[0]

  const chunkSize = 50000
  for (let i = 1; i < samples.length; i++) {
    output[i] = output[i - 1] + alpha * (samples[i] - output[i - 1])
    if (i % chunkSize === 0) await yieldToMain()
  }
  return output
}

async function applyHighPassAsync(samples: Float32Array, cutoff: number, sampleRate: number): Promise<Float32Array> {
  const rc = 1 / (2 * Math.PI * cutoff)
  const dt = 1 / sampleRate
  const alpha = rc / (rc + dt)
  const output = new Float32Array(samples.length)
  output[0] = samples[0]

  const chunkSize = 50000
  for (let i = 1; i < samples.length; i++) {
    output[i] = alpha * (output[i - 1] + samples[i] - samples[i - 1])
    if (i % chunkSize === 0) await yieldToMain()
  }
  return output
}

function computeRMS(samples: Float32Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / (end - start))
}

export function useWaveformGeneration() {
  async function generateWaveformData(url: string, trackId?: number): Promise<WaveformSample[]> {
    if (trackId && waveformCache.has(trackId)) {
      return waveformCache.get(trackId)!
    }

    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()

      const audioContext = new AudioContext()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const sampleRate = audioBuffer.sampleRate
      const channelData = audioBuffer.getChannelData(0)
      const duration = audioBuffer.duration

      const lowBand = await applyLowPassAsync(channelData, 250, sampleRate)
      const highFiltered = await applyHighPassAsync(channelData, 250, sampleRate)
      const midBand = await applyLowPassAsync(highFiltered, 4000, sampleRate)
      const highBand = await applyHighPassAsync(channelData, 4000, sampleRate)

      const totalSamples = Math.ceil(duration * WAVEFORM_SAMPLES_PER_SECOND)
      const samplesPerChunk = Math.floor(channelData.length / totalSamples)

      // First pass: collect raw RMS values
      const rawData: { low: number; mid: number; high: number; total: number }[] = []
      let maxLow = 0, maxMid = 0, maxHigh = 0, maxTotal = 0

      for (let i = 0; i < totalSamples; i++) {
        const start = i * samplesPerChunk
        const end = Math.min(start + samplesPerChunk, channelData.length)

        const lowRMS = computeRMS(lowBand, start, end)
        const midRMS = computeRMS(midBand, start, end)
        const highRMS = computeRMS(highBand, start, end)
        const totalRMS = computeRMS(channelData, start, end)

        rawData.push({ low: lowRMS, mid: midRMS, high: highRMS, total: totalRMS })
        maxLow = Math.max(maxLow, lowRMS)
        maxMid = Math.max(maxMid, midRMS)
        maxHigh = Math.max(maxHigh, highRMS)
        maxTotal = Math.max(maxTotal, totalRMS)

        if (i % 500 === 0) await yieldToMain()
      }

      // Second pass: normalize each band independently for better color contrast
      const waveform: WaveformSample[] = []
      for (let i = 0; i < rawData.length; i++) {
        const d = rawData[i]
        waveform.push({
          low: maxLow > 0 ? d.low / maxLow : 0,
          mid: maxMid > 0 ? d.mid / maxMid : 0,
          high: maxHigh > 0 ? d.high / maxHigh : 0,
          total: maxTotal > 0 ? Math.min(1, (d.total / maxTotal) * 1.2) : 0
        })
      }

      await audioContext.close()

      if (trackId) {
        waveformCache.set(trackId, waveform)
        if (waveformCache.size > 20) {
          const firstKey = waveformCache.keys().next().value
          if (firstKey !== undefined) waveformCache.delete(firstKey)
        }
      }

      return waveform
    }
    catch (error) {
      console.error('[DjPlayer] Waveform generation error:', error)
      return []
    }
  }

  async function preloadWaveform(trackId: number): Promise<void> {
    if (waveformCache.has(trackId)) return
    const url = `/api/stream/${trackId}`
    await generateWaveformData(url, trackId)
  }

  return {
    generateWaveformData,
    preloadWaveform
  }
}
