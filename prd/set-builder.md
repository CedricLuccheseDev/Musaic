# Feature: Set Builder - Créateur de Set DJ

## 🎯 Problème

### Le digging est imprévisible

Quand un DJ prépare un set, le temps de recherche (digging) est très variable :
- Parfois tu trouves 5 bangers en 10 minutes
- Parfois tu passes 2 heures sans rien trouver de bon

**Le vrai goulot d'étranglement** : le ratio "tracks écoutées / tracks gardées". Tu écoutes 50 tracks pour en garder 5.

### Ce que Rekordbox ne résout pas

Rekordbox gère bien la **bibliothèque** (organisation, playlists, tags). Mais il ne t'aide pas à **découvrir** de nouvelles tracks compatibles avec ton set.

### Ce qu'on résout

| Problème | Solution |
|----------|----------|
| Écouter trop de tracks inutiles | Suggestions pré-filtrées (BPM, key, énergie compatibles) |
| Décision lente ("ça va matcher ?") | Infos de compatibilité visibles immédiatement |
| Bulle de filtre (toujours les mêmes sons) | Mix de suggestions "safe" + "découvertes" |
| Pas de vision de la progression du set | Durée effective calculée en temps réel |

### Proposition de valeur

> **Construire un set de 1h en écoutant 20 tracks au lieu de 100.**

---

## 🎯 Objectif

Permettre aux utilisateurs de créer des sets DJ de manière assistée. L'utilisateur configure les paramètres de base, puis construit son set track par track en sélectionnant parmi des suggestions intelligentes (scoring SQL en V1, IA en V1.5) qui s'affinent au fur et à mesure.

---

## 📋 Paramètres de configuration initiale

| Paramètre | Type | Description | Valeurs possibles |
|-----------|------|-------------|-------------------|
| `name` | string | Nom du set | Libre |
| `genre` | string | Genre principal (le BPM sera calculé via le genre) | Dubstep, House, Techno, etc. |
| `targetDuration` | number | Durée cible en minutes | 30, 60, 90, 120 |
| `avgTrackPlaytime` | number | Durée moyenne jouée par track (%) | 60-80% (défaut: 70%) |
| `mood` | enum | Ambiance générale | `energetic`, `chill`, `progressive`, `mixed (default)` |
| `freeDownloadOnly` | boolean | Uniquement tracks téléchargeables | true/false |

---

## 🔄 Flow utilisateur

### Navigation (Header)

Ajouter dans le header global de l'app :

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] [Premium]   [Search]   [Mes sets]  [+ Créer Set]  [Profile] │
└─────────────────────────────────────────────────────────────────┘
```

| Élément | Action |
|---------|--------|
| **[Mes sets]** | Ouvre `/set` (liste des sets) |
| **[+ Créer Set]** | Ouvre `/set/new` (config nouveau set) |

### Page `/set` - Liste des sets

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Mes Sets                                                               │
│                                                                         │
│  🔍 [Rechercher un set...________________________________]              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │             │  │  [artwork]  │  │  [artwork]  │  │  [artwork]  │    │
│  │     ＋      │  │             │  │             │  │             │    │
│  │             │  │  Set name   │  │  Set name   │  │  Set name   │    │
│  │  Créer un   │  │  Dubstep    │  │  House      │  │  Techno     │    │
│  │    set      │  │  12 tracks  │  │  8 tracks   │  │  15 tracks  │    │
│  │             │  │  45:30      │  │  32:00      │  │  58:20      │    │
│  │             │  │  [⋯]        │  │  [⋯]        │  │  [⋯]        │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Card "Créer un set"** : Toujours en première position, redirige vers `/set/new`

**Limite Free vs Premium** :

| Plan | Limite de sets |
|------|----------------|
| Free | **1 set max** |
| Premium | Illimité |

> Si l'utilisateur Free a déjà 1 set, la card "Créer" affiche un message "Passez Premium pour créer plus de sets"

**Cards de sets existants** :
- Artwork = mosaïque des 4 premières tracks (ou placeholder)
- Nom du set
- Genre
- Nombre de tracks
- Durée totale
- Menu contextuel `[⋯]`

**Menu contextuel `[⋯]`** :

| Action | Description |
|--------|-------------|
| **Ouvrir** | `/set/[id]` |
| **Dupliquer** | Crée une copie du set |
| **Renommer** | Édite le nom inline |
| **Supprimer** | Confirmation puis suppression |

### Étape 1: Configuration (`/set/new`)
```
┌─────────────────────────────────────┐
│  🎛️  Nouveau Set                    │
├─────────────────────────────────────┤
│  Nom: [Mon set dubstep été 2024  ] │
│  Genre: [Dubstep ▼]                 │
│  Durée: [60 min ▼]                  │
│  ☑ Free download only               │
│                                     │
│  [Commencer la création →]          │
└─────────────────────────────────────┘
```

### Étape 2: Construction itérative (liste verticale)

L'interface est une **liste verticale unique**. Chaque track sélectionnée = une row. La dernière row contient les suggestions.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Set: Mon set dubstep été 2024                    12:34 / 60:00  (21%) │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ ROW 1 ────────────────────────────────────────────────────────────┐ │
│  │ 1  [artwork]  Skrillex - Bangarang          128 BPM · Am · 4:12    │ │
│  │    [waveform━━━━━━━━━━━━━━━━━━━]   ⋮ drag    [▶ play] [✕ suppr]    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ ROW 2 ────────────────────────────────────────────────────────────┐ │
│  │ 2  [artwork]  Excision - Rumble             132 BPM · Cm · 3:45    │ │
│  │    [waveform━━━━━━━━━━━━━━━━━━━]   ⋮ drag    [▶ play] [✕ suppr]    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ ROW 3 ────────────────────────────────────────────────────────────┐ │
│  │ 3  [artwork]  SVDDEN DEATH - Behemoth       135 BPM · Em · 4:37    │ │
│  │    [waveform━━━━━━━━━━━━━━━━━━━]   ⋮ drag    [▶ play] [✕ suppr]    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌─ ROW [+ AJOUTER] ──────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  🔍 [Rechercher une track... (IA)________________________] [Search]│ │
│  │                                                                    │ │
│  │  🎵 Suggestions (basées sur ton set)             [🔄 Refresh]      │ │
│  │                                                                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │ │
│  │  │ [art]    │  │ [art]    │  │ [art]    │  │ [art]    │           │ │
│  │  │ Track A  │  │ Track B  │  │ Track C  │  │ Track D  │           │ │
│  │  │ Artist   │  │ Artist   │  │ Artist   │  │ Artist   │           │ │
│  │  │ 130 BPM  │  │ 128 BPM  │  │ 133 BPM  │  │ 131 BPM  │           │ │
│  │  │ Gm       │  │ Am       │  │ Dm       │  │ Fm       │           │ │
│  │  │[▶][+Add] │  │[▶][+Add] │  │[▶][+Add] │  │[▶][+Add] │           │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │ │
│  │                                                                    │ │
│  │  [🎯 Affiner critères...]                                          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comportement de la row "Ajouter"

**Searchbar IA (recherche manuelle) :**
- Réutilise le même moteur de recherche que `/search`
- Permet de chercher une track spécifique par artiste, titre, ou requête libre
- Les résultats remplacent temporairement les suggestions
- Bouton "Retour aux suggestions" pour revenir au mode auto

**Suggestions automatiques :**
- Affiche **4-6 cards** de suggestions horizontalement (scroll si besoin)
- Cliquer sur une card → ajoute la track au set → nouvelle row apparaît au-dessus
- Les suggestions se **rafraîchissent automatiquement** après chaque ajout
- Bouton "Refresh" pour forcer de nouvelles suggestions
- Bouton "Affiner critères" ouvre un popover pour ajuster (BPM, energy, etc.)

### Actions sur chaque row de track

| Action | Description |
|--------|-------------|
| **Drag handle** (⋮) | Réordonner par drag & drop |
| **Play** (▶) | Charger dans le DJ player pour preview |
| **Supprimer** (✕) | Retirer du set + undo possible |

> **Note** : Pas de bouton "Modifier" en V1. L'user supprime et ré-ajoute si besoin.

---

## ⏱️ Calcul de la durée du set

Dans un set DJ, on ne joue pas les tracks en entier (transitions, cuts, mix). La durée affichée est donc une **durée effective estimée**.

### Formule

```
durée_effective = Σ (durée_track × avgTrackPlaytime)
```

### Exemple

| Track | Durée totale | Playtime 70% | Durée effective |
|-------|--------------|--------------|-----------------|
| Track 1 | 4:00 | 70% | 2:48 |
| Track 2 | 3:30 | 70% | 2:27 |
| Track 3 | 5:00 | 70% | 3:30 |
| **Total** | 12:30 | | **8:45** |

### Affichage dans l'UI

```
12:34 / 60:00  (21%)
  ↑       ↑       ↑
  │       │       └── Progression vers la cible
  │       └────────── Durée cible
  └────────────────── Durée effective (avec facteur appliqué)
```

### Option avancée

L'utilisateur peut ajuster le `avgTrackPlaytime` (60-80%) selon son style :
- **60%** : Mix rapide, beaucoup de transitions
- **70%** : Mix standard (défaut)
- **80%** : Mix long, tracks jouées presque en entier

---

## 🤖 Logique de suggestions (V1 = SQL pur)

> **V1** : Algorithme de scoring SQL, pas d'IA
> **V1.5** : IA pour affiner selon mood + explications

### Contexte calculé côté serveur

```typescript
interface SuggestionContext {
  // Config du set
  genre: string
  targetDuration: number
  freeDownloadOnly: boolean

  // Métriques calculées depuis les tracks du set
  averageBpm: number
  averageEnergy: number
  usedKeys: string[]           // Clés utilisées dans le set
  usedArtists: string[]        // Artistes à exclure
  usedTrackIds: number[]       // Tracks à exclure
  remainingDuration: number    // Temps restant
}
```

### Contraintes techniques

| Contrainte | Raison |
|------------|--------|
| **Uniquement tracks analysées** | On a besoin du BPM/key pour les suggestions |
| **Genres avec assez de tracks** | Éviter les suggestions vides (seuil: 50+ tracks) |
| **Exclure tracks déjà dans le set** | Pas de doublons |
| **Exclure artistes déjà dans le set** | Diversité |

### Critères de suggestion

Les suggestions sont basées sur **TOUTES les tracks du set** (pas juste la dernière) :

1. **BPM compatible** : Dans la plage BPM moyenne du set ±5
2. **Tonalité harmonique** : Clés compatibles avec les clés utilisées (Camelot)
3. **Progression d'énergie** : Selon le mood choisi
4. **Diversité d'artistes** : Évite les artistes déjà présents
5. **Durée adaptée** : Privilégie les tracks qui rentrent dans le temps restant
6. **Qualité** : Tracks analysées avec bon engagement

> **Rappel** : L'objectif est la **découverte de tracks**, pas l'ordre des transitions. L'ordre dans la liste n'impacte pas les suggestions.

### Tri des suggestions : Safe → Découverte

Sur 5 suggestions, on affiche dans cet ordre :

| Position | Type | Critères |
|----------|------|----------|
| 1-3 | **Safe** | Score de similarité élevé, même sous-genre, artistes connus |
| 4-5 | **Découverte** | Score plus bas mais compatible, sous-genre adjacent, artistes moins connus |

**Calcul du score de similarité :**
```
similarity_score =
  (bpm_match × 0.3) +      // ±3 BPM = 100%, ±10 BPM = 50%
  (key_match × 0.25) +     // Même key ou harmonique = 100%
  (energy_match × 0.2) +   // ±0.1 energy = 100%
  (genre_match × 0.15) +   // Même genre = 100%, adjacent = 50%
  (popularity × 0.1)       // Normalised playback_count
```

**Seuils :**
- **Safe** : similarity_score > 0.6
- **Découverte** : similarity_score entre 0.4 et 0.6

### Requête SQL V1

```sql
-- Suggestions pour le set builder (V1)
SELECT
  t.*,
  -- Score de similarité (0-1)
  (
    -- BPM match (30%)
    GREATEST(0, 1 - ABS(t.bpm_detected - $avgBpm) / 10.0) * 0.3 +

    -- Key match (25%) - clés compatibles Camelot
    CASE WHEN t.key_detected = ANY($compatibleKeys) THEN 0.25 ELSE 0 END +

    -- Energy match (20%)
    GREATEST(0, 1 - ABS(t.energy - $avgEnergy) / 0.3) * 0.2 +

    -- Genre match (15%)
    CASE WHEN t.genre ILIKE $genre THEN 0.15 ELSE 0.075 END +

    -- Popularity (10%)
    LEAST(t.playback_count::float / 1000000, 1) * 0.1
  ) AS similarity_score

FROM tracks t
WHERE
  -- Contraintes obligatoires
  t.analysis_status = 'completed'
  AND t.genre ILIKE '%' || $genre || '%'
  AND t.soundcloud_id NOT IN ($excludeTrackIds)
  AND t.artist NOT IN ($excludeArtists)
  AND t.bpm_detected BETWEEN $avgBpm - 10 AND $avgBpm + 10

  -- Filtre download si activé
  AND ($freeDownloadOnly = false OR t.download_status IN ('FreeDirectLink', 'FreeExternalLink'))

ORDER BY similarity_score DESC
LIMIT 10  -- On prend 10 pour avoir de la marge pour le tri Safe/Découverte
```

### Post-traitement (côté serveur)

1. **Séparer Safe vs Découverte** :
   - Safe (positions 1-3) : `similarity_score > 0.6`
   - Découverte (positions 4-5) : `similarity_score` entre 0.4 et 0.6

2. **Retourner 5 tracks** : 3 safe + 2 découvertes (ou ajuster si pas assez)

---

## 🎧 Intégration DJ Player

### Test du set

- Bouton "Tester avec DJ Mode" ouvre le player existant
- Charge automatiquement les 2 premières tracks sur Deck A et B
- Navigation entre les tracks du set
- Retour au builder pour ajuster si nécessaire

### Préchargement

- Waveforms pré-générées pour les tracks du set
- Cache des données audio pour transitions rapides

---

## 📥 Panel de téléchargement

```
┌─────────────────────────────────────────┐
│  📥 Télécharger le set                  │
├─────────────────────────────────────────┤
│  ☑ Skrillex - Bangarang      [Free] ✓  │
│  ☑ Excision - Rumble         [Free] ✓  │
│  ☐ SVDDEN DEATH - Behemoth   [Buy]  ⚠  │
│  ☑ Virtual Riot - Energy     [Free] ✓  │
│                                         │
│  4/5 tracks téléchargeables            │
│                                         │
│  [Télécharger sélection]               │
│  [Ouvrir liens d'achat (1)]            │
└─────────────────────────────────────────┘
```

---

## 📤 Export

### Formats supportés

| Format | Description | Usage |
|--------|-------------|-------|
| JSON | Export brut des données | Backup, import |
| Rekordbox XML | Compatible Pioneer DJ | USB pour CDJ |
| M3U | Playlist standard | Lecteurs audio |

### Contenu de l'export

- Métadonnées du set (nom, durée, genre)
- Liste ordonnée des tracks avec :
  - Titre, artiste
  - BPM, tonalité
  - Durée
  - URL SoundCloud
  - Notes de transition (optionnel)

---

## 💾 Persistance (Base de données)

> **Note** : Ajouter ces tables dans `init.sql` (pas de migration séparée)

### Nouvelle table `sets`

```sql
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Métadonnées
  name TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  target_duration INTEGER, -- en secondes
  avg_track_playtime INTEGER DEFAULT 70, -- % de durée jouée par track (60-80)
  mood TEXT,

  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'completed'
  is_public BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Nouvelle table `set_tracks`

```sql
CREATE TABLE set_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  soundcloud_id BIGINT NOT NULL REFERENCES tracks(soundcloud_id),
  position INTEGER NOT NULL,

  -- Notes optionnelles
  transition_note TEXT, -- "crossfade 16 bars", "drop mix", etc.

  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(set_id, position)
);
```

---

## 🎨 UX Decisions

### Cards de suggestion

| Feature | V1 | V1.5 | Raison |
|---------|-----|------|--------|
| **Bouton play sur card** | ✅ | | Simple, pas de conflits audio |
| Mini waveform | ❌ | ✅ | Nécessite pré-génération, complexe |
| Audio preview au hover | ❌ | ✅ | Conflits audio à gérer |
| Indicateur de compatibilité | ❌ | ❌ | Trop d'info |
| "Pourquoi cette suggestion" | ❌ | ✅ | Nice to have |

### Actions globales

| Feature | V1 | V1.5 | Raison |
|---------|-----|------|--------|
| **Undo simple (toast)** | ✅ | | "Track supprimée" + bouton [Annuler] |
| Undo/Redo complet | ❌ | ✅ | Stack d'historique, complexe |
| Indicateur de transition | ❌ | ❌ | L'objectif est la découverte |
| Raccourcis clavier | ❌ | ✅ | Power users |

### Première track du set

| Comportement | V1 |
|--------------|-----|
| Set vide | Suggestions = **tracks aléatoires du genre** avec bon score |
| Après 1ère track | Suggestions basées sur le contexte du set |

> Pas de searchbar obligatoire. On propose directement des tracks populaires du genre configuré.

---

## ♻️ Réutilisation des composants existants

**Objectif** : Ne pas dupliquer les composants de `/search`. Réutiliser au maximum.

| Composant existant | Réutilisation dans Set Builder |
|--------------------|-------------------------------|
| `SearchBar.vue` | Réutiliser tel quel dans AddRow |
| `SearchTrackCard.vue` | **Adapter** pour `SetBuilderSuggestionCard` (version compacte) |
| `AudioPlayer.vue` | Réutiliser pour preview |
| `DjPreview.vue` | Réutiliser pour "Tester le set" |

### Modifications à prévoir sur composants existants

1. **SearchTrackCard.vue** → Extraire une version "compact" ou ajouter une prop `variant="compact"`
2. **SearchBar.vue** → Déjà réutilisable tel quel
3. **Créer** : `TrackRowBase.vue` → Composant de base pour les rows (utilisable dans search ET set-builder)

---

## 🗂️ Structure des fichiers à créer

```
apps/web/
├── pages/
│   └── set/
│       ├── index.vue                # Liste des sets (cards)
│       ├── new.vue                  # Config nouveau set
│       └── [id].vue                 # Page d'édition d'un set
│
├── components/
│   └── set-builder/
│       ├── SetBuilderConfig.vue     # Formulaire de config initiale
│       ├── SetBuilderHeader.vue     # Header avec nom du set + progress bar
│       ├── SetBuilderTrackRow.vue   # Row d'une track sélectionnée
│       ├── SetBuilderAddRow.vue     # Row "Ajouter" avec suggestions
│       ├── SetBuilderSuggestionCard.vue  # Card de suggestion (dans AddRow)
│       ├── SetBuilderDownloads.vue  # Panel de téléchargement
│       └── SetBuilderExport.vue     # Options d'export
│
├── composables/
│   └── useSetBuilder.ts             # État et logique du builder
│
├── server/
│   ├── api/
│   │   └── sets/
│   │       ├── index.get.ts         # Liste des sets user
│   │       ├── index.post.ts        # Créer un set
│   │       ├── [id].get.ts          # Récupérer un set
│   │       ├── [id].put.ts          # Mettre à jour
│   │       ├── [id].delete.ts       # Supprimer
│   │       ├── [id]/
│   │       │   ├── tracks.post.ts   # Ajouter track
│   │       │   ├── tracks.delete.ts # Supprimer track
│   │       │   └── suggest.post.ts  # Suggestions (scoring SQL)
│   │       └── export/
│   │           └── [id].get.ts      # Export XML/JSON
│   │
│   └── services/
│       └── setBuilder.ts            # Logique métier suggestions
│
└── types/
    └── set-builder.ts               # Types spécifiques
```

---

## ⚙️ Types TypeScript

```typescript
// types/set-builder.ts

export interface SetConfig {
  name: string
  genre: string
  targetDuration: number // minutes
  avgTrackPlaytime: number // % de durée jouée (60-80, défaut: 70)
  mood: 'energetic' | 'chill' | 'progressive' | 'mixed'
  freeDownloadOnly: boolean
}

export interface SetTrack {
  id: string
  soundcloudId: number
  position: number
  track: TrackEntry
  transitionNote?: string
}

export interface DjSet {
  id: string
  userId: string
  config: SetConfig
  tracks: SetTrack[]
  status: 'draft' | 'completed'
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SuggestionRequest {
  setId: string
  context: SuggestionContext
  count?: number // défaut: 5
}

export interface SuggestionResponse {
  tracks: TrackEntry[]
  // V1.5: reasoning: string // Explication IA du choix
}
```

---

## ✅ Validation avant implémentation

### Questions ouvertes

| Question | Décision |
|----------|----------|
| Nombre de suggestions | **5 par défaut** (non configurable pour V1) |
| Sauvegarde auto | **Oui** - sauvegarde à chaque ajout/suppression de track |
| Sets publics | **Non** - V2 |
| Limite de tracks | **Non** - V2 |
| Historique suggestions refusées | **Non** - V2 |

---

## 🚀 Phases d'implémentation suggérées

### Phase 1 - Core
- [ ] Schema DB (ajouter dans init.sql)
- [ ] Types TypeScript
- [ ] API CRUD sets
- [ ] Page de base avec config

### Phase 2 - Builder
- [ ] Composable useSetBuilder
- [ ] Panel suggestions (scoring SQL)
- [ ] Liste tracks avec drag & drop

### Phase 3 - Intégrations
- [ ] Connexion DJ Player
- [ ] Panel téléchargements
- [ ] Export XML/JSON

### Phase 4 - Polish
- [ ] Sauvegarde auto
- [ ] Animations/UX
- [ ] Tests

---

## 📝 Notes

_Espace pour tes notes et ajustements..._
