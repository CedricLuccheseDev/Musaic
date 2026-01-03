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
2. Make changes following [code standards](STANDARDS.md)
3. Test your changes locally
4. Run linting: `npm run lint` (frontend)
5. Commit with conventional format
6. Push and create a PR targeting `dev`

## Commit Convention

Format: `type(scope): description`

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples
```
feat(web): Add dark mode toggle
fix(analyzer): Handle timeout on large files
docs: Update API documentation
```

## Pull Requests

- Target the `dev` branch
- Describe your changes clearly
- Ensure CI passes (lint, tests, build)
- One feature/fix per PR

## Need Help?

Open an issue on GitHub if you have questions.
