# Musaic

Plateforme de recherche musicale pour DJs et producteurs.

**URL** : https://musaic.clhub.fr

## Structure

```
Musaic/
├── App/              # Frontend (Nuxt 3)
├── Analyzer/         # Backend (FastAPI)
├── shared/           # Documentation partagée
├── Dockerfile.app    # Build frontend
└── Dockerfile.analyzer # Build backend
```

## Quick Start

### Frontend
```bash
cd App
npm install
npm run dev
```

### Backend
```bash
cd Analyzer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Stack

| Service | Technologies |
|---------|--------------|
| **App** | Nuxt 3, Vue 3, TypeScript, Tailwind, Supabase |
| **Analyzer** | FastAPI, Essentia, Python 3.10 |

## Features

- Recherche de tracks SoundCloud
- Détection téléchargement gratuit / payant
- Recherche IA en langage naturel (Claude)
- Analyse audio (BPM, key, energy, danceability...)
- Authentification Google/Apple

## Documentation

- [Frontend README](App/README.md)
- [Analyzer README](Analyzer/README.md)
- [Contributing](shared/CONTRIBUTING.md)
- [Code Guidelines](CLAUDE.md)

## Deployment (Dokploy)

Configurer 2 services pointant vers ce repo :

| Service | Dockerfile |
|---------|------------|
| musaic-app | `Dockerfile.app` |
| musaic-analyzer | `Dockerfile.analyzer` |

## License

MIT
