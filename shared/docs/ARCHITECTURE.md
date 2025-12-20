# Architecture Musaic

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         Utilisateur                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     App (Nuxt 3)                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │     Composables         │  │
│  │  - search   │  │  - search/  │  │  - useAuth              │  │
│  │  - dashboard│  │  - common/  │  │  - useProfile           │  │
│  │  - login    │  │  - home/    │  │  - useAudioPlayer       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Server API (Nitro)                      │  │
│  │  /api/search    /api/aiQuery    /api/analyze    /api/stream│  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────┬──────────────────┬────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
│   SoundCloud     │ │   Claude AI      │ │      Supabase        │
│   (API v2)       │ │   (Haiku 3.5)    │ │   (Auth + Postgres)  │
└──────────────────┘ └──────────────────┘ └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Analyzer (FastAPI)  │
                                          │  - /analyze          │
                                          │  - /analyze/batch    │
                                          │  - /health           │
                                          └──────────┬───────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────────┐
                                          │  Essentia (Audio ML) │
                                          │  BPM, Key, Energy... │
                                          └──────────────────────┘
```

## Services

### App (Frontend + BFF)

| Composant | Rôle |
|-----------|------|
| **Pages** | Routes Nuxt (search, dashboard, login...) |
| **Components** | UI réutilisables (Vue 3) |
| **Composables** | Logique partagée (auth, player...) |
| **Server API** | Backend-for-Frontend (Nitro) |

**Responsabilités :**
- Interface utilisateur
- Authentification (Supabase Auth)
- Recherche SoundCloud
- Recherche IA (Claude)
- Streaming audio
- Gestion des tracks en BDD

### Analyzer (Backend)

| Endpoint | Rôle |
|----------|------|
| `POST /analyze` | Analyse une track par soundcloud_id |
| `POST /analyze/batch` | Lance l'analyse de toutes les tracks pending |
| `GET /analyze/batch/status` | Statut du batch en cours |
| `GET /health` | Health check |

**Responsabilités :**
- Téléchargement audio (streaming SoundCloud)
- Analyse audio (Essentia + TensorFlow)
- Mise à jour BDD (22 features audio)

## Flux de données

### Recherche SoundCloud

```
User → App/search → /api/search → SoundCloud API
                                        ↓
                                   Tracks trouvés
                                        ↓
                              Insertion Supabase (si nouveaux)
                                        ↓
                              Fire-and-forget → Analyzer
                                        ↓
                              Analyze + Update BDD
```

### Recherche IA

```
User → "Trouve des remixes de Drake"
            ↓
      /api/aiQuery → Claude AI
            ↓
      SQL généré: SELECT * FROM tracks WHERE title ILIKE '%remix%' AND artist ILIKE '%drake%'
            ↓
      Supabase exec() → Résultats
```

## Base de données

### Table `tracks`

```sql
-- Identité
id, soundcloud_id, title, artist, duration, url, artwork_url

-- Téléchargement
downloadable, purchase_url, purchase_title, download_status

-- Analyse audio
bpm_detected, key_detected, energy, danceability, valence...
analysis_status (pending/processing/completed/failed)

-- Métadonnées
created_at, updated_at, analyzed_at
```

### Table `profiles`

```sql
id, user_id, is_premium, ai_queries_count, ai_queries_reset_at
```

## Sécurité

- **Auth** : Supabase Auth (Google/Apple OAuth)
- **API Keys** : Variables d'environnement (jamais commitées)
- **RLS** : Row Level Security sur Supabase
- **Rate Limiting** : Limite queries IA pour non-premium
