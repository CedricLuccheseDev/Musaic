# Contributing to Musaic

## Getting Started

```bash
git clone git@github.com:CedricLuccheseDev/Musaic.git
cd Musaic
```

### Frontend (App)
```bash
cd App
npm install
npm run dev
```

### Backend (Analyzer)
```bash
cd Analyzer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Development Workflow

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes following [code standards](../CLAUDE.md)
3. Test your changes
4. Commit with conventional format (see below)
5. Push and create a PR

## Commit Convention

Format: `type(scope): description`

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Scopes
- `app`: Frontend changes
- `analyzer`: Backend changes
- `shared`: Shared docs/configs
- `ci`: CI/CD changes

### Examples
```
feat(app): Add dark mode toggle
fix(analyzer): Handle timeout on large files
docs: Update README with new endpoints
```

## Pull Request

- Target `main` branch
- Describe changes clearly
- Ensure CI passes
