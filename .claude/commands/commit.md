# Smart Commit

Run validation then commit (no push - CI handles release).

## Instructions

1. **Run lint** with `npm run lint`
2. **Run build** with `npm run build`
3. **Run tests** with `npm run test`
4. **If any step fails**, stop and explain errors
5. **If all pass**, analyze changes with `git diff --staged` and `git diff`
6. **Stage all modified files** (ignore sensitive files like .env)
7. **Generate a concise commit message** in English:
   - Start with type (feat, fix, refactor, docs, test, chore)
   - Summarize changes in 1-2 lines max
   - Focus on "why" not "what"
   - Do NOT add "Generated with" or "Co-Authored-By" lines
8. **Create the commit** with generated message
9. **Do NOT push** - remind user to run `git push` manually after reviewing

## Message format

```
[type]: Concise description

- Detail 1 if needed
- Detail 2 if needed
```

Types: feat, fix, refactor, docs, test, chore

## Example

```
feat: Add premium check before AI search

- Wait for profile to load before search
- Prevent false positive AI limit errors
```
