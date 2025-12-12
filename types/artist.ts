export interface ArtistEntry {
  // Identifiers
  id: number
  permalink_url: string

  // Basic info
  username: string
  full_name: string | null
  avatar_url: string | null
  banner_url: string | null

  // Profile info
  description: string | null
  city: string | null
  country: string | null

  // Stats
  followers_count: number
  followings_count: number
  track_count: number
  playlist_count: number
  likes_count: number
  reposts_count: number

  // Social links
  website_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  facebook_url: string | null
  spotify_url: string | null
  youtube_url: string | null

  // Metadata
  genres: string[]
  labels: string[]
  artist_type: string | null

  // Status
  verified: boolean
  pro_user: boolean

  // Timestamps
  created_at: string | null
}
