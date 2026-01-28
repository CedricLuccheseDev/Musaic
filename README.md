# Musaic

Music search platform for DJs and producers.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![CI](https://github.com/CedricLuccheseDev/Musaic/actions/workflows/ci.yml/badge.svg)](https://github.com/CedricLuccheseDev/Musaic/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](documentation/CONTRIBUTING.md)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-contributor%20covenant-purple.svg)](documentation/CODE_OF_CONDUCT.md)

## Features

- SoundCloud track search
- Free / paid download detection
- AI-powered natural language search (Claude)
- Audio analysis (BPM, key, energy, danceability...)
- Similar tracks via vector embeddings
- SoundCloud authentication

## Quick Start

> See [Contributing Guide](documentation/CONTRIBUTING.md) for full setup instructions including Supabase configuration.

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

## Project Structure

```
Musaic/
├── apps/
│   ├── web/          # Frontend (Nuxt 3)
│   └── analyzer/     # Backend (FastAPI)
├── documentation/    # Project docs
├── supabase/         # Database migrations
├── Dockerfile.web
└── Dockerfile.analyzer
```

## Tech Stack

| Service | Technologies |
|---------|--------------|
| **Web** | Nuxt 3, Vue 3, TypeScript, Tailwind, Supabase |
| **Analyzer** | FastAPI, Essentia, Python 3.10 |

## Documentation

- [Features & Architecture](documentation/FEATURES.md)
- [API Reference](documentation/API.md)
- [Contributing Guide](documentation/CONTRIBUTING.md)
- [Code Standards](documentation/STANDARDS.md)
- [Code of Conduct](documentation/CODE_OF_CONDUCT.md)
- [Security Policy](documentation/SECURITY.md)

## Contributing

Contributions are welcome! See [Contributing Guide](documentation/CONTRIBUTING.md) for setup instructions.

**Quick start:**
1. Create branch from `dev`: `git checkout -b feature/your-feature`
2. Make changes following [code standards](documentation/STANDARDS.md)
3. Run tests & validation
4. Create PR to `dev`

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [LICENSE](LICENSE) for details.
