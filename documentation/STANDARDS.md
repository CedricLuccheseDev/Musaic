# Standards de Code

## Conventions de Nommage

### TypeScript (App/)

| Élément | Convention | Exemple |
|---------|------------|---------|
| Variables | camelCase | `userName`, `isLoading` |
| Constantes | UPPER_SNAKE | `MAX_RESULTS`, `API_URL` |
| Fonctions | camelCase | `fetchTracks()`, `handleClick()` |
| Classes/Types | PascalCase | `Track`, `UserProfile` |
| Composants Vue | PascalCase | `SearchBar.vue`, `TrackCard.vue` |
| Fichiers | camelCase | `useAuth.ts`, `trackStorage.ts` |
| Dossiers | camelCase | `components/`, `composables/` |

### Python (Analyzer/)

| Élément | Convention | Exemple |
|---------|------------|---------|
| Variables | snake_case | `user_name`, `is_loading` |
| Constantes | UPPER_SNAKE | `MAX_RESULTS`, `API_URL` |
| Fonctions | snake_case | `fetch_tracks()`, `analyze_audio()` |
| Classes | PascalCase | `TrackAnalysis`, `BatchStatus` |
| Fichiers | snake_case | `supabase_client.py`, `analyzer.py` |

## Structure des Fichiers

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

Format : `type(scope): description`

### Types

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout/modification de tests |
| `chore` | Maintenance, dépendances |
| `ci` | CI/CD |

### Scopes

| Scope | Usage |
|-------|-------|
| `app` | Frontend Nuxt |
| `analyzer` | Backend FastAPI |
| `shared` | Documentation partagée |
| `ci` | GitHub Actions |
| _(vide)_ | Changements transversaux |

### Exemples

```
feat(app): Add dark mode toggle
fix(analyzer): Handle timeout on large audio files
docs: Update API documentation
refactor(app): Simplify auth flow
chore: Update dependencies
```

## Tests

### Frontend (App/)

```bash
npm run test              # Tous les tests
npx tsx tests/ai.test.ts  # Test spécifique
```

### Backend (Analyzer/)

```bash
python -m pytest                    # Tous les tests
python -m pytest tests/test_api.py  # Test spécifique
```

## Linting

### Frontend

```bash
npm run lint        # Vérification
npm run lint --fix  # Correction auto
```

### Backend

```bash
ruff check .          # Vérification
ruff check --fix .    # Correction auto
ruff format .         # Formatage
```

## Règles Importantes

1. **Pas de `eslint-disable` ou `type: ignore`** sauf cas exceptionnel documenté
2. **Commentaires en anglais**
3. **Pas de console.log** en production (utiliser le logger)
4. **Pas de secrets dans le code** (utiliser .env)
5. **Max 100 lignes par composant Vue**
6. **Docstrings obligatoires** pour fonctions publiques Python
