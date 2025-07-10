# Feature Design: Fetch LingQ Data Directly in Extension

## Overview
Enable the extension to fetch the user's LingQ vocabulary data (lingqs.json) directly from the LingQ API using browser cookies, removing the need for manual downloads or external scripts.

## Current State Analysis
- LingQ data is currently fetched manually or via a standalone script and placed in the extension directory.
- The extension reads lingqs.json for word status but cannot update it automatically.

## Feature Requirements

### 1. Permissions & Setup
- Update `manifest.json` to request `cookies`, `storage`, and LingQ API host permissions.

### 2. Cookie Retrieval
- Use the Chrome cookies API to extract `csrftoken` and `wwwlingqcomsa` for authentication.
- Handle cases where cookies are missing (user not logged in).

### 3. API Fetch Logic
- Make authenticated requests to the LingQ API endpoint for vocabulary data.
- Support at least one status and page; future-proof for pagination.
- Store the fetched data in `chrome.storage.local` for use by the extension.

### 4. UI & Automatic Fetch Integration
- Add a button or menu option in the control panel to trigger a LingQ data update manually.
- Automatically fetch LingQ data at a set interval (e.g., every five minutes) while the extension is open or active. This can be implemented using `setInterval` in the control panel script (runs while panel is open) or in a background script (runs as long as the extension is active).
- Show feedback (success, error, loading) to the user for both manual and automatic fetches.
- Listen for changes to LingQ data in `chrome.storage.local` and automatically re-render subtitles or recalculate status whenever the data changes.

## Integration Points
- **control.js**: Add fetch logic, UI trigger, automatic interval fetch, storage update, and storage change listener for subtitle re-rendering.
- **manifest.json**: Add required permissions.
- **utils.js**: Optionally add helpers for cookie extraction and API calls.
- **control_panel.html**: Add UI element for manual update.

## Error Handling
- Show clear error messages if cookies are missing or API call fails.
- Handle expired sessions by prompting the user to log in to LingQ.
- Fallback to last known data if fetch fails.

## Implementation Plan

### Phase 1: Core Fetch Logic
1. Add permissions to manifest.json
2. Implement cookie extraction and API fetch in control.js
3. Store LingQ data in chrome.storage.local
4. Set up automatic periodic fetch (e.g., every five minutes) using `setInterval` or a background script

### Phase 2: UI Integration
1. Add update button to control panel for manual fetch
2. Show loading, success, and error states for both manual and automatic fetches

### Phase 3: Reactivity & Robustness
1. Implement a listener using `chrome.storage.onChanged` to detect updates to LingQ data and trigger subtitle re-rendering or status recalculation automatically.
2. Handle missing/expired cookies
3. Add fallback to manual input if needed
4. Prepare for pagination and multiple statuses

## Future Enhancements
- Schedule more advanced background updates (e.g., based on user activity)
- Support fetching all LingQ statuses and paginated results
- Sync LingQ data across devices
- Allow manual cookie input as a fallback
- Add progress indicators for large data sets 