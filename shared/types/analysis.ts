/**
 * Shared analysis types between App and Analyzer
 *
 * Python equivalent: Analyzer/app/models.py
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Status of track analysis
 * Python: AnalysisStatus(str, Enum)
 */
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export const AnalysisStatusValues = {
  PENDING: 'pending' as const,
  PROCESSING: 'processing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const
}

// =============================================================================
// Analysis Results
// =============================================================================

/**
 * Audio analysis results from Essentia
 * Python: AnalysisResult(BaseModel)
 */
export interface AnalysisResult {
  // Rhythm
  bpm_detected: number
  bpm_confidence: number

  // Tonal
  key_detected: string
  key_confidence: number

  // Dynamics
  energy: number
  loudness: number
  dynamic_complexity: number

  // Timbre
  spectral_centroid: number
  dissonance: number

  // High-level descriptors
  danceability: number
  speechiness: number
  instrumentalness: number
  acousticness: number
  valence: number
  liveness: number

  // Highlight
  highlight_time: number

  // Embedding (optional, for similarity search)
  embedding?: number[]
}

/**
 * Partial analysis data (nullable fields for DB storage)
 * Python: TrackUpdate(BaseModel)
 */
export interface AnalysisData {
  // Rhythm
  bpm_detected: number | null
  bpm_confidence: number | null

  // Tonal
  key_detected: string | null
  key_confidence: number | null

  // Dynamics
  energy: number | null
  loudness: number | null
  dynamic_complexity: number | null

  // Timbre
  spectral_centroid: number | null
  dissonance: number | null

  // High-level descriptors
  danceability: number | null
  speechiness: number | null
  instrumentalness: number | null
  acousticness: number | null
  valence: number | null
  liveness: number | null

  // Status
  analysis_status: AnalysisStatus | null
  analysis_error: string | null
  analyzed_at: string | null
}

// =============================================================================
// API Request/Response
// =============================================================================

/**
 * Request to analyze a track
 * Python: AnalyzeRequest(BaseModel)
 */
export interface AnalyzeRequest {
  soundcloud_id: number
}

/**
 * Response when analysis is triggered
 * Python: AnalyzingResponse(BaseModel)
 */
export interface AnalyzingResponse {
  status: 'analyzing'
  soundcloud_id: number | null
}

/**
 * Batch analysis request
 * Python: BatchAnalysisRequest(BaseModel)
 */
export interface BatchAnalysisRequest {
  include_failed?: boolean
}

/**
 * Batch analysis response
 * Python: BatchAnalysisResponse(BaseModel)
 */
export interface BatchAnalysisResponse {
  status: 'started' | 'already_running'
  total_tracks: number
  message: string
}

/**
 * Batch status response
 * Python: BatchStatusResponse(BaseModel)
 */
export interface BatchStatusResponse {
  is_running: boolean
  total_tracks: number
  processed: number
  successful: number
  failed: number
  current_track: string | null
}

/**
 * Health check response
 * Python: HealthResponse(BaseModel)
 */
export interface HealthResponse {
  status: 'ok' | 'error'
  queue_size: number
  version: string
}

/**
 * Error response
 * Python: ErrorResponse(BaseModel)
 */
export interface ErrorResponse {
  error: string
  detail?: string
}
