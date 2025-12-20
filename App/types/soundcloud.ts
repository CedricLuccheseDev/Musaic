// SoundCloud API response types

export interface SoundcloudUser {
  id: number
  username: string
  permalink_url: string
  avatar_url: string
  full_name?: string
  description?: string
  city?: string
  country_code?: string
  followers_count: number
  followings_count?: number
  track_count: number
  playlist_count?: number
  likes_count?: number
  reposts_count?: number
  visuals?: {
    visuals?: Array<{
      visual_url?: string
    }>
  }
  verified?: boolean
  creator_subscriptions?: Array<{ product?: { id?: string } }>
  created_at?: string
}

export interface SoundcloudTrack {
  id: number
  urn: string
  title: string
  user?: { id: number; username: string }
  artwork_url?: string
  permalink_url: string
  duration: number
  genre?: string
  description?: string
  created_at?: string
  label_name?: string
  tag_list?: string
  playback_count?: number
  likes_count?: number
  reposts_count?: number
  comment_count?: number
  downloadable?: boolean
  download_url?: string
  purchase_url?: string
  purchase_title?: string
  media?: {
    transcodings: Array<{
      url: string
      preset: string
      format: { protocol: string }
    }>
  }
}

export interface SoundcloudSearchResponse {
  collection: SoundcloudTrack[]
  next_href: string | null
  total_results?: number
}

export interface SoundcloudUserSearchResponse {
  collection: SoundcloudUser[]
}

export interface SoundcloudOptions {
  proxy?: string
}

export interface SoundcloudInstance {
  tracks: {
    search: (params: { q: string; limit?: number; offset?: number }) => Promise<SoundcloudSearchResponse>
    get: (id: number) => Promise<SoundcloudTrack>
  }
  users: {
    search: (params: { q: string; limit?: number }) => Promise<SoundcloudUserSearchResponse>
    tracks: (userId: number) => Promise<SoundcloudTrack[]>
  }
  util: {
    streamLink: (track: SoundcloudTrack, protocol?: 'progressive' | 'hls') => Promise<string>
  }
}

export interface SoundcloudConstructor {
  new (clientId?: string, oauthToken?: string, options?: SoundcloudOptions): SoundcloudInstance
}
