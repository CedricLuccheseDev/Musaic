# Claude Code Guidelines - Musaic Monorepo

## Project Structure

```
Musaic/
├── apps/
│   ├── web/          # Frontend (Nuxt 3 / TypeScript)
│   └── analyzer/     # Backend (FastAPI / Python)
├── documentation/    # Project documentation
└── supabase/         # Database migrations
```

## Code Style

### General
- Comments in English
- SOLID architecture principles
- No eslint-disable or type:ignore comments

### TypeScript (apps/web/)
- camelCase for folders, files, and variables
- PascalCase for components and types
- Script above template in Vue files

### Python (apps/analyzer/)
- snake_case for files, functions, variables
- PascalCase for classes
- Docstrings for public functions

## Vue Script Sections

In Vue `<script setup>` blocks, organize code with section comments:

```vue
<script setup lang="ts">
/* --- Props --- */
/* --- Emits --- */
/* --- States --- */
/* --- Computed --- */
/* --- Methods --- */
/* --- Watchers --- */
/* --- Lifecycle --- */
</script>
```

Only include sections that are used.

## Components

- Max 100 lines per component
- Independent components: props, slots, emits
- Use Nuxt UI components

## Validation

**IMPORTANT: Before committing, run all CI checks locally:**

```bash
# Frontend (run all before commit)
cd apps/web && bun run lint && bun run test && bun run nuxi typecheck && bun run build

# Backend
python3 -m py_compile apps/analyzer/app/*.py
```

These are the same checks that run in CI. All must pass before committing.

## Testing

```bash
# Frontend
cd apps/web && bun run test

# Backend
cd apps/analyzer && python -m pytest
```

## CI/CD

GitHub Actions runs on every push:
1. Frontend: Lint → Tests → TypeCheck → Build
2. Backend: Syntax check
3. Release: Auto-tag on main

## Git Commits

When committing, use simple commit messages without signatures or generated-by footers.

```bash
# Good
git commit -m "feat: Add similar tracks feature"

# Bad (don't add these)
# 🤖 Generated with [Claude Code](https://claude.com/claude-code)
# Co-Authored-By: ...
```

## Database Population

When asked to add/populate tracks:

### Step 1: Web Search
Search for current popular artists for the requested genre.

### Step 2: Build Queries
Extract 20-40 artist names, label names, and genre terms.

### Step 3: Run Script
```bash
cd apps/web && bun scripts/populateTracks.ts '<JSON_CONFIG>'
```

Config format:
```json
{
  "queries": ["Artist1", "Artist2", "genre 2024"],
  "targetCount": 200,
  "freeDownloadOnly": false,
  "excludeMixes": true
}
```

## Database Cleanup

When user says "lance le clean", "cleanup", "nettoie la db" or similar:

```bash
cd apps/web && bun scripts/cleanupLowQualityTracks.ts -y
```

This removes tracks with quality score < 40 (mixes, too short/long, low engagement).
Use `-y` or `--force` to skip confirmation prompt.

## Beat Grid Reanalysis

When user says "réanalyse les beatgrids", "recalcule les beat offset", "fix beatgrid" or similar:

### All tracks
```bash
curl -X POST http://localhost:9000/analyze/batch/beat-offset
```

### Specific track (by soundcloud_id)
```bash
curl -X POST "http://localhost:9000/analyze/batch/beat-offset?soundcloud_id=<ID>"
```

This reanalyzes only the beat_offset using the existing BPM. Useful after algorithm improvements.
The analyzer must be running (`docker-compose up analyzer` or local uvicorn).

## Full Reanalysis

When user says "réanalyse tout", "full reanalysis", "recalcule tout" or similar:

```bash
curl -X POST http://localhost:9000/analyze/batch/full-reanalysis
```

This fully reanalyzes all completed tracks (BPM + beat_offset). Use after major algorithm changes.

## Analysis Status Check

To check the status of track analysis:

```bash
cd apps/web && bun scripts/checkAnalysisStatus.ts
```

## Database Seeding

To seed the database with initial data:

```bash
cd apps/web && bun run seed
```

Or directly:
```bash
cd apps/web && bun scripts/seed-database.ts
```
