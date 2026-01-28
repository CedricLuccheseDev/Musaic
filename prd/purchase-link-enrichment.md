# Purchase Link Enrichment

## Overview

Automatic enrichment of track purchase links using SoundCloud metadata and Odesli API as fallback.

## Optimizations Applied

### Search Flow

| Aspect | Implementation | Status |
|--------|----------------|--------|
| **DB + SoundCloud parallel** | `Promise.allSettled([executeDbQuery(), searchWithArtistDetection()])` | ✅ Optimal |
| **Odesli disabled in live search** | `searchWithArtistDetection(..., enrichWithOdesli = false)` | ✅ Correct (2-5s saved) |
| **Upsert non-blocking** | `upsertTracks().catch()` fire & forget | ✅ Optimal |
| **Background enrichment** | `triggerPurchaseLinkEnrichment()` after upsert | ✅ Implemented |
| **Rate limiting Odesli** | 3 tracks/batch, 1s delay between batches | ✅ Safe |

### Data Flow

```
User Search
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ /api/search.ts                                              │
│  └─ Promise.allSettled([                                    │
│        executeDbQuery(sql),        ← Parallel               │
│        searchWithArtistDetection() ← Parallel, NO Odesli    │
│     ])                                                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ upsertTracks() [non-blocking, fire & forget]                │
│  ├─ Quality filter (score >= 40)                            │
│  ├─ Deduplicate by soundcloud_id                            │
│  ├─ Batch upsert to Supabase                                │
│  └─ Background jobs:                                        │
│       ├─ triggerAnalysis()              → Python analyzer   │
│       └─ triggerPurchaseLinkEnrichment() → Odesli API       │
└─────────────────────────────────────────────────────────────┘
```

### Why Odesli is OFF in Live Search

| With Odesli | Without Odesli |
|-------------|----------------|
| ~3-5s total latency | ~500ms total latency |
| 25 API calls blocking | 0 API calls |
| User waits | Instant results |

**Solution:** Enrichment happens in background after tracks are stored.

## Tech Debt (Resolved)

All previously identified tech debt has been addressed:

| Issue | Status | Solution |
|-------|--------|----------|
| **Odesli code duplicated** | ✅ Resolved | Created `server/services/odesli.ts` |
| **No Odesli response cache** | ✅ Resolved | In-memory cache with 24h TTL (5000 entries max) |
| **No retry on Odesli failure** | ✅ Resolved | Built-in retry mechanism (2 retries, 1s delay) |

### Centralized Odesli Service

**File:** `server/services/odesli.ts`

Features:
- `fetchOdesliPurchaseLink()` - Single API call with caching and retry
- `enrichTracksWithPurchaseLinks()` - Batch processing with rate limiting
- In-memory cache (24h TTL, 5000 max entries)
- Automatic retry on transient failures (2 retries, 1s delay)
- Exported constants: `FREE_KEYWORDS`, `FREE_DOWNLOAD_DOMAINS`, `PURCHASE_DOMAINS`, etc.
- Helper functions: `extractUrlsFromText()`, `findFreeDownloadLink()`, `findPurchaseLink()`

### Files Using the Service

1. `server/services/soundcloud.ts` - Imports `fetchOdesliPurchaseLink` for track enrichment
2. `server/services/trackStorage.ts` - Imports `fetchOdesliPurchaseLink` for background enrichment
3. `scripts/enrichPurchaseLinks.ts` - Imports service for manual enrichment script

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                            │
├─────────────────────────────────────────────────────────────────┤
│  1. SoundCloud API                                              │
│     ├─ purchase_url (direct field)                              │
│     ├─ purchase_title (e.g., "Free Download", "Buy on Beatport")│
│     ├─ downloadable (boolean)                                   │
│     └─ description (parsed for links)                           │
│                                                                 │
│  2. Odesli API (fallback)                                       │
│     └─ Cross-platform link aggregator                           │
│        Returns links for: Beatport, Bandcamp, Spotify, etc.     │
└─────────────────────────────────────────────────────────────────┘
```

## Platform Priority

When multiple purchase links are available, we prioritize dedicated music stores:

1. Beatport
2. Bandcamp
3. Traxsource
4. iTunes
5. Apple Music
6. Amazon
7. Deezer
8. Spotify
9. Tidal
10. YouTube
11. YouTube Music

## Integration Points

### 1. Live Search (Background Enrichment)

**File:** `server/services/trackStorage.ts`

```
User Search
    │
    ▼
searchWithArtistDetection()  ← Odesli OFF (for speed)
    │
    ▼
upsertTracks()
    │
    ├─► triggerAnalysis()              [non-blocking]
    └─► triggerPurchaseLinkEnrichment() [non-blocking] ✨
            │
            ▼
        Odesli API (3 tracks/batch, 1s delay)
            │
            ▼
        UPDATE tracks SET purchase_url, purchase_title
```

**Characteristics:**
- Non-blocking (fire & forget)
- Rate-limited (3 concurrent, 1s between batches)
- Only processes tracks without `purchase_url`

### 2. Population Script

**File:** `scripts/populateTracks.ts`

```
searchTracks(query, 25, true)  ← Odesli ON
```

Enrichment happens synchronously during import for complete data.

### 3. Manual Enrichment Script

**File:** `scripts/enrichPurchaseLinks.ts`

```bash
# Dry run
bun scripts/enrichPurchaseLinks.ts --dry-run

# Process all tracks without purchase links
bun scripts/enrichPurchaseLinks.ts

# Limit to N tracks
bun scripts/enrichPurchaseLinks.ts --limit 100
```

**Strategy:**
1. Re-check SoundCloud for updated info (free downloads, purchase links)
2. Fallback to Odesli if nothing found
3. Update `purchase_url`, `purchase_title`, `download_status`, `downloadable`

## Database Fields

| Field | Type | Description |
|-------|------|-------------|
| `purchase_url` | TEXT | Link to purchase/stream |
| `purchase_title` | TEXT | Label (e.g., "Buy / Stream", "Free Download") |
| `download_status` | TEXT | `FreeDirectLink`, `FreeExternalLink`, `No` |
| `downloadable` | BOOLEAN | Direct download on SoundCloud |

## Free Download Detection

### Keywords in `purchase_title`
- "free download"
- "free dl"
- "freedl"
- "free"

### Free Download Domains
- hypeddit.com
- toneden.io
- fanlink.to
- gate.fm
- bfrnd.link
- edmdisc.com

### Smart Link Domains (Aggregators)
- smarturl.it
- ffm.to
- linktr.ee
- distrokid.com
- lnk.to
- found.ee
- song.link
- odesli.co

## API Reference

### Odesli API

**Endpoint:** `https://api.song.link/v1-alpha.1/links`

**Request:**
```
GET /v1-alpha.1/links?url={soundcloud_url}
```

**Response:**
```json
{
  "pageUrl": "https://song.link/...",
  "linksByPlatform": {
    "beatport": { "url": "https://beatport.com/...", "entityUniqueId": "..." },
    "spotify": { "url": "https://open.spotify.com/...", "entityUniqueId": "..." }
  }
}
```

**Rate Limits:**
- No official documentation
- We use: 3 concurrent requests, 1s delay between batches
- Timeout: 5-10 seconds per request

## Performance Considerations

| Scenario | Odesli Enabled | Reason |
|----------|----------------|--------|
| Live search | NO | Would add 2-5s latency |
| Background after upsert | YES | Non-blocking |
| Population script | YES | Batch import, time not critical |
| Manual enrichment | YES | Explicit user action |

## Monitoring

Logs are prefixed with:
- `DB` - Database operations
- `SC` - SoundCloud operations
- `ODESLI` - Odesli API operations

Example output:
```
14:32:15 ● DB Enriching 12 tracks with Odesli links (background)
14:32:15 ● ODESLI Enriching 12 tracks with purchase links
14:32:25 ● ODESLI Enriched 8/12 tracks with purchase links
```

## Future Improvements

- [x] **Centralize Odesli code** - Created `server/services/odesli.ts`
- [x] **Cache Odesli responses** - In-memory cache with 24h TTL
- [x] **Retry failed enrichments** - Built-in retry mechanism (2 retries)
- [ ] **User-triggered enrichment** - "Find purchase link" button per track
- [ ] **Webhook on analysis complete** - Trigger enrichment after audio analysis done
