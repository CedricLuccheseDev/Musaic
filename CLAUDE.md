# Claude Code Guidelines

## Code Style

- Comments in English
- SOLID architecture principles
- camelCase for folders, files, and builtins
- PascalCase for custom components
- No eslint-disable comments

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
npm run build
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

