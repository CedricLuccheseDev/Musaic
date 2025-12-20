/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Run: ./shared/scripts/generate-types.sh
 *
 * This file is a placeholder. Generate real types with:
 *   SUPABASE_PROJECT_ID=xxx ./shared/scripts/generate-types.sh
 *
 * Or the script will try to extract the project ID from App/.env
 */

export interface Database {
  public: {
    Tables: {
      tracks: {
        Row: {
          soundcloud_id: number
          urn: string
          permalink_url: string
          title: string
          artist: string
          artwork: string | null
          duration: number
          genre: string | null
          description: string | null
          soundcloud_created_at: string | null
          label: string | null
          tags: string[] | null
          playback_count: number | null
          likes_count: number | null
          reposts_count: number | null
          comment_count: number | null
          bpm_detected: number | null
          bpm_confidence: number | null
          key_detected: string | null
          key_confidence: number | null
          energy: number | null
          loudness: number | null
          dynamic_complexity: number | null
          spectral_centroid: number | null
          dissonance: number | null
          danceability: number | null
          speechiness: number | null
          instrumentalness: number | null
          acousticness: number | null
          valence: number | null
          liveness: number | null
          analysis_status: string | null
          analysis_error: string | null
          analyzed_at: string | null
          download_status: string
          downloadable: boolean | null
          purchase_url: string | null
          purchase_title: string | null
          download_count: number | null
          embedding: number[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          soundcloud_id: number
          urn: string
          permalink_url: string
          title: string
          artist: string
          artwork?: string | null
          duration?: number
          genre?: string | null
          description?: string | null
          soundcloud_created_at?: string | null
          label?: string | null
          tags?: string[] | null
          playback_count?: number | null
          likes_count?: number | null
          reposts_count?: number | null
          comment_count?: number | null
          bpm_detected?: number | null
          bpm_confidence?: number | null
          key_detected?: string | null
          key_confidence?: number | null
          energy?: number | null
          loudness?: number | null
          dynamic_complexity?: number | null
          spectral_centroid?: number | null
          dissonance?: number | null
          danceability?: number | null
          speechiness?: number | null
          instrumentalness?: number | null
          acousticness?: number | null
          valence?: number | null
          liveness?: number | null
          analysis_status?: string | null
          analysis_error?: string | null
          analyzed_at?: string | null
          download_status?: string
          downloadable?: boolean | null
          purchase_url?: string | null
          purchase_title?: string | null
          download_count?: number | null
          embedding?: number[] | null
        }
        Update: {
          soundcloud_id?: number
          urn?: string
          permalink_url?: string
          title?: string
          artist?: string
          artwork?: string | null
          duration?: number
          genre?: string | null
          description?: string | null
          soundcloud_created_at?: string | null
          label?: string | null
          tags?: string[] | null
          playback_count?: number | null
          likes_count?: number | null
          reposts_count?: number | null
          comment_count?: number | null
          bpm_detected?: number | null
          bpm_confidence?: number | null
          key_detected?: string | null
          key_confidence?: number | null
          energy?: number | null
          loudness?: number | null
          dynamic_complexity?: number | null
          spectral_centroid?: number | null
          dissonance?: number | null
          danceability?: number | null
          speechiness?: number | null
          instrumentalness?: number | null
          acousticness?: number | null
          valence?: number | null
          liveness?: number | null
          analysis_status?: string | null
          analysis_error?: string | null
          analyzed_at?: string | null
          download_status?: string
          downloadable?: boolean | null
          purchase_url?: string | null
          purchase_title?: string | null
          download_count?: number | null
          embedding?: number[] | null
        }
      }
      profiles: {
        Row: {
          id: string
          is_premium: boolean | null
          is_admin: boolean | null
          premium_until: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          is_premium?: boolean | null
          is_admin?: boolean | null
          premium_until?: string | null
        }
        Update: {
          id?: string
          is_premium?: boolean | null
          is_admin?: boolean | null
          premium_until?: string | null
        }
      }
    }
    Functions: {
      find_similar_tracks: {
        Args: {
          source_track_id: number
          limit_count?: number
        }
        Returns: Database['public']['Tables']['tracks']['Row'][]
      }
    }
  }
}
