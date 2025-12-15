# Musaic

L'outil de recherche musicale pour DJs et producteurs.

**URL** : https://musaic.clhub.fr

## Description

Musaic permet de rechercher un titre et de savoir instantanément où le télécharger : gratuitement si disponible, ou via un lien d'achat sinon. L'application propose également une recherche intelligente par IA pour explorer la base de données avec des questions en langage naturel.

## Fonctionnalités

### Recherche de tracks

- Barre de recherche par titre ou artiste
- Résultats paginés avec scroll infini (500 résultats max)
- Détection automatique des profils artistes
- Filtres : afficher/masquer tracks ou artistes, filtrer par statut de téléchargement

### Détection des téléchargements

- **Download direct** : Track téléchargeable gratuitement depuis SoundCloud
- **Free Link** : Lien externe gratuit (Hypeddit, etc.)
- **Achat** : Lien vers la plateforme d'achat

### Recherche IA

- Questions en langage naturel ("Trouve-moi des remixes de Drake", "DJ mixes de plus de 30 minutes")
- Conversion automatique en requêtes SQL via Claude AI
- Distinction intelligente entre DJ mixes (15+ min) et remixes (3-7 min)
- Recherche par genre, artiste, durée, BPM, key, statut de téléchargement

### Analyse audio (via musaic-analyzer)

- Détection automatique du BPM et de la tonalité
- Analyse de l'énergie et de la danceability
- Appel API direct à chaque ajout de track (fire-and-forget)

### Profils artistes

- Détection automatique si la recherche correspond à un artiste
- Affichage de l'avatar, nombre de followers
- Liste des 20 premiers tracks de l'artiste

### Autres fonctionnalités

- Authentification Google/Apple (Supabase Auth)
- Interface bilingue FR/EN
- Stockage automatique des tracks recherchés en base de données

## Stack technique

- **Framework** : Nuxt 3
- **UI** : Nuxt UI, Tailwind CSS
- **Backend** : Supabase (Auth + PostgreSQL)
- **APIs** :
  - soundcloud.ts (SoundCloud v2)
  - Anthropic Claude 3.5 Haiku (recherche IA)
- **Analyse audio** : musaic-analyzer (microservice Python + Essentia)
- **Langage** : TypeScript

## Architecture

```
Recherche utilisateur
       ↓
   ┌───────────────────────────────────────┐
   │                                       │
   ▼                                       ▼
SoundCloud API                        Claude AI
   │                                       │
   ▼                                       ▼
Tracks + Artistes détectés           SQL généré
   │                                       │
   └──────────────┬────────────────────────┘
                  ▼
            Supabase DB
                  │
   ┌──────────────┼──────────────┐
   ▼              ▼              ▼
🟢 Free DL   🟢 Free Link   🟡 Achat
                  │
                  │ (appel API fire-and-forget)
                  ▼
          musaic-analyzer ──► BPM, Key, Energy...
                  │
                  └──► UPDATE Supabase
```

### Détection du statut de téléchargement

```
Pour chaque track :
    ├─ downloadable = true ? → 🟢 Free DL (streaming API)
    └─ purchase_url existe ?
           ├─ purchase_title contient "free" → 🟢 Free Link
           └─ Sinon → 🟡 Lien d'achat
```

## Installation

```bash
npm install
npm run dev
```

## Scripts disponibles

```bash
npm run dev           # Serveur de développement
npm run build         # Build production
npm run lint          # Vérification ESLint
npm run test          # Test API SoundCloud
npm run test:supabase # Test connexion Supabase
```

### Population de la base

```bash
npx tsx scripts/populateTracks.ts '{"queries":["artist1","artist2"],"targetCount":200}'
```

## Variables d'environnement

```env
SUPABASE_URL=
SUPABASE_KEY=
ANTHROPIC_API_KEY=
ANALYZER_URL=          # URL du microservice musaic-analyzer (optionnel)
```

## CI/CD

- **Tests** : Lint, SoundCloud, Supabase, AI, Database, TypeCheck
- **Build** : Vérifié à chaque push
- **Versioning** : Tags automatiques (v1.0.x) sur main
- **Déploiement** : Dokploy (trigger sur tag)

## Projets liés

- [musaic-analyzer](./docs/ANALYZER_BRIEF.md) - Microservice d'analyse audio (Python/Essentia)

## Licence

MIT
