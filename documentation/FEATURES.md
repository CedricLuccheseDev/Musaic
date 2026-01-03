# Musaic - Features & Architecture

## Overview

Musaic is a music discovery platform that searches SoundCloud, analyzes audio tracks, and provides intelligent search capabilities.

```
┌─────────────────────────────────────────────────────────────────────┐
│                              User                                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend (Nuxt 3 / Vue 3)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │
│  │   Pages     │  │ Components  │  │       Server API (Nitro)    │  │
│  │  - search   │  │  - search/  │  │  /api/search  /api/aiQuery  │  │
│  │  - dashboard│  │  - common/  │  │  /api/stream  /api/analyze  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │
└───────────┬───────────────┬───────────────────────┬─────────────────┘
            │               │                       │
            ▼               ▼                       ▼
┌───────────────┐   ┌───────────────┐       ┌─────────────────────────┐
│  SoundCloud   │   │   Claude AI   │       │        Supabase         │
│   (Search)    │   │  (AI Search)  │       │  ┌─────────┐ ┌───────┐  │
└───────────────┘   └───────────────┘       │  │PostgreSQL│ │ Auth  │  │
                                            │  │+ pgvector│ │       │  │
                                            │  └────┬────┘ └───────┘  │
                                            └───────┼─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────────────┐
                                            │   Analyzer (FastAPI)    │
                                            │  ┌─────────────────┐    │
                                            │  │    Essentia     │    │
                                            │  │  (Audio ML)     │    │
                                            │  └─────────────────┘    │
                                            └─────────────────────────┘
```

---

## Core Features

### 1. Track Search

Search tracks from SoundCloud with real-time results.

**Flow:**
1. User enters search query
2. Frontend calls SoundCloud API
3. Results saved to Supabase (if new)
4. Tracks displayed with audio features (if analyzed)

### 2. AI Search

Natural language search powered by Claude AI.

**Example:**
```
User: "Find energetic dubstep tracks above 140 BPM"

Claude generates SQL:
SELECT * FROM tracks
WHERE genre ILIKE '%dubstep%'
AND bpm_detected > 140
AND energy > 0.7

→ Returns matching tracks from database
```

### 3. Audio Analysis

Deep audio analysis using Essentia ML models.

**Analyzed Features:**

| Category | Fields |
|----------|--------|
| Rhythm | `bpm_detected`, `bpm_confidence` |
| Tonal | `key_detected`, `key_confidence` |
| Dynamics | `energy`, `loudness`, `dynamic_complexity` |
| Timbre | `spectral_centroid`, `dissonance` |
| High-level | `danceability`, `speechiness`, `instrumentalness`, `acousticness`, `valence`, `liveness` |

### 4. Similar Tracks (Vector Search)

Find acoustically similar tracks using pgvector cosine similarity.

**How it works:**
1. Each analyzed track has a 1280-dimensional embedding vector
2. Embeddings capture acoustic features (rhythm, timbre, mood)
3. Cosine distance measures similarity between vectors
4. Lower distance = more similar tracks

---

## Database Schema

### tracks table

| Column | Type | Description |
|--------|------|-------------|
| `soundcloud_id` | BIGINT (PK) | SoundCloud unique ID |
| `title` | TEXT | Track title |
| `artist` | TEXT | Artist name |
| `duration` | INTEGER | Duration in ms |
| `genre` | TEXT | Genre tag |
| `bpm_detected` | REAL | BPM (60-200) |
| `key_detected` | TEXT | Musical key (e.g. "A minor") |
| `energy` | REAL | Energy level (0-1) |
| `danceability` | REAL | Danceability (0-1) |
| `embedding` | VECTOR(1280) | Audio feature vector |
| `analysis_status` | TEXT | pending/processing/completed |
| `download_status` | TEXT | FreeDirectLink/FreeExternalLink/No |

### profiles table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | User ID (from auth.users) |
| `is_premium` | BOOLEAN | Premium subscription |
| `is_admin` | BOOLEAN | Admin access |

---

## Tech Stack

### Frontend
- **Framework**: Nuxt 3 (Vue 3)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Nuxt UI

### Backend
- **API**: FastAPI (Python)
- **Audio Analysis**: Essentia + TensorFlow

### Database
- **Platform**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth (Google/Apple OAuth)

### Infrastructure
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
