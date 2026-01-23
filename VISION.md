# Musaic v2 - Vision Produit

> **IMPORTANT POUR L'IMPLÉMENTATION**
> Ce document décrit l'état CIBLE de l'application. Le repo contient du code legacy à ignorer/supprimer.
> Voir la section "État Actuel vs Cible" ci-dessous.

---

## État Actuel vs Cible

### Code à IGNORER (ne pas utiliser comme référence)

| Fichier/Dossier | Raison |
|-----------------|--------|
| `pages/search.vue` | Remplacé par playlist page |
| `pages/set-creator.vue` | Remplacé par nouveau flow |
| `pages/dashboard.vue` | Admin, hors scope |
| `components/dj/*` | Fonctionnalité DJ supprimée |
| `components/set-creator/*` | Remplacé par playlist |
| `components/home/*` | À refaire pour landing |
| `server/api/set-creator/*` | Remplacé par playlist API |
| `composables/useSetCreator.ts` | Remplacé par usePlaylist |

### Auth à IGNORER

| Actuel | Cible |
|--------|-------|
| `signInWithGoogle()` | **SUPPRIMER** - SoundCloud uniquement |
| `signInWithApple()` | **SUPPRIMER** - SoundCloud uniquement |
| `pages/login.vue` (Google/Apple buttons) | **REFAIRE** - SoundCloud uniquement |

### Terminologie

| Ancien terme | Nouveau terme |
|--------------|---------------|
| "set" | "playlist" |
| "set creator" | "playlist creator" ou juste "CREATE" |
| useSetCreator | usePlaylist |

### Ce qui est CONSERVÉ

- `tracks` table et tout ce qui la concerne
- `useSupabase`, `useAuth` (base, pas les méthodes Google/Apple)
- `server/api/search.ts` (recherche IA)
- `server/services/aiQuery.ts`
- Composants UI génériques (`common/*`, `search/*`)
- Python Analyzer (inchangé)

---

## Vision

| Aspect | Décision |
|--------|----------|
| **Problème** | Les DJs passent trop de temps à diguer des tracks pour leurs sets |
| **Solution** | Recherche IA conversationnelle + création de playlists avec swipe |
| **Cible** | Tous les DJs (débutants à confirmés) |
| **Proposition de valeur** | "Tinder de tracks" - swipe pour construire des playlists personnalisées |

---

## Concept Core : Playlist = Conversation

**Une playlist Musaic fonctionne comme une conversation Claude :**
- Chaque recherche = nouvelle conversation
- L'historique des likes/skips = le contexte qui affine l'IA
- Tu peux reprendre une "conversation" plus tard
- Jetable si non utilisée (auto-suppression)

**Il n'y a pas de page "recherche" séparée.** La recherche de tracks SE FAIT dans une playlist.

---

## Business Model

| Aspect | Décision |
|--------|----------|
| Modèle | Freemium |
| Quota free | **5 recherches IA/jour** |
| Premium | Recherches illimitées |
| Langues | FR + EN |

---

## Authentification

| Provider | Rôle |
|----------|------|
| **SoundCloud OAuth** | Unique - import des likes, export playlists |

**Pas de Google/Apple pour la v1.** Simplifie le flow et garantit l'accès aux fonctionnalités core (likes, export).

### Synchronisation des Likes

**À chaque connexion SoundCloud :**
1. Récupérer tous les likes de l'utilisateur via l'API SC
2. Pour chaque track likée :
   - Si la track n'existe pas dans `tracks` → l'ajouter (infos basiques)
   - Ajouter l'entrée dans `user_liked_tracks`
3. Marquer la date de dernière sync

**Comportement :**
- **Première connexion** : Import complet (peut prendre quelques secondes)
- **Connexions suivantes** : Sync incrémentale (seulement les nouveaux likes)
- **Sync manuelle** : Bouton dans Settings pour forcer une resync

**Tracks importées :**
- Les tracks likées sont ajoutées à la table `tracks` avec les infos de base
- Elles sont marquées `analysis_status = 'pending'` pour être analysées plus tard
- L'analyse (BPM, key, etc.) se fait en background

---

## Architecture Pages

```
pages/
├── index.vue              # Landing page (public)
├── login.vue              # Auth (redirect vers SC OAuth)
├── auth/
│   └── callback.vue       # SoundCloud OAuth callback
└── app/                   # AUTH REQUIRED (middleware)
    ├── index.vue          # Dashboard (liste des playlists)
    ├── playlist/
    │   └── [id].vue       # Page playlist (swipe + recherche)
    └── settings.vue       # Paramètres compte
```

**Séparation claire :**
- `/` → Landing page publique
- `/app/*` → Application protégée (middleware auth)

---

## Landing Page (index.vue - non connecté)

```
┌─────────────────────────────────────────────────────────────┐
│  musaic                                    [Se connecter]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              Trouve ta prochaine track                      │
│                    en 30 secondes                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "techno dark 125bpm pour warm up..."               │   │
│  │                                      [Rechercher]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              Essaie gratuitement, sans compte               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Comment ça marche ?                                        │
│                                                             │
│  1. Décris ce que tu cherches en langage naturel           │
│  2. Swipe les tracks proposées par l'IA                    │
│  3. Exporte ta playlist sur SoundCloud                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Se connecter avec SoundCloud]                             │
│                                                             │
│  Connecte-toi pour :                                        │
│  • Sauvegarder tes playlists                               │
│  • Importer tes likes pour des suggestions personnalisées  │
│  • Exporter directement sur SoundCloud                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow Test Sans Compte

```
1. User arrive sur landing page
2. Tape une recherche IA
3. Résultats affichés en mode "preview" (swipe possible)
4. Quand il veut sauvegarder ou continuer → Modal login
5. Après login → La playlist temporaire est liée à son compte
```

**Limitations mode non connecté :**
- Pas de sauvegarde
- Pas de suggestions basées sur les likes
- Pas d'export SoundCloud
- Quota limité (1-2 recherches de test ?)

---

## Dashboard (app/index.vue)

```
┌─────────────────────────────────────────────────────────────┐
│  musaic                                          [profile]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Rechercher dans mes playlists...]                         │
│                                                             │
│  ┌────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │   +    │ │ Techno Dark│ │ Warm Up    │ │ Chill House│   │
│  │ CREATE │ │ 12 tracks  │ │ 8 tracks   │ │ 5 tracks   │   │
│  │        │ │ 58 min     │ │ 42 min     │ │ 23 min     │   │
│  └────────┘ └────────────┘ └────────────┘ └────────────┘   │
│                                                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "techno dark 125bpm pour warm up..."               │   │
│  │                                         [Rechercher]│   │
│  └─────────────────────────────────────────────────────┘   │
│           ↑ IA Searchbar (toujours visible)                 │
└─────────────────────────────────────────────────────────────┘
```

### Éléments du Dashboard

| Élément | Fonction |
|---------|----------|
| **Searchbar playlists** | Filtrer/rechercher dans ses playlists existantes |
| **Bouton CREATE** | Flow guidé pour créer une playlist |
| **Cartes playlists** | Accès aux playlists existantes |
| **IA Searchbar** | Flow direct - crée une playlist et lance la recherche |

---

## Deux Chemins d'Entrée

### Chemin 1 : CREATE (Guidé)

Pour les utilisateurs qui explorent ou ne savent pas exactement ce qu'ils veulent.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Retour                    NOUVELLE PLAYLIST              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Comment veux-tu commencer ?                                │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Partir d'une track de référence                    │   │
│  │  Colle un lien SoundCloud ou recherche              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Partir de mes likes SoundCloud                     │   │
│  │  Choisis une track que tu as likée                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Décrire ce que je veux                             │   │
│  │  "Techno dark pour warm up, 60 min"                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Étapes suivantes (si track de référence) :**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Retour                         CRITÈRES                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Référence : "Artist - Track Name"                    [✓]  │
│                                                             │
│  Durée cible :                                             │
│  [30 min] [60 min] [90 min] [120 min] [Libre]              │
│                                                             │
│  Style :                                                   │
│  [Auto] [Techno] [House] [Trance] [...]                    │
│                                                             │
│  [ ] Free download uniquement                              │
│                                                             │
│  Nom : "Techno Dark - 23 Jan 2026"             [modifier]  │
│                                                             │
│                    [Commencer →]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Chemin 2 : IA Searchbar (Direct)

Pour les power users qui savent ce qu'ils veulent.

```
User tape: "techno dark 125bpm pour warm up 60min"
                              ↓
              IA déduit automatiquement :
              - Style: Techno Dark
              - BPM: ~125
              - Durée: 60 min
              - Mood: Warm up
                              ↓
         Playlist créée → Page playlist → Swipe commence
```

**Si le prompt n'est pas assez clair :**
```
User tape: "un truc chill"
                              ↓
              IA demande des précisions :
              "Tu veux quelle durée ?
               Plutôt house, ambient, downtempo ?"
                              ↓
              User répond
                              ↓
         Playlist créée → Page playlist → Swipe commence
```

---

## Page Playlist (playlist/[id].vue)

**C'est LA page centrale de l'app.** Tout se passe ici : recherche, swipe, gestion.

```
┌─────────────────────────────────────────────────────────────┐
│  ← Dashboard    Techno Dark - 23 Jan 2026       [⚙️] [📤]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "trouve moi des tracks plus dark..."               │   │
│  └─────────────────────────────────────────────────────┘   │
│           ↑ IA Searchbar contextuelle                       │
│                                                             │
│              ┌───────────────────────────┐                  │
│              │                           │                  │
│              │         ARTWORK           │                  │
│              │                           │                  │
│              │   Artist Name             │                  │
│              │   Track Title             │                  │
│              │   125 BPM • Am • Techno   │                  │
│              │                           │                  │
│              │        [ ▶ Play ]         │                  │
│              │                           │                  │
│              │    👎 Skip    👍 Add      │                  │
│              │                           │                  │
│              └───────────────────────────┘                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ████████████░░░░░░░░ 35 min / 60 min                       │
├─────────────────────────────────────────────────────────────┤
│  Tracks (7) :                                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐         │
│  │ T1 │ │ T2 │ │ T3 │ │ T4 │ │ T5 │ │ T6 │ │ T7 │  →      │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘         │
└─────────────────────────────────────────────────────────────┘
```

### Comportement du Swipe

| Action | Résultat |
|--------|----------|
| **👍 Add** | Track ajoutée à la playlist + IA affine ses suggestions |
| **👎 Skip** | Track ignorée + IA apprend ce que l'utilisateur ne veut PAS |
| **▶ Play** | Preview audio (manuel) |
| **IA Searchbar** | Affine la recherche en cours ("plus dark", "moins rapide", etc.) |

### Feedback Loop IA

- Plus l'utilisateur swipe, plus l'IA comprend ses goûts **pour CETTE playlist**
- Les suggestions s'affinent en temps réel
- L'utilisateur peut aussi taper des instructions ("plus énergique", "comme le track 3")

### Notification Durée Atteinte

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│        Tu as atteint ton objectif de 60 min !               │
│                                                             │
│        Ta playlist contient :                               │
│        • 12 tracks • 62 minutes                             │
│                                                             │
│     [Continuer]              [Exporter sur SoundCloud →]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Système de Draft

**Règle : 1 seul draft par utilisateur.**

- Quand l'utilisateur lance une recherche IA → crée/écrase le draft
- Le draft persiste même si l'utilisateur quitte
- Quand l'utilisateur revient → retrouve son dernier draft
- Quand l'utilisateur ajoute 1+ track → le draft devient une vraie playlist

**Avantages :**
- Pas de playlists vides qui s'accumulent
- L'utilisateur peut reprendre où il en était
- Simple à comprendre

**Flow :**
```
Nouvelle recherche IA → Draft créé/écrasé
                              ↓
              User swipe, ajoute des tracks
                              ↓
              Draft devient playlist permanente
```

---

## Settings (settings.vue)

```
┌─────────────────────────────────────────────────────────────┐
│  Paramètres                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Compte                                                     │
│  ├─ Email : user@example.com                                │
│  └─ [Se déconnecter]                                        │
│                                                             │
│  SoundCloud                                                 │
│  ├─ Connecté : @username (523 likes importés)              │
│  ├─ [Synchroniser maintenant]                               │
│  └─ [Déconnecter SoundCloud]                                │
│                                                             │
│  Abonnement                                                 │
│  ├─ Plan : Gratuit (3/5 recherches utilisées)              │
│  └─ [Passer à Premium →]                                    │
│                                                             │
│  Langue : [Français ▼]                                      │
│                                                             │
│  Notation des keys : [Camelot ▼]                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Export

**Uniquement vers SoundCloud** (pas de CSV, JSON, etc.)

```
┌─────────────────────────────────────────────────────────────┐
│          EXPORTER "Techno Dark - 23 Jan 2026"               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Résumé :                                                   │
│  • 12 tracks • 62 min • Techno                              │
│  • 8 tracks free download                                    │
│                                                             │
│     [Créer la playlist sur SoundCloud →]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Stack Technique

### À Garder
- **Nuxt 3** (SSR)
- **Supabase** (Auth + DB)
- **Python Analyzer** (BPM, key, energy, etc.)
- **SoundCloud API** (officielle avec OAuth)
- **Claude API** (recherche IA)

---

## Cleanup du Repo

### Pages à supprimer
- `pages/search.vue` - Remplacé par la playlist
- `pages/set-creator.vue` - Remplacé par le nouveau flow
- `pages/howItWorks.vue` - Intégré dans la landing
- `pages/test-audio.vue` - Dev only
- `pages/subscription.vue` - Intégré dans settings
- `pages/dashboard.vue` - Admin, à séparer ou supprimer

### Composants à supprimer
- `components/dj/` - Tout le dossier (Deck, Waveform, etc.)
- `components/set-creator/` - Tout le dossier
- `components/home/` - À refaire pour la landing

### API à supprimer/refactorer
- `server/api/set-creator/` - À remplacer par playlist API
- Endpoints liés aux fonctionnalités supprimées

### À renommer
- "set" → "playlist" partout dans le code
- `useSetCreator` → `usePlaylist`

---

## Base de Données

### Table : `profiles` (modifier existante)
```sql
ALTER TABLE profiles ADD COLUMN daily_search_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN last_search_date DATE;
```
Reset automatique : quand `last_search_date != today`, remettre `daily_search_count = 0`.

### Table : `soundcloud_connections`
```sql
CREATE TABLE soundcloud_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soundcloud_user_id BIGINT NOT NULL,
  soundcloud_username TEXT,
  soundcloud_avatar TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### Table : `user_liked_tracks`
```sql
CREATE TABLE user_liked_tracks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  liked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, soundcloud_id)
);
```

### Table : `playlists`
```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  target_duration INTEGER,  -- en minutes, NULL = libre
  style TEXT,
  free_download_only BOOLEAN DEFAULT FALSE,
  reference_track_id BIGINT REFERENCES tracks(soundcloud_id),
  is_draft BOOLEAN DEFAULT TRUE,  -- devient FALSE quand 1+ track ajoutée
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contrainte : 1 seul draft par user
CREATE UNIQUE INDEX idx_one_draft_per_user
  ON playlists(user_id)
  WHERE is_draft = TRUE;
```

### Table : `playlist_tracks`
```sql
CREATE TABLE playlist_tracks (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, soundcloud_id)
);
```

### Table : `playlist_feedback`
```sql
CREATE TABLE playlist_feedback (
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL,
  action TEXT NOT NULL,  -- 'like' ou 'skip'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (playlist_id, soundcloud_id)
);
```

---

## Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| Temps onboarding | < 2 min pour connecter SC et lancer première recherche |
| Complétion playlist | > 50% des playlists avec 1+ track sont terminées |
| Swipes/session | Avg 20-50 swipes par session |
| Conversion free→premium | 5-10% des users atteignent le quota |

---

## Décisions Prises

| Question | Décision |
|----------|----------|
| **Auto-suppression** | Système de draft unique (1 draft, écrasé à chaque nouvelle recherche) |
| **Draft sur dashboard** | Carte spéciale en 1ère position, style distinct (bordure pointillée, badge "Brouillon") |
| **Transition landing → login** | Récupérer les tracks (localStorage → lier au compte après login) |
| **Quota IA** | 1 recherche = 1 nouvelle playlist. Les refinements dans une playlist ne comptent pas |
| **Authentification** | SoundCloud uniquement pour la v1 (pas de Google/Apple) |
| **Tracks non analysées** | Afficher infos de base + "BPM: --", utilisables quand même |
| **CREATE → "Décrire"** | Ouvre l'IA searchbar directement, l'IA demande les précisions si besoin |
| **Quota/Premium flow** | Soft warning à 4/5, hard block à 5/5 avec modal upgrade |
| **Historique des skips** | Oui, réutilisable dans d'autres playlists (à voir) |
| **Partage playlists** | Pas pour la v1 |
| **Sync likes SC** | Temps réel si possible, sinon à la connexion |
| **Design** | Mobile-first, responsive desktop |
| **Rate limits** | Retry avec backoff (3 essais), message user-friendly, cache 5min |
| **Quota tracking** | Champs `daily_search_count` + `last_search_date` dans `profiles` |
| **Stripe** | v2 |
| **Analytics** | Posthog v2 (console.log pour l'instant) |
