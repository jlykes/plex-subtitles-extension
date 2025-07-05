// === Plex Language Overlay Script ===
//
// Entry point for the Plex subtitle enhancement overlay.
// This script coordinates modular helpers for rendering and enriching subtitles:
//
// 🔹 utils.js        → Utility functions: normalizeTitle, checkEnrichedJSONExists, etc.
// 🔹 overlay.js      → Creates and styles the subtitle overlay container
// 🔹 preprocessed.js → Loads and renders enriched subtitle JSON (ruby, coloring, etc.)
// 🔹 keyboard.js     → Keyboard shortcuts (S/A/D) for subtitle navigation
// 🔹 live.js         → Real-time subtitle detection/annotation if no enriched file
//
// By default, uses preprocessed subtitles if available; otherwise, falls back to live annotation.

//////////////////////////////
// 1. CONFIG & CONSTANTS
//////////////////////////////

// Subtitle text display formatting
const SUBTITLE_LINE_HEIGHT = 1.1;
const SUBTITLE_MAX_WIDTH_VW = 90;

// Flags to track the state of the last video
let lastVideoSrc = null; // Stores the `src` of the last known video so we can detect changes
let videoPreviouslyDetected = false; // Boolean flag indicating whether we had a video previously

//////////////////////////////
// 2. VIDEO SWITCH MONITOR
//////////////////////////////

/**
 * Shared function for initializing subtitle overlay system for current video
 * @param {*} lingqTerms Array of LingQ vocabulary terms to highlight in subtitles
 * @returns {Promise<void>}
 */
async function initializeForCurrentVideo(lingqTerms) {
  
  //Initialize overlay container, keyboard shortcuts, control panel
  createOverlayContainer();
  hideOriginalPlexSubtitles(); // To prevent interference from any old subs  
  setupKeyboardShortcuts(); // Set up subtitle keyboard navigation (S/A/D)
  await createControlPanel(); // Done as await function in so that DOM chagnes made before continue
  bindControlPanelListeners();

  // Load subtitles based on enriched JSON (or fall back to live mode)
  await loadSubtitlesForCurrentVideo(lingqTerms);
}


/**
 * Periodically checks for changes in the Plex video element.
 * If a new video starts or the current one ends, we react accordingly.
 * @param {Array} lingqTerms Array of LingQ vocabulary terms to highlight in subtitles
 * @returns {void}
 */
function monitorForVideoChange(lingqTerms) {
  console.log("🔍 monitorForVideoChange() is running");

  // Run this check every 100ms
  setInterval(() => {
    const video = findPlexVideoElement();

    // ❌ CASE 1: No video currently exists in the DOM
    if (!video) {
      // But if we had previously detected a video, it means the video has ended or been closed
      if (videoPreviouslyDetected) {
        handleVideoClosed(); // 🧼 Clean up all UI elements and state
      }
      return; // Exit early to avoid running the rest of the logic
    }

    // ✅ CASE 2: Video exists
    const currentSrc = video.src;

    // We consider it a "new" video if:
    // 1. There was no video before (`videoPreviouslyDetected` is false), or
    // 2. The `src` has changed (indicating a different video is playing)
    if (!videoPreviouslyDetected || currentSrc !== lastVideoSrc) {
      console.log("🔄 New video detected. Re-initializing...");

      // Update the tracking state
      lastVideoSrc = currentSrc;
      videoPreviouslyDetected = true;

      // Stop any existing modes (preprocessed or live), clear overlays
      cleanUpActiveModes();

      // Wait until the video is fully ready (readyState >= 2), then initialize
      waitForVideoReadyAndInitialize();
    }

    // ✅ CASE 3: If video exists and hasn't changed — do nothing
    // (This lets the polling continue silently without unnecessary updates)

  }, 100); // Check every 100ms
}


/**
 * Stops all subtitle-related activity and removes overlays.
 * Called when a new video starts, or the current one ends.
 * This ensures we don't have multiple overlays or listeners active at once.
 * @returns {void}
 */
function cleanUpActiveModes() {
  clearSubtitleOverlay();
  clearControlPanel();
  window.stopPreprocessedMode();
  window.stopLiveMode();
}


/**
 * Handles the case where a video has ended or was closed.
 * This occurs when `findPlexVideoElement()` returns null after having seen a video before.
 * This function resets the tracking state and cleans up all UI elements.
 * @returns {void}
 */
function handleVideoClosed() {
  console.log("🛑 Video ended or was closed. Cleaning up...");

  // Reset our tracking state
  lastVideoSrc = null;
  videoPreviouslyDetected = false;

  // Clean up all UI components and stop active modes
  cleanUpActiveModes();
}


/**
 * Waits for the video to be fully loaded (readyState >= 2),
 * then initializes subtitle overlay logic.
 * This is necessary because the video element may exist in the DOM
 * before it is fully playable.
 * @returns {void}
 */
function waitForVideoReadyAndInitialize() {
  const readyCheck = setInterval(() => {
    const newVideo = findPlexVideoElement();

    // Check that the video exists and is playable
    if (newVideo && newVideo.readyState >= 2) {
      clearInterval(readyCheck); // Stop polling
      console.log("🎬 Video is ready. Initializing subtitle overlay...");

      // Async init: refresh LingQ terms and start rendering subtitles
      (async () => {
        const lingqTermsUpdated = await loadLingQTerms();
        await initializeForCurrentVideo(lingqTermsUpdated);
      })();
    } else {
      // Still waiting for the video to load
      console.log("⏳ Waiting for video to become playable...");
    }
  }, 500); // Check readiness every 500ms
}

//////////////////////////////
// 3. SUBTITLE LOADING
//////////////////////////////

/**
 * Load enriched subtitles if available; otherwise fallback to real-time annotation
 * @param {*} lingqTerms Array of LingQ vocabulary terms to highlight in subtitles
 * @returns {Promise<void>}
 */
async function loadSubtitlesForCurrentVideo(lingqTerms) {
  
  //Pull title
  console.log("📥 loadSubtitlesForCurrentVideo() is running");
  const rawTitle = await detectMediaTitleWithRetry();
  console.log("📝 Detected raw title from DOM:", rawTitle);

  //Normalize title
  const normalized = rawTitle ? normalizeTitle(rawTitle) : null;
  console.log("🔧 Normalized title:", normalized);
  const filename = normalized ? `enriched_subtitles/${normalized}.enriched.json` : null;

  //Try using enriched subtitles; if so, go to preprocessed mode; if not found, go to live mode
  if (filename && await checkEnrichedJSONExists(normalized)) {

    // Initiate preprocessed mode
    console.log(`📦 Using enriched subtitles from: ${filename}`);
    runPreprocessedMode(lingqTerms, filename);
    
  } else {

    // Initiate live mode
    console.warn("🔁 No enriched subtitle JSON found. Falling back to live subtitle mode.");
    const segmentit = window.Segmentit.useDefault(new window.Segmentit.Segment());

    // Wait for Plex to render subtitles before processing
    setTimeout(() => waitForSubtitles(lingqTerms, segmentit), 3000);
  }
}


//////////////////////////////
// 4. ENTRY POINT
//////////////////////////////


/**
 * Main entry point for the Plex subtitle overlay system.
 * This function is responsible for setting up the subtitle overlay,
 * loading LingQ vocabulary terms, and monitoring for video changes.
 * It will not run until a playable video is detected in the DOM.
 * @returns {Promise<void>}
 */
async function main() {
  console.log("🚀 main() function is running");
  
  // Attempt to find video; if not loaded yet, return
  const video = findPlexVideoElement();
  if (!video) {
    console.log("🚫 No valid Plex video detected. Subtitle overlay system not initialized.");
    return;
  }

  // Load user's LingQ vocabulary terms
  const lingqTerms = await loadLingQTerms();

  // Run core initialization logic for current video
  await initializeForCurrentVideo(lingqTerms);

  // ⛔️ Prime lastVideoSrc and videoPreviouslyDetected to avoid duplicate subtitle loading
  const initialVideo = findPlexVideoElement();
  if (initialVideo) {
    lastVideoSrc = initialVideo.src;
    videoPreviouslyDetected = true;
  }

  // Continuously monitor for video switches and refresh subtitles
  monitorForVideoChange(lingqTerms);
}


/**
 * Do NOT run main() immediately — video element may exist before it's fully loaded.
 * Instead, use the fallback interval below to wait until video.readyState >= 2
 * Fallback: poll every second until a playable video is detected.
 * This avoids initializing too early (e.g. while video is still spinning/loading).
 * @returns {HTMLVideoElement|null} The Plex video element or null if not found.
 * @description
 */
let mainInterval = setInterval(() => {
  const video = findPlexVideoElement();

  if (video && video.readyState >= 2) { //If video loaded AND playable
    console.log("🎬 Detected playable video. Initializing subtitle overlay...");
    main();
    clearInterval(mainInterval); // 🧹 Stop polling once main() successfully runs
  } else if (video) { //If video loaded and NOT YET playable
    console.log("⏳ Video detected but not ready. Waiting...");
  }
}, 100);
