# Shared Schemas

JSON Schema definitions used as the **source of truth** for types shared between App (TypeScript) and Analyzer (Python).

## Files

| Schema | Description |
|--------|-------------|
| `analysis.schema.json` | Analysis types (status, results, API requests/responses) |
| `track.schema.json` | Track types (TrackEntry, DbTrack) |

## Generate Types

Run the generation script to create TypeScript and Python types:

```bash
./scripts/generate-types.sh
```

This generates:
- `shared/types/generated/*.ts` - TypeScript interfaces
- `Analyzer/app/generated/*.py` - Pydantic models

## Requirements

- **TypeScript**: `json-schema-to-typescript` (auto-installed)
- **Python**: `datamodel-code-generator` (auto-installed)

## Workflow

1. **Edit** the JSON Schema files
2. **Run** `./scripts/generate-types.sh`
3. **Commit** both schema and generated files

## Manual Types

The manually-written types in `shared/types/*.ts` are still valid and include:
- Helper functions (`trackEntryToDbTrack`, `dbTrackToTrackEntry`)
- Re-exports for backward compatibility

Generated types are in `shared/types/generated/` and can be imported alongside manual types.
