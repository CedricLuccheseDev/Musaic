# Smart Commit

Run validation then commit and push.

## Instructions

1. **Run lint** with `npm run lint`
2. **Run tests** with `npm run test`
3. **If lint or tests fail**, stop and explain errors
4. **If all pass**, analyze changes with `git diff --staged` and `git diff`
5. **Stage all modified files** (ignore sensitive files like .env)
6. **Generate a concise commit message** in English:
   - Start with type (feat, fix, refactor, docs, test, chore)
   - Summarize changes in 1-2 lines max
   - Focus on "why" not "what"
   - Do NOT add "Generated with" or "Co-Authored-By" lines
7. **Create the commit** with generated message
8. **Push** to remote

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
