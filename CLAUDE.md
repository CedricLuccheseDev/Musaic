# Claude Code Guidelines - Musaic Monorepo

## Project Structure

```
Musaic/
├── App/              # Frontend (Nuxt 3 / TypeScript)
├── Analyzer/         # Backend (FastAPI / Python)
└── shared/           # Shared documentation
```

## Code Style

### General
- Comments in English
- SOLID architecture principles
- No eslint-disable or type:ignore comments

### TypeScript (App/)
- camelCase for folders, files, and variables
- PascalCase for components and types
- Script above template in Vue files

### Python (Analyzer/)
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

After generating code:

```bash
# Frontend
cd App && npm run lint && npm run build

# Backend
python3 -m py_compile Analyzer/app/*.py
```

## Testing

```bash
# Frontend
cd App && npm run test

# Backend
cd Analyzer && python -m pytest
```

## CI/CD

GitHub Actions runs on every push:
1. Frontend: Lint → Tests → TypeCheck → Build
2. Backend: Syntax check
3. Release: Auto-tag on main

## Database Population (App)

When asked to add/populate tracks:

### Step 1: Web Search
Search for current popular artists for the requested genre.

### Step 2: Build Queries
Extract 20-40 artist names, label names, and genre terms.

### Step 3: Run Script
```bash
cd App && npx tsx scripts/populateTracks.ts '<JSON_CONFIG>'
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
