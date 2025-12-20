# API Reference

## App API (Nuxt/Nitro)

Base URL: `https://musaic.clhub.fr/api`

### Search

#### `GET /api/search`

Recherche de tracks sur SoundCloud.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Terme de recherche |
| `limit` | number | Nombre de résultats (default: 20) |
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

Recherche en langage naturel via Claude AI.

**Body:**
```json
{
  "query": "Trouve des remixes de Drake"
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

Déclenche l'analyse audio d'une track (fire-and-forget).

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

Stream audio d'une track.

**Params:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | SoundCloud ID |

**Response:** Audio stream (audio/mpeg)

### Dashboard

#### `GET /api/dashboard/stats`

Statistiques pour le dashboard admin.

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

Lance l'analyse batch.

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

Health check et statut de la queue.

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

Analyse une track par son SoundCloud ID.

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

Lance l'analyse de toutes les tracks en attente.

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

Statut du batch en cours.

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

## Codes d'erreur

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé (limite atteinte, non premium) |
| 404 | Ressource non trouvée |
| 500 | Erreur serveur |

## Authentification

L'API App utilise Supabase Auth. Le token JWT est passé via cookie ou header `Authorization: Bearer <token>`.

L'API Analyzer n'a pas d'authentification (usage interne uniquement).
