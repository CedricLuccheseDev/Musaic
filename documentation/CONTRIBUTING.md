# Contributing to Musaic

## Prerequisites

- Node.js 20+
- Python 3.10+
- A Supabase account (free tier works)

## Setting Up Your Development Environment

### 1. Clone the Repository

```bash
git clone git@github.com:CedricLuccheseDev/Musaic.git
cd Musaic
```

### 2. Set Up Supabase

You need your own Supabase instance to run the project locally.

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the script: [`supabase/migrations/init.sql`](../supabase/migrations/init.sql)
4. Get your credentials from Project Settings > API:
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (anon key)
   - `SUPABASE_SERVICE_KEY` (service role key - for analyzer only)

### 3. Frontend (apps/web/)

```bash
cd apps/web
npm install
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
ANTHROPIC_API_KEY=sk-ant-xxx  # Use your own key or contact maintainer
ANALYZER_URL=http://localhost:8000
```

> **Note:** For the AI search feature, you need an Anthropic API key. You can use your own key from [console.anthropic.com](https://console.anthropic.com), or contact the maintainer to request access.

Then run:
```bash
npm run dev
```

### 4. Backend (apps/analyzer/)

```bash
cd apps/analyzer
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SOUNDCLOUD_CLIENT_ID=your-client-id
```

Then run:
```bash
python -m app.main
```

## Development Workflow

1. Create a branch from `dev`: `git checkout -b feature/your-feature`
2. Make changes following [STANDARDS.md](STANDARDS.md)
3. Run validation locally (see commands above)
4. Commit: `git commit -m "feat(scope): description"`
5. Push and create a PR to `dev`

See [STANDARDS.md](STANDARDS.md) for commit conventions and code style.

## Pull Requests

- Target `dev` branch
- One feature/fix per PR
- Clear description of changes
- CI must pass

## Questions?

Open an issue on GitHub.
