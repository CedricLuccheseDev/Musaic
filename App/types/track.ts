/**
 * Re-export shared track types
 * Source of truth: shared/types/track.ts
 */

export {
  type DownloadStatus,
  DownloadStatusValues,
  type TrackEntry,
  type DbTrack,
  type DbTrackWithAnalysis,
  trackEntryToDbTrack,
  dbTrackToTrackEntry
} from '../../shared/types/track'

// Keep DownloadStatus as enum for backward compatibility
export const DownloadStatus = {
  FreeDirectLink: 'FreeDirectLink' as const,
  FreeExternalLink: 'FreeExternalLink' as const,
  No: 'No' as const
}
