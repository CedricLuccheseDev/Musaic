# Musaic

L'outil de recherche musicale pour DJs et producteurs.

**URL** : https://musaic.clhub.fr

## Description

Musaic permet de rechercher un titre et de savoir instantanément où le télécharger : gratuitement si disponible, ou via un lien d'achat sinon.

## Fonctionnalités

### MVP

- Barre de recherche par titre ou artiste
- Détection automatique des free downloads (SoundCloud)
- Lien d'achat si pas de téléchargement gratuit
- Lien YouTube Converter (utilisateurs privilégiés)

### V2

- Authentification utilisateur
- Historique de recherche
- Base communautaire de free downloads + signalement liens morts
- Métadonnées (BPM, Key, Genre, Camelot)

### V3

- Rechercher par genre, BPM, Key

## Utilisation

1. Rechercher un titre ou artiste
2. Consulter les résultats avec leur statut :
   - 🟢 Free Download disponible
   - 🟡 Achat uniquement
3. Cliquer sur le lien correspondant

## Stack technique

- **Framework** : Nuxt
- **Backend** : Firebase (Auth + Firestore)
- **API** : soundcloud.ts (SoundCloud v2)

## Architecture

```
Recherche utilisateur
       ↓
   SoundCloud API (soundcloud.ts)
       ↓
   Pour chaque track :
       ├─ downloadable = true ? → 🟢 Free DL (download_url)
       └─ purchase_url existe ?
              ├─ purchase_title contient "free" → 🟢 Free DL
              └─ Sinon → 🟡 Lien d'achat
```

## Permissions

| Fonctionnalité | Public | Privilégié |
|----------------|--------|------------|
| Recherche | ✓ | ✓ |
| Free Download | ✓ | ✓ |
| Lien d'achat | ✓ | ✓ |
| YouTube Converter | ✗ | ✓ |

## Installation

```bash
npm install
npm run dev
```

## Licence

MIT
