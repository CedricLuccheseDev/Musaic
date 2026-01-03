# Code Standards

## Naming Conventions

### TypeScript (apps/web/)

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `userName`, `isLoading` |
| Constants | UPPER_SNAKE | `MAX_RESULTS`, `API_URL` |
| Functions | camelCase | `fetchTracks()`, `handleClick()` |
| Classes/Types | PascalCase | `Track`, `UserProfile` |
| Vue Components | PascalCase | `SearchBar.vue`, `TrackCard.vue` |
| Files | camelCase | `useAuth.ts`, `trackStorage.ts` |
| Folders | camelCase | `components/`, `composables/` |

### Python (apps/analyzer/)

| Element | Convention | Example |
|---------|------------|---------|
| Variables | snake_case | `user_name`, `is_loading` |
| Constants | UPPER_SNAKE | `MAX_RESULTS`, `API_URL` |
| Functions | snake_case | `fetch_tracks()`, `analyze_audio()` |
| Classes | PascalCase | `TrackAnalysis`, `BatchStatus` |
| Files | snake_case | `supabase_client.py`, `analyzer.py` |

## File Structure

### Vue Component

```vue
<script setup lang="ts">
/* --- Props --- */
const props = defineProps<{
  trackId: string
}>()

/* --- Emits --- */
const emit = defineEmits<{
  select: [id: string]
}>()

/* --- States --- */
const isLoading = ref(false)

/* --- Computed --- */
const isReady = computed(() => !isLoading.value)

/* --- Methods --- */
function handleClick() {
  emit('select', props.trackId)
}

/* --- Lifecycle --- */
onMounted(() => {
  // init
})
</script>

<template>
  <!-- template -->
</template>
```

### Python Module

```python
"""Module description."""

# Standard library
from typing import Optional

# Third-party
from fastapi import APIRouter
from pydantic import BaseModel

# Local
from app.config import settings

# Constants
MAX_RETRIES = 3


class MyModel(BaseModel):
    """Model description."""

    field: str


async def my_function(param: str) -> MyModel:
    """Function description."""
    pass
```

## Commits

Format: `type(scope): description`

### Types

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code refactoring |
| `test` | Tests |
| `chore` | Maintenance, dependencies |
| `ci` | CI/CD |

### Scopes

| Scope | Usage |
|-------|-------|
| `web` | Frontend Nuxt |
| `analyzer` | Backend FastAPI |
| `docs` | Documentation |
| `ci` | GitHub Actions |
| _(empty)_ | Cross-cutting changes |

### Examples

```
feat(web): Add dark mode toggle
fix(analyzer): Handle timeout on large audio files
docs: Update API documentation
refactor(web): Simplify auth flow
chore: Update dependencies
```

## Testing

### Frontend (apps/web/)

```bash
npm run test              # All tests
npx tsx tests/ai.test.ts  # Specific test
```

### Backend (apps/analyzer/)

```bash
python -m pytest                    # All tests
python -m pytest tests/test_api.py  # Specific test
```

## Linting

### Frontend

```bash
npm run lint        # Check
npm run lint --fix  # Auto-fix
```

### Backend

```bash
ruff check .          # Check
ruff check --fix .    # Auto-fix
ruff format .         # Format
```

## Important Rules

1. **No `eslint-disable` or `type: ignore`** unless documented exception
2. **Comments in English**
3. **No console.log** in production (use logger)
4. **No secrets in code** (use .env)
5. **Max 100 lines per Vue component**
6. **Docstrings required** for public Python functions
