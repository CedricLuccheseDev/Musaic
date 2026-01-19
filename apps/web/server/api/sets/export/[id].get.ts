/**
 * GET /api/sets/export/[id] - Export a set in various formats
 * Query params: format=json|rekordbox|m3u
 */

import { getSupabaseAdminClient } from '~/server/utils/supabase'
import { requireAuth } from '~/server/utils/auth'
import type { DbSet, DbSetTrack, TrackEntry, SetMood, SetStatus } from '~/types'

interface ExportTrack {
  position: number
  title: string
  artist: string
  duration: number // ms
  bpm: number | null
  key: string | null
  soundcloudUrl: string
  transitionNote: string | null
}

interface ExportData {
  set: {
    name: string
    genre: string | null
    targetDuration: number // seconds
    mood: SetMood
    status: SetStatus
    createdAt: string
  }
  tracks: ExportTrack[]
  totalDuration: number // ms
  trackCount: number
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const setId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const format = (query.format as string) || 'json'

  if (!setId) {
    throw createError({ statusCode: 400, message: 'Set ID is required' })
  }

  const supabase = getSupabaseAdminClient()

  // Fetch set
  const { data: dbSet, error: setError } = await supabase
    .from('sets')
    .select('*')
    .eq('id', setId)
    .eq('user_id', user.id)
    .single()

  if (setError || !dbSet) {
    throw createError({ statusCode: 404, message: 'Set not found' })
  }

  // Fetch tracks
  const { data: setTracks, error: tracksError } = await supabase
    .from('set_tracks')
    .select('*')
    .eq('set_id', setId)
    .order('position', { ascending: true })

  if (tracksError) {
    throw createError({ statusCode: 500, message: 'Failed to fetch tracks' })
  }

  const typedSetTracks = (setTracks || []) as DbSetTrack[]
  const soundcloudIds = typedSetTracks.map(st => st.soundcloud_id)

  // Fetch track details
  let trackDetails: TrackEntry[] = []
  if (soundcloudIds.length > 0) {
    const { data: tracks } = await supabase
      .from('tracks')
      .select('soundcloud_id, title, artist, duration, bpm_detected, key_detected, permalink_url')
      .in('soundcloud_id', soundcloudIds)

    trackDetails = (tracks || []) as unknown as (TrackEntry & { permalink_url?: string })[]
  }

  const trackMap = new Map(trackDetails.map(t => [t.id, t]))

  // Build export data
  const exportTracks: ExportTrack[] = typedSetTracks.map(st => {
    const track = trackMap.get(st.soundcloud_id) as (TrackEntry & { permalink_url?: string }) | undefined
    return {
      position: st.position + 1, // 1-indexed for users
      title: track?.title || 'Unknown',
      artist: track?.artist || 'Unknown',
      duration: track?.duration || 0,
      bpm: track?.bpm_detected || null,
      key: track?.key_detected || null,
      soundcloudUrl: track?.permalink_url || `https://soundcloud.com/track/${st.soundcloud_id}`,
      transitionNote: st.transition_note
    }
  })

  const totalDuration = exportTracks.reduce((sum, t) => sum + t.duration, 0)

  const exportData: ExportData = {
    set: {
      name: (dbSet as DbSet).name,
      genre: (dbSet as DbSet).genre,
      targetDuration: (dbSet as DbSet).target_duration || 3600,
      mood: ((dbSet as DbSet).mood || 'mixed') as SetMood,
      status: ((dbSet as DbSet).status || 'draft') as SetStatus,
      createdAt: (dbSet as DbSet).created_at || new Date().toISOString()
    },
    tracks: exportTracks,
    totalDuration,
    trackCount: exportTracks.length
  }

  // Export based on format
  switch (format) {
    case 'rekordbox':
      return exportRekordbox(exportData, event)
    case 'm3u':
      return exportM3U(exportData, event)
    case 'json':
    default:
      return exportJSON(exportData)
  }
})

function exportJSON(data: ExportData) {
  return data
}

function exportRekordbox(data: ExportData, event: Parameters<typeof setHeader>[0]) {
  const xml = generateRekordboxXML(data)

  setHeader(event, 'Content-Type', 'application/xml')
  setHeader(event, 'Content-Disposition', `attachment; filename="${sanitizeFilename(data.set.name)}.xml"`)

  return xml
}

function exportM3U(data: ExportData, event: Parameters<typeof setHeader>[0]) {
  const m3u = generateM3U(data)

  setHeader(event, 'Content-Type', 'audio/x-mpegurl')
  setHeader(event, 'Content-Disposition', `attachment; filename="${sanitizeFilename(data.set.name)}.m3u"`)

  return m3u
}

function generateRekordboxXML(data: ExportData): string {
  const tracks = data.tracks.map((t, i) => {
    const durationSec = Math.floor(t.duration / 1000)
    return `    <TRACK TrackID="${i + 1}" Name="${escapeXml(t.title)}" Artist="${escapeXml(t.artist)}"
      TotalTime="${durationSec}" AverageBpm="${t.bpm || 0}" Tonality="${t.key || ''}"
      Location="${escapeXml(t.soundcloudUrl)}" />`
  }).join('\n')

  const playlistTracks = data.tracks.map((_, i) =>
    `      <TRACK Key="${i + 1}" />`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<DJ_PLAYLISTS Version="1.0.0">
  <PRODUCT Name="Musaic" Version="1.0.0" Company="Musaic" />
  <COLLECTION Entries="${data.trackCount}">
${tracks}
  </COLLECTION>
  <PLAYLISTS>
    <NODE Type="0" Name="ROOT" Count="1">
      <NODE Name="${escapeXml(data.set.name)}" Type="1" KeyType="0" Entries="${data.trackCount}">
${playlistTracks}
      </NODE>
    </NODE>
  </PLAYLISTS>
</DJ_PLAYLISTS>`
}

function generateM3U(data: ExportData): string {
  const header = '#EXTM3U'
  const entries = data.tracks.map(t => {
    const durationSec = Math.floor(t.duration / 1000)
    return `#EXTINF:${durationSec},${t.artist} - ${t.title}\n${t.soundcloudUrl}`
  }).join('\n')

  return `${header}\n${entries}`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 50)
}
