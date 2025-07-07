# Development Log - Plex Metalayer

### Potential Future Updates
- Pause on hover toggle
- Save state (e.g., with local storage)
- LingQ API Integration - Real-time vocabulary fetching and updating
- Cross platform support - For Mobile, etc. 
- Cross media player support - For YT, Netflix, Disney+
- Subtitle History - Add scrollback/explorer functionality
- Custom playbar interface
- Export Features - Save learning data and statistics

## Project History

### Core Architecture & Foundation
- Built Chrome extension that overlays subtitles outside Plex's built-in system
- Implemented word segmentation using `segmentit` for Chinese text
- Created LingQ status integration with color-coded underlines
- Added pinyin overlay system
- Set up basic file structure with `content.js`, `manifest.json`, `segmentit.min.js`, `lingqs.json`
- Implemented responsive design with percentage-based sizing (`vh`/`vw`)
- Added global config block for user-configurable constants

### Backend Infrastructure & File Processing
- Created Python script `enrich_srt.py` to process `.srt` files with OpenAI/DeepSeek
- Added contextual translation, word-by-word explanations, and pinyin using `pypinyin` with tone marks
- Implemented progress indicators and timeout handling for API calls
- Established file naming conventions using underscores for spaces
- Added logic to detect media title from `document.title`
- Implemented `normalizeTitle()` and `checkEnrichedJSONExists()` functions
- Added fallback between preprocessed and live modes

### UI Development & Control Panel
- Created floating subtitle control panel with fade in/out and transparent background
- Redesigned control panel with Appearance, Behavior, Additional Info, and Scrollback Panel sections
- Switched from inline HTML to external `control_panel.html` file loaded via `fetch()`
- Enhanced UI styling with compact dropdowns, sliders, and consistent font sizing
- Implemented real functionality for visibility toggle, size slider, position dropdown, height slider, and LingQ coloring toggle
- Added subtitle hover pause functionality to pause video when hovering over subtitles
- Implemented `H` key to toggle Plex UI visibility and click-to-pause functionality when UI is hidden
- Added LingQ status percentage tracking to control panel showing word breakdown by status (Known/Familiar/Recognized/New) with total word count and comma formatting
- Implemented "Remove Silences" mode that automatically skips from subtitle end to next subtitle start, eliminating silent periods with configurable minimum gap threshold
- Enhanced live mode control panel by completely hiding features not available in live mode: translation controls, auto-pause controls, continuous mode, remove silences controls, and min silence gap slider (already had percentage stats and sentence explanation hidden)
- Removed number display from min silence gap slider to match other slider controls

### Subtitle Rendering & Visual Features
- Implemented full tone coloring support with `getToneColor()` function for all 5 tones
- Applied tone coloring per character inside each word with soft, pastel color palette
- Fixed underline gaps by applying underline to word wrapper instead of character spans
- Replaced `SHOW_PINYIN` boolean with dropdown for `none`, `unknown-only`, and `all` options
- Fixed continuous mode logic to properly honor `window.subtitleConfig.continuous` setting

### User Interaction & Controls
- Created keyboard shortcuts for subtitle navigation (`R`, `S`, `F`)
- Implemented auto-pause after each subtitle line when autoPause config is active
- Added slider for custom auto-pause delay duration in milliseconds
- Updated auto-pause dropdown to append delay to subtitle end time instead of overriding it
- Switched from timer-based auto-pause to polling loop that checks every 100-300ms for pause timing
- Added guard conditions to ensure pause only fires if correct subtitle is still active
- Implemented rewind logic to jump back to correct subtitle if active subtitle changed before pause

### Settings Persistence & Storage
- Implemented Chrome storage sync for cross-device settings persistence
- Added storage.js module with save/load/reset functionality for all control panel settings
- Centralized default settings in storage.js getDefaultSettings() function
- Added "Reset to Defaults" button for easy settings management
- Added fallback to localStorage when Chrome storage unavailable

### Code Refactoring & Architecture
- Split code into modular files: `overlay.js`, `preprocess.js`, `live.js`, `keyboard.js`, `utils.js`
- Refactored code to use `initializeForCurrentVideo()` helper for shared setup
- Refactored translation visibility to use CSS `display` toggle instead of DOM manipulation
- Refactored code to combine pinyin rendering logic into single `forEach` loop for better maintainability
- Removed redundant window.subtitleConfig object from control.js
- Extracted skip logic functionality from control.js into separate helper_scripts/control/skip-logic.js module
- Extracted UI state management functions from control.js into helper_scripts/control/ui-managers.js module
- Extracted control binders into separate modules: appearance-binders.js, behavior-binders.js, settings-binders.js

### Bug Fixes & Stability Improvements
- Fixed control panel appearing on wrong tabs by checking for Plex video presence
- Resolved initialization running multiple times causing duplicated subtitles
- Fixed video switching issues by waiting for `readyState >= 2` before re-initializing
- Updated UI update logic to prevent double-injection bugs
- Fixed overlay not being fully removed between videos using `.remove()` instead of `.innerHTML = ""`
- Fixed control panel initialization bug by deferring creation until `initializeForCurrentVideo()` completes
- Fixed input blur issue where keyboard shortcuts wouldn't work after selecting dropdowns
- Fixed live vs preprocessed mode switching bug by adding `stopLiveMode()` and `stopPreprocessedMode()` functions
- Fixed click interception issues with subtitle panel hover trigger
- Discovered and fixed Chrome extension file access issues with non-ASCII characters in filenames
- Updated normalization function to remove `#` and handle other problematic characters
- Fixed live mode background styling issue where background only covered first character instead of entire subtitle line by aligning DOM structure with preprocessed mode

### Development Tools & Debugging
- Added debug logging for main functions and video readiness tracking
- Made `setupKeyboardShortcuts()` safe to call multiple times
- Added debugging tools including Chrome DevTools Sources panel and Live Expressions
- Added utility functions to process subtitle data and calculate LingQ status percentages
- Explored global state conflicts and version tracking to prevent old polling loops from firing

