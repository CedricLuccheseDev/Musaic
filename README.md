# Musaic

Plateforme de recherche musicale pour DJs et producteurs.

**URL** : https://musaic.clhub.fr

## Structure

```
Musaic/
├── apps/
│   ├── web/          # Frontend (Nuxt 3)
│   └── analyzer/     # Backend (FastAPI)
├── documentation/    # Project docs
├── supabase/         # Database migrations
├── Dockerfile.web    # Build frontend
└── Dockerfile.analyzer # Build backend
```

## Quick Start

### Frontend
```bash
cd apps/web
npm install
npm run dev
```

### Backend
```bash
cd apps/analyzer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Stack

| Service | Technologies |
|---------|--------------|
| **Web** | Nuxt 3, Vue 3, TypeScript, Tailwind, Supabase |
| **Analyzer** | FastAPI, Essentia, Python 3.10 |

## Features

- Recherche de tracks SoundCloud
- Détection téléchargement gratuit / payant
- Recherche IA en langage naturel (Claude)
- Analyse audio (BPM, key, energy, danceability...)
- Authentification Google/Apple

## Documentation

- [Architecture](documentation/ARCHITECTURE.md)
- [API Reference](documentation/API.md)
- [Standards](documentation/STANDARDS.md)
- [Deployment](documentation/DEPLOYMENT.md)
- [Contributing](documentation/CONTRIBUTING.md)

## Deployment (Dokploy)

Configurer 2 services pointant vers ce repo :

| Service | Dockerfile |
|---------|------------|
| musaic-web | `Dockerfile.web` |
| musaic-analyzer | `Dockerfile.analyzer` |

## License

MIT
