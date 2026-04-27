# Feature Design: Inject “Enriched Subtitles Available” on Plex Homepage

## Project Timeline

- **Chunk 1: DOM Analysis & Selector Targeting**
  - Analyze Plex homepage structure (see `samplePlexHomepage.html`).
  - Identify the correct selector for each movie/poster cell (e.g., `div[data-testid="cellItem"]`).
  - Locate where to inject the info (under the title, but inside the cell).

- **Chunk 2: Title Extraction & Normalization**
  - For each cell, extract the movie/show title from the DOM.
  - Use or adapt the existing `normalizeTitle(title)` utility to match the naming convention of enriched subtitle files.

- **Chunk 3: Enriched Subtitle Availability Check**
  - For each normalized title, check if `enriched_subtitles/<normalized>.enriched.json` exists.
  - Use or adapt the existing `checkEnrichedJSONExists(normalizedTitle)` utility (async, returns boolean).

- **Chunk 4: DOM Injection**
  - For each cell, inject a small badge or text (e.g., “Enriched Subtitles: Available” or “Not Available”) under the title.
  - Style the badge for clarity and minimalism (e.g., green for available, gray for not available).

- **Chunk 5: Mutation Observer for Dynamic Loading**
  - Plex homepage loads content dynamically (infinite scroll, filtering, etc.).
  - Use a MutationObserver to watch for new cells and re-run the injection logic as needed.

- **Chunk 6: Performance & Edge Cases**
  - Throttle or debounce checks to avoid excessive DOM or network activity.
  - Handle edge cases: missing titles, non-standard cells, or network errors.

- **Chunk 7: User Settings (Optional)**
  - Add a toggle in the extension’s control panel to enable/disable this homepage badge feature.

---

## Potential Future Features

- **Show More Details:** On hover or click, display additional info (e.g., percentage of known words, subtitle language, etc.).
- **Batch Download:** Allow users to download all available enriched subtitles for visible movies.
- **Filter/Sort:** Add a filter to show only movies with enriched subtitles.
- **Custom Badge Text:** Let users customize the badge text or style.
- **Analytics:** Show stats (e.g., “You have enriched subtitles for X out of Y movies”).

---

**Implementation Notes:**
- The homepage badge logic will live in its own dedicated file (e.g., `helper_scripts/homepage_badge.js`).
- `content.js` will only be responsible for detecting when the user is on the Plex homepage and triggering the badge logic.
- All DOM scanning, title extraction, badge injection, and mutation observer logic will be encapsulated in the new JS file.
- Utilities from `helper_scripts/utils.js` (like `normalizeTitle` and `checkEnrichedJSONExists`) will be reused.
- The feature is non-intrusive: it only adds a small badge and does not interfere with Plex’s core UI or playback.
- All code will be implemented chunk by chunk, with inline comments for complex DOM or async logic. 