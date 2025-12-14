# Claude Code Guidelines

## Code Style

- Comments in English
- SOLID architecture principles
- camelCase for folders, files, and builtins
- PascalCase for custom components
- No eslint-disable comments
- Script above template in Vue files

## Vue Script Sections

In Vue `<script setup>` blocks, organize code with section comments in this order:

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

Only include sections that are used. Skip empty sections.

## Components

- Max 100 lines per component
- Independent components: props, slots, emits
- Use Nuxt UI components as much as possible

## Project Structure

- Directory-first organization
- Group by feature, not by type

## Validation

After generating code, always run:

```bash
npm run lint
npm run build // After a big change
```

## Testing

Run SoundCloud API test:

```bash
npm run test
```

## CI/CD

GitHub Actions runs on every push:

1. Lint
2. SoundCloud API test
3. Build

## Database Population

When the user asks to add/populate tracks (e.g., "Ajoute 200 tracks de techno", "Remplis avec du dubstep"):

### Step 1: Web Search
Use WebSearch to find current popular artists and labels for the requested genre. Search for things like:
- "best [genre] artists 2024 2025"
- "popular [genre] producers"
- "[genre] labels soundcloud"

### Step 2: Build Queries
From the web search results, extract 20-40 artist names, label names, and genre terms to use as search queries.

### Step 3: Run Script
```bash
npx tsx scripts/populateTracks.ts '<JSON_CONFIG>'
```

Config format (queries is REQUIRED):
```json
{
  "queries": ["Artist1", "Artist2", "genre 2024", "label name"],
  "targetCount": 200,
  "freeDownloadOnly": false,
  "excludeMixes": true
}
```

### Example Flow
User: "Ajoute 150 tracks de hardstyle récent"

1. WebSearch: "best hardstyle artists 2024 2025 producers"
2. Extract artists from results (e.g., Headhunterz, Wildstylez, Da Tweekaz...)
3. Run: `npx tsx scripts/populateTracks.ts '{"queries":["Headhunterz","Wildstylez","Da Tweekaz","hardstyle 2024","Q-dance"],"targetCount":150}'`

The script searches SoundCloud, filters tracks (duration < 5min, no mixes), and inserts into Supabase.

