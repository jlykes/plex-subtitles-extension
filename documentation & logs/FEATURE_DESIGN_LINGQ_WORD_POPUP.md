# Feature Design: LingQ Word Click Popup (Status & Tags Update)

## Overview
Enable users to click on any word in the subtitle overlay to open a popup below the word. This popup allows updating the LingQ status (0-4, plus checkmark for "Known") and toggling between the two most common tags ("characters known", "partial characters known"), or clearing tags ("No characters known"). All changes update both local storage and the LingQ website via PATCH requests (see `lingq_patch.py`).

## Current State Analysis
- Words in the subtitle overlay are not interactive.
- Status and tags can only be updated externally (not inline).
- LingQ data (status/tags) is stored in Chrome local storage and synced from the site.

## Feature Requirements

### 1. UI Changes
**Popup Style**: Appears below clicked word, styled as a horizontal row of circular buttons (see attached image for inspiration).

**Popup Content:**
- Status buttons: 0, 1, 2, 3, 4, ✓ (for known)
- Tag buttons: "characters known", "partial characters known", "no characters known"
- Current status highlighted; current tag (if any) selected

**Implementation Note:**
- All new UI logic for the popup should be implemented in a new JS file (e.g., `word_popup.js`) to keep control panel logic clean and modular.

**Example HTML Structure:**
```html
<div class="word-popup">
  <div class="status-row">
    <button class="status-btn" data-status="0">0</button>
    <button class="status-btn" data-status="1">1</button>
    <button class="status-btn" data-status="2">2</button>
    <button class="status-btn" data-status="3">3</button>
    <button class="status-btn" data-status="4">4</button>
    <button class="status-btn" data-status="known">✓</button>
  </div>
  <div class="tag-row">
    <button class="tag-btn" data-tag="characters known">characters known</button>
    <button class="tag-btn" data-tag="partial characters known">partial characters known</button>
    <button class="tag-btn" data-tag="none">No characters known</button>
  </div>
</div>
```

### 2. Data Processing Logic

- All data operations (status/tag updates, search/import/patch) should be implemented in `lingq_data.js` to keep data logic separate from UI and tools.

#### Function: `showWordPopup(word, position)`
- Display popup below clicked word
- Fetch current status/tags from local storage
- Highlight current status/tag

#### Function: `updateLingQStatus(word, newStatus)`
- Update status in local storage
- Use `lingq_data.js` to handle all status update logic
- Before patching, CHECK if the word exists in LingQ (via search); if not, import it, then update status (mirroring the logic in `lingq_patch.py`)
- Update UI on success

#### Function: `updateLingQTag(word, newTag)`
- Only one of the two tags can be selected at a time
- If "no characters known" is selected, remove all tags (PATCH with empty tag list)
- Use `lingq_data.js` to handle all tag update logic
- Before patching, CHECK if the word exists in LingQ (via search); if not, import it, then update tags
- Update local storage and LingQ site

### 3. Integration Points
- Overlay: Add click event listeners to each word
- Local Storage: Sync status/tags after update
- LingQ API: Use PATCH strategy from `lingq_patch.py`
- UI: Show/hide popup, update highlights

### 4. Error Handling
- Show loading indicator while updating
- Show error message if PATCH fails (with retry option)
- Revert UI if update fails

### 5. Implementation Plan

#### Phase 1: UI & Event Handling
1. Add click listeners to words
2. Render popup below word
3. Style popup/buttons

#### Phase 2: Data Sync
1. Fetch and display current status/tags
2. Implement status/tag update logic (local + PATCH)
3. Handle tag exclusivity and "no characters known"

#### Phase 3: Error Handling & UX
1. Add loading/error states
2. Retry/cancel options
3. Hide popup on outside click or after update

### 6. Technical Specifications
- `word_popup.js`: All popup UI rendering and event handling
- `lingq_data.js`: All status/tag update helpers, search/import/patch logic
- `lingq_patch.py`: Reference for PATCH logic
- CSS: New styles for popup/buttons

### 7. Success Criteria
- [ ] Popup appears below clicked word
- [ ] Status/tag updates sync to local and LingQ site
- [ ] Only one tag selected at a time; "No characters known" clears tags
- [ ] UI feedback for loading/errors

## Implementation Notes
- Implement chunk by chunk for easy progress checking
- Use inline comments for complex logic
- Focus on core popup/status/tag update flow first 