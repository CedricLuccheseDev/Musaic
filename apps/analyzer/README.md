# Musaic Analyzer

Microservice d'analyse audio pour Musaic.

## Description

Musaic Analyzer extrait automatiquement les caractéristiques audio des tracks SoundCloud : BPM, tonalité, énergie, danceability, et bien plus. Il détecte automatiquement les moments forts (drops, refrains) et analyse 90 secondes autour de ce point.

## Fonctionnalités

### Analyse audio complète (22 features)

| Catégorie | Features |
|-----------|----------|
| **Rhythm** | BPM, confidence, beats count, onset rate |
| **Tonal** | Key, confidence, tuning frequency |
| **Dynamics** | Energy, loudness, dynamic complexity |
| **Timbre** | Spectral centroid, spectral complexity, dissonance, pitch salience |
| **High-level** | Danceability, speechiness, instrumentalness, acousticness, valence, liveness |
| **Highlight** | highlight_time (timestamp du moment fort) |

### Modes d'utilisation

- **API** : Analyse manuelle d'une track par ID
- **Batch** : Analyse de toutes les tracks en attente

## Stack technique

- **Framework** : FastAPI
- **Analyse audio** : Essentia (MTG)
- **Streaming audio** : httpx (API SoundCloud directe)
- **Base de données** : Supabase (PostgreSQL)
- **Conteneurisation** : Docker

## Architecture

```
app/
├── __init__.py          # Version
├── main.py              # FastAPI app + routers
├── config.py            # Settings (env vars)
├── logger.py            # Colored logging
├── models.py            # Pydantic schemas
├── analyzer.py          # Essentia audio analysis
├── downloader.py        # SoundCloud streaming/download
├── supabase_client.py   # Database operations
└── endpoints/
    ├── __init__.py
    ├── health.py        # GET /health
    ├── analyze.py       # POST /analyze (single track)
    └── batch.py         # POST /analyze/batch + status

scripts/
└── analyze_all_tracks.py  # CLI batch script
```

### Flow

```
     Musaic (Nuxt)
          │
          │ POST /analyze ou POST /analyze/batch
          ▼
┌───────────────────┐
│  Musaic Analyzer  │
│    (FastAPI)      │
└────────┬──────────┘
         │
    ┌────┴────┐
    ▼         ▼
Streaming  Essentia
 (httpx)   (analysis)
    │         │
    └────┬────┘
         ▼
   Supabase UPDATE
   (BPM, Key, Energy...)
```

## API Endpoints

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + queue status |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Analyser une track par soundcloud_id |
| `POST` | `/analyze/batch` | Lancer l'analyse batch (voir options ci-dessous) |
| `GET` | `/analyze/batch/status` | Statut de l'analyse batch en cours |

#### Options batch

```bash
# Analyser uniquement les tracks "pending"
curl -X POST http://localhost:8000/analyze/batch

# Analyser les tracks "pending" ET "failed" (retry)
curl -X POST http://localhost:8000/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{"include_failed": true}'
```

### Documentation interactive

- **Swagger UI** : `/docs`
- **ReDoc** : `/redoc`

## Installation

### Avec Docker (recommandé)

```bash
# Build et lancement
docker compose up -d

# Logs
docker compose logs -f
```

### Sans Docker

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python -m app.main
```

## Configuration

Créer un fichier `.env` :

```env
# Server
PORT=8000
HOST=0.0.0.0

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# SoundCloud (requis pour le streaming)
SOUNDCLOUD_CLIENT_ID=xxx

# Proxy (optionnel, pour contourner les blocages IP)
PROXY_URL=http://user:pass@host:port

# Analysis settings
AUDIO_DURATION_SECONDS=45
ANALYSIS_TIMEOUT_SECONDS=600
MAX_CONCURRENT_ANALYSES=4
```

## Scripts

```bash
# Lancer l'analyse batch (CLI)
./run_analysis.sh

# Options disponibles
./run_analysis.sh           # Tracks pending uniquement
./run_analysis.sh --force   # Re-analyser toutes les tracks
./run_analysis.sh --stream  # Mode streaming (sans fichier, pour VPS)
./run_analysis.sh -s -f     # Stream + force

# Via Docker
docker compose run --rm analyzer python -m scripts.analyze_all_tracks --stream
```

## Exemples d'utilisation

### Analyser une track manuellement

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"soundcloud_id": 123456789}'
```

### Lancer l'analyse batch

```bash
# Tracks pending uniquement
curl -X POST http://localhost:8000/analyze/batch

# Inclure les tracks failed (retry)
curl -X POST http://localhost:8000/analyze/batch \
  -H "Content-Type: application/json" \
  -d '{"include_failed": true}'
```

### Vérifier le statut batch

```bash
curl http://localhost:8000/analyze/batch/status
```

**Réponse** :
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

## Base de données

### Colonnes d'analyse dans `tracks`

```sql
-- Rhythm
bpm_detected INTEGER,
bpm_confidence REAL,
beats_count INTEGER,
onset_rate REAL,

-- Tonal
key_detected TEXT,        -- ex: "A minor"
key_confidence REAL,
tuning_frequency REAL,    -- ex: 440.0

-- Dynamics
energy REAL,              -- 0-1
loudness REAL,            -- dB (négatif)
dynamic_complexity REAL,  -- 0-1

-- Timbre
spectral_centroid REAL,   -- Hz
spectral_complexity REAL, -- 0-1
dissonance REAL,          -- 0-1
pitch_salience REAL,      -- 0-1

-- High-level
danceability REAL,        -- 0-1
speechiness REAL,         -- 0-1
instrumentalness REAL,    -- 0-1
acousticness REAL,        -- 0-1
valence REAL,             -- 0-1 (mood)
liveness REAL,            -- 0-1

-- Highlight
highlight_time REAL,      -- timestamp du moment fort (secondes)

-- Status
analysis_status TEXT,     -- pending/processing/completed/failed
analysis_error TEXT,
analyzed_at TIMESTAMPTZ
```

## Intégration avec Musaic

L'application Musaic appelle directement les endpoints API :

```typescript
// Analyser une track après insertion
await $fetch('https://analyzer.musaic.clhub.fr/analyze', {
  method: 'POST',
  body: { soundcloud_id: track.soundcloud_id }
})

// Lancer l'analyse batch
await $fetch('https://analyzer.musaic.clhub.fr/analyze/batch', {
  method: 'POST'
})
```

## Projet parent

- [Musaic](https://github.com/your-repo/musaic) - Application principale (Nuxt 3)

## TODO

- [ ] Configurer les classifieurs ML d'Essentia (genre, mood, voice/instrumental) - nécessite ~500MB de modèles

## Licence

MIT
