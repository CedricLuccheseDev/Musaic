# Musaic

Music search platform for DJs and producers.

**URL**: https://musaic.clhub.fr

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

- SoundCloud track search
- Free / paid download detection
- AI-powered natural language search (Claude)
- Audio analysis (BPM, key, energy, danceability...)
- Google/Apple authentication

## Documentation

- [Architecture](documentation/ARCHITECTURE.md)
- [API Reference](documentation/API.md)
- [Standards](documentation/STANDARDS.md)
- [Deployment](documentation/DEPLOYMENT.md)
- [Contributing](documentation/CONTRIBUTING.md)

## Deployment (Dokploy)

Configure 2 services pointing to this repo:

| Service | Dockerfile |
|---------|------------|
| musaic-web | `Dockerfile.web` |
| musaic-analyzer | `Dockerfile.analyzer` |

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [LICENSE](LICENSE) for details.
