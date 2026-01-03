# API Reference

## Web API (Nuxt/Nitro)

Base URL: `https://musaic.clhub.fr/api`

### Search

#### `GET /api/search`

Search tracks on SoundCloud.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search term |
| `limit` | number | Number of results (default: 20) |
| `offset` | number | Pagination offset |

**Response:**
```json
{
  "tracks": [...],
  "artist": { ... } | null,
  "nextOffset": 20
}
```

### AI Query

#### `POST /api/aiQuery`

Natural language search powered by Claude AI.

**Body:**
```json
{
  "query": "Find Drake remixes"
}
```

**Response:**
```json
{
  "tracks": [...],
  "sql": "SELECT * FROM tracks WHERE ...",
  "explanation": "..."
}
```

### Analyze

#### `POST /api/analyze`

Trigger audio analysis for a track (fire-and-forget).

**Body:**
```json
{
  "soundcloud_id": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "message": "Analysis triggered"
}
```

### Stream

#### `GET /api/stream/[id]`

Stream audio for a track.

**Params:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | SoundCloud ID |

**Response:** Audio stream (audio/mpeg)

### Dashboard

#### `GET /api/dashboard/stats`

Get admin dashboard statistics.

**Response:**
```json
{
  "totalTracks": 1500,
  "analyzed": 1200,
  "pending": 250,
  "failed": 50
}
```

#### `POST /api/dashboard/analyze-batch`

Start batch analysis.

**Body:**
```json
{
  "includeFailed": false
}
```

---

## Analyzer API (FastAPI)

Base URL: `https://analyzer.musaic.clhub.fr`

Swagger UI: `/docs`

### Health

#### `GET /health`

Health check and queue status.

**Response:**
```json
{
  "status": "healthy",
  "queue_size": 0,
  "is_processing": false
}
```

### Analyze

#### `POST /analyze`

Analyze a track by SoundCloud ID.

**Body:**
```json
{
  "soundcloud_id": 123456789
}
```

**Response:**
```json
{
  "success": true,
  "track_id": 123456789,
  "results": {
    "bpm": 128,
    "key": "A minor",
    "energy": 0.85,
    "danceability": 0.92
  }
}
```

### Batch

#### `POST /analyze/batch`

Start analysis for all pending tracks.

**Body:**
```json
{
  "include_failed": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch analysis started",
  "total_tracks": 150
}
```

#### `GET /analyze/batch/status`

Get current batch status.

**Response:**
```json
{
  "is_running": true,
  "total_tracks": 150,
  "processed": 42,
  "successful": 40,
  "failed": 2,
  "current_track": "Artist - Track Title"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden (rate limit, not premium) |
| 404 | Not found |
| 500 | Server error |

## Authentication

The Web API uses Supabase Auth. JWT token is passed via cookie or `Authorization: Bearer <token>` header.

The Analyzer API has no authentication (internal use only).
