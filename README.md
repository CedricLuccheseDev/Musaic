# Musaic

Music search platform for DJs and producers.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

## Features

- SoundCloud track search
- Free / paid download detection
- AI-powered natural language search (Claude)
- Audio analysis (BPM, key, energy, danceability...)
- Similar tracks via vector embeddings
- Google/Apple authentication

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
- [Code Standards](documentation/STANDARDS.md)
- [Contributing](documentation/CONTRIBUTING.md)

## Contributing

Contributions are welcome! Please read the [Contributing Guide](documentation/CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [LICENSE](LICENSE) for details.
