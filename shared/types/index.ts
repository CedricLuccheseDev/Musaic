/**
 * Shared types for Musaic monorepo
 *
 * Usage:
 *   import { TrackEntry, DownloadStatus } from '@/types'
 *   import type { DbTrack } from '@/types'
 */

// Generated types from Supabase
export type { Database } from './generated/database'

// Custom enums
export { DownloadStatus, AnalysisStatus } from './enums'
export type { DownloadStatus as DownloadStatusType, AnalysisStatus as AnalysisStatusType } from './enums'

// Database row types and helpers
export type { DbTrack, DbTrackInsert, DbTrackUpdate, DbProfile, TrackEntry } from './helpers'
export { trackEntryToDbTrack, dbTrackToTrackEntry } from './helpers'
