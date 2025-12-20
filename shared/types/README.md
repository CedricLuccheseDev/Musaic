# Shared Types

Types TypeScript partagés entre App et Analyzer.

## Structure

```
shared/types/
├── analysis.ts    # Types d'analyse audio
├── track.ts       # Types de track
└── index.ts       # Export centralisé
```

## Usage

### Dans App (TypeScript)
```typescript
// Via re-export (recommandé)
import type { TrackEntry } from '@/types/track'

// Ou directement
import type { TrackEntry } from '../../shared/types'
```

### Dans Analyzer (Python)
Les types Python équivalents sont dans `Analyzer/app/models.py`.

## Correspondance TypeScript ↔ Python

| TypeScript | Python | Fichier |
|------------|--------|---------|
| `AnalysisStatus` | `AnalysisStatus(str, Enum)` | models.py |
| `AnalysisResult` | `AnalysisResult(BaseModel)` | models.py |
| `AnalysisData` | `TrackUpdate(BaseModel)` | models.py |
| `AnalyzeRequest` | `AnalyzeRequest(BaseModel)` | models.py |
| `BatchStatusResponse` | `BatchStatusResponse(BaseModel)` | models.py |

## Modification des types

1. Modifier le fichier TypeScript dans `shared/types/`
2. Mettre à jour le fichier Python correspondant dans `Analyzer/app/models.py`
3. Tester les deux côtés
