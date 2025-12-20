# Types partagés

Source de vérité pour les types TypeScript du projet.

## Structure

```
shared/types/
├── generated/
│   └── database.ts    # Généré depuis Supabase (ne pas éditer)
├── enums.ts           # Enums custom (DownloadStatus, AnalysisStatus)
├── helpers.ts         # Types dérivés + fonctions de conversion
├── index.ts           # Export centralisé
└── README.md
```

## Workflow

### 1. Modifier le schéma (source de vérité = BDD)

```bash
# Créer une nouvelle migration
vim supabase/migrations/004_add_new_column.sql
```

### 2. Régénérer les types

```bash
./shared/scripts/generate-types.sh
```

### 3. Mettre à jour les helpers si nécessaire

Si tu ajoutes un nouveau champ dans la BDD, mets à jour :
- `shared/types/helpers.ts` → `TrackEntry` interface
- `shared/types/helpers.ts` → fonctions de conversion
- `Analyzer/app/models.py` → modèles Pydantic

### 4. Commit

```bash
git add -A && git commit -m "feat: Add new field to tracks"
```

## Usage

### Dans App (Nuxt)

```typescript
import { TrackEntry, DownloadStatus, dbTrackToTrackEntry } from '@/types'
import type { DbTrack } from '@/types'
```

### Dans Analyzer (Python)

Les types équivalents sont dans `Analyzer/app/models.py`.

## Correspondance TypeScript ↔ Python

| TypeScript | Python |
|------------|--------|
| `Database['public']['Tables']['tracks']['Row']` | Requête Supabase directe |
| `TrackEntry` | N/A (frontend only) |
| `AnalysisStatus` | `AnalysisStatus(str, Enum)` |
| `DbTrackUpdate` | `TrackUpdate(BaseModel)` |

## Garde-fous

1. **BDD = source de vérité** : Les types sont générés depuis Supabase
2. **CI** : Le build échoue si les types ne correspondent pas
3. **TypeScript strict** : Les erreurs de type bloquent la compilation
