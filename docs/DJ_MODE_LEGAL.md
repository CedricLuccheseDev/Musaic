# DJ Mode - Legal Precautions

## SoundCloud API Terms Compliance

When streaming audio outside of the official SoundCloud embed player, the following conditions **MUST** be met:

### Required Attribution (Mandatory)

- [x] **Credit the Uploader** - Display artist/uploader name
- [ ] **Credit SoundCloud as source** - Add "Powered by SoundCloud" or SC logo
- [x] **Backlink to SoundCloud** - Link to track's permalink URL on soundcloud.com

### Recommended Safeguards

To avoid being classified as an "alternative digital content service":

- [ ] **Limit playback duration** - Consider 90-second preview limit per track in DJ mode
- [ ] **No permanent playlists** - DJ comparison should be session-based only
- [ ] **Clear purpose** - Label as "DJ Preview Tool" not a streaming service
- [ ] **No offline caching** - Stream only, no local storage of audio

### Prohibited Uses

- Stream ripping / permanent downloads (except when uploader allows)
- Creating an on-demand listening service
- Circumventing uploader restrictions
- Using content for AI/ML training

## Implementation Checklist

Before launching DJ mode publicly:

1. [ ] Add SoundCloud attribution badge/text in DJ interface
2. [ ] Ensure all tracks have clickable link to SoundCloud permalink
3. [ ] Add disclaimer: "Preview only - Support artists on SoundCloud"
4. [ ] Consider duration limit for non-downloadable tracks
5. [ ] Test that no audio is cached beyond session

## Sources

- [SoundCloud API Terms of Use](https://developers.soundcloud.com/docs/api/terms-of-use)
- [SoundCloud API Usage Policies](https://help.soundcloud.com/hc/en-us/articles/115003446727-API-usage-policies)
