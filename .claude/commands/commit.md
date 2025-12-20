# Smart Commit (Monorepo)

Run validation then commit (no push - CI handles release).

## Instructions

1. **Detect what changed**:
   - If `App/` changed: run frontend checks
   - If `Analyzer/` changed: run backend checks
   - If both: run all checks

2. **Frontend checks** (if App/ changed):
   - `cd App && npm run lint`
   - `cd App && npm run build`
   - `cd App && npm run test`

3. **Backend checks** (if Analyzer/ changed):
   - `python3 -m py_compile Analyzer/app/*.py Analyzer/app/endpoints/*.py`

4. **If any step fails**, stop and explain errors

5. **If all pass**, analyze changes with `git diff --staged` and `git diff`

6. **Stage all modified files** (ignore sensitive files like .env)

7. **Generate a concise commit message** in English:
   - Start with type (feat, fix, refactor, docs, test, chore)
   - Add scope if single area: `feat(app):` or `feat(analyzer):`
   - Summarize changes in 1-2 lines max
   - Focus on "why" not "what"
   - Do NOT add "Generated with" or "Co-Authored-By" lines

8. **Create the commit** with generated message

9. **Do NOT push** - remind user to run `git push` manually after reviewing

## Message format

```
[type]([scope]): Concise description

- Detail 1 if needed
- Detail 2 if needed
```

Types: feat, fix, refactor, docs, test, chore
Scopes: app, analyzer, shared, ci (or omit for cross-cutting changes)

## Examples

```
feat(app): Add premium check before AI search

- Wait for profile to load before search
- Prevent false positive AI limit errors
```

```
fix(analyzer): Handle missing audio stream gracefully
```

```
chore: Update CI workflow for monorepo structure
```
