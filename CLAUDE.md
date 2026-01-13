# Claude Code Guidelines - Musaic

## Code Standards

See [documentation/STANDARDS.md](documentation/STANDARDS.md) for complete style guide.

**Quick reference:**
- TypeScript: camelCase files/vars, PascalCase components/types
- Python: snake_case, PascalCase classes
- No `eslint-disable` or `type:ignore`
- Comments in English

## Validation Before Commit

```bash
# Frontend
cd apps/web && bun run lint && bun run test && bun run nuxi typecheck && bun run build

# Backend
python3 -m py_compile apps/analyzer/app/*.py
```

## Git Commits

Simple conventional format, no signatures:

```bash
git commit -m "feat(web): add feature"
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
