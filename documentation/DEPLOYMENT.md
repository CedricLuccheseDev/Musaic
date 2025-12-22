# Deployment Guide

## Infrastructure

| Service | URL | Plateforme |
|---------|-----|------------|
| App | https://musaic.clhub.fr | Dokploy |
| Analyzer | https://analyzermusaic.clhub.fr | Dokploy |
| Database | Supabase | Supabase Cloud |

## Dokploy Configuration

### Service: musaic-app

| Setting | Value |
|---------|-------|
| Source | GitHub: CedricLuccheseDev/Musaic |
| Branch | main |
| Build Type | Dockerfile |
| Dockerfile Path | `Dockerfile.app` |
| Context Path | `.` |
| Port | 3000 |

**Variables d'environnement:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
ANALYZER_URL=https://analyzer.musaic.clhub.fr
```

### Service: musaic-analyzer

| Setting | Value |
|---------|-------|
| Source | GitHub: CedricLuccheseDev/Musaic |
| Branch | main |
| Build Type | Dockerfile |
| Dockerfile Path | `Dockerfile.analyzer` |
| Context Path | `.` |
| Port | 8000 |

**Variables d'environnement:**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SOUNDCLOUD_CLIENT_ID=xxx
PORT=8000
HOST=0.0.0.0
```

## CI/CD Pipeline

```
Push to main
     │
     ▼
┌─────────────────┐
│  GitHub Actions │
│  - Lint         │
│  - Tests        │
│  - Build        │
└────────┬────────┘
         │ (si succès)
         ▼
┌─────────────────┐
│  Create Tag     │
│  v1.0.x         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Dokploy        │
│  Auto-deploy    │
│  on tag         │
└─────────────────┘
```

## Déploiement manuel

### Via Dokploy UI

1. Aller sur le dashboard Dokploy
2. Sélectionner le service
3. Cliquer "Deploy" ou "Redeploy"

### Via CLI (si configuré)

```bash
# Trigger rebuild sur Dokploy
curl -X POST https://dokploy.clhub.fr/api/deploy/musaic-app \
  -H "Authorization: Bearer <token>"
```

## Rollback

1. Aller sur Dokploy > Service > Deployments
2. Sélectionner un déploiement précédent
3. Cliquer "Rollback"

Ou via Git :
```bash
git revert HEAD
git push origin main
```

## Monitoring

### Logs

```bash
# Via Dokploy UI
Dashboard > Service > Logs

# Via Docker (si accès SSH)
docker logs musaic-app -f
docker logs musaic-analyzer -f
```

### Health Checks

```bash
# App
curl https://musaic.clhub.fr

# Analyzer
curl https://analyzer.musaic.clhub.fr/health
```

## Troubleshooting

### Build échoue

1. Vérifier les logs de build dans Dokploy
2. Tester le build localement :
   ```bash
   docker build -f Dockerfile.app -t test .
   ```

### Service ne démarre pas

1. Vérifier les variables d'environnement
2. Vérifier les logs du container
3. Vérifier que les ports ne sont pas déjà utilisés

### Analyzer timeout

1. Vérifier la connexion à SoundCloud (proxy peut être nécessaire)
2. Augmenter `ANALYSIS_TIMEOUT_SECONDS`
3. Réduire `MAX_CONCURRENT_ANALYSES`

## Backup

### Database (Supabase)

- Backups automatiques quotidiens (plan Pro)
- Export manuel : Supabase Dashboard > Database > Backups

### Code

- Historique Git complet sur GitHub
- Tags pour chaque release
