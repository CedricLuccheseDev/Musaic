/**
 * Custom enums used across the application
 * These are NOT in the database but used in the app logic
 */

// =============================================================================
// Download Status
// =============================================================================

export type DownloadStatus = 'FreeDirectLink' | 'FreeExternalLink' | 'No'

export const DownloadStatus = {
  FreeDirectLink: 'FreeDirectLink',
  FreeExternalLink: 'FreeExternalLink',
  No: 'No'
} as const

// =============================================================================
// Analysis Status (matches database enum)
// =============================================================================

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'

export const AnalysisStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed'
} as const
