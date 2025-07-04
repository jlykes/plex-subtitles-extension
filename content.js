// === Plex Language Overlay Script ===
//
// This script acts as the entry point for the subtitle enhancement overlay on Plex.
// It integrates a modular system for rendering and enriching subtitles with the following helper scripts:
//
// 🔹 utils.js          → utility functions: normalizeTitle, checkEnrichedJSONExists, etc.
// 🔹 overlay.js        → creates and styles the subtitle overlay container
// 🔹 preprocessed.js   → loads and renders enriched subtitle JSON with ruby, coloring, etc.
// 🔹 keyboard.js       → sets up keyboard shortcuts (S/A/D) to navigate subtitles
// 🔹 live.js           → handles real-time subtitle detection and annotation when no enriched file is available
//
// 💡 By default, the script attempts to use preprocessed subtitles (if available).
//    If none are found, it falls back to live subtitle annotation using MutationObserver.

//////////////////////////////
// 1. CONFIG & CONSTANTS
//////////////////////////////

// These settings control visual and behavior parameters for the overlay
const USE_CONTINUOUS_SUBTITLES = true;
const SHOW_PINYIN = true;
const ENABLE_LINGQ_COLORING = true;

// Subtitle text display formatting
const SUBTITLE_LINE_HEIGHT = 1.1;
const SUBTITLE_MAX_WIDTH_VW = 90;

//////////////////////////////
// 2. VIDEO SWITCH MONITOR
//////////////////////////////

// Shared function for initializing subtitle overlay system for current video
async function initializeForCurrentVideo(lingqTerms) {
  // Ensure subtitle overlay container exists
  createOverlayContainer();

  // Hide the default Plex subtitles to prevent interference
  hideOriginalPlexSubtitles();

  // Set up subtitle keyboard navigation (S/A/D)
  setupKeyboardShortcuts();

  // Create and configure the subtitle control panel UI
  await createControlPanel();
  bindControlPanelListeners();

  // Load subtitles based on enriched JSON (or fall back to live mode)
  await loadSubtitlesForCurrentVideo(lingqTerms);
}

// Track video state and react to new or removed videos
let lastVideoSrc = null;
let lastVideoExists = false;

function monitorForVideoChange(lingqTerms) {
  console.log("🔍 monitorForVideoChange() is running");
  setInterval(() => {
    const video = findPlexVideoElement();

    if (video) {
      const currentSrc = video.src;
      if (!lastVideoExists || currentSrc !== lastVideoSrc) {
        // A new video has started playing
        lastVideoSrc = currentSrc;
        lastVideoExists = true;
        clearSubtitleOverlay();

        // 🧼 Always stop both modes before starting a new one
        if (typeof window.stopPreprocessedMode === "function") {
          window.stopPreprocessedMode();
        }
        if (typeof window.stopLiveMode === "function") {
          window.stopLiveMode();
        }

        // Wait until the new video is fully playable (readyState >= 2) before initializing
        const waitForReadyState = setInterval(() => {
          const newVideo = findPlexVideoElement();
          if (newVideo && newVideo.readyState >= 2) {
            clearInterval(waitForReadyState);
            console.log("🎬 New video is now playable. Initializing subtitle overlay...");

            (async () => {
              const lingqTermsUpdated = await loadLingQTerms();
              await initializeForCurrentVideo(lingqTermsUpdated);
            })();
          } else {
            console.log("⏳ Waiting for new video to become playable...");
          }
        }, 500);
      }
    } else if (lastVideoExists) {
      // The video has been closed or ended
      lastVideoSrc = null;
      clearControlPanel(); // Remove the control panel and trigger from DOM
      lastVideoExists = false;
      clearSubtitleOverlay();

      // 🧼 Cleanup any polling or observers
      if (typeof window.stopPreprocessedMode === "function") {
        window.stopPreprocessedMode();
      }
      if (typeof window.stopLiveMode === "function") {
        console.log("🧹 Attempting to stop live subtitle mode:", typeof window.stopLiveMode);
        window.stopLiveMode();
      }
    }
  }, 100); // Check every 100ms
} 

//////////////////////////////
// 3. SUBTITLE LOADING
//////////////////////////////

// Load enriched subtitles if available; otherwise fallback to real-time annotation
async function loadSubtitlesForCurrentVideo(lingqTerms) {
  console.log("📥 loadSubtitlesForCurrentVideo() is running");
  const rawTitle = await detectMediaTitleWithRetry();
  console.log("📝 Detected raw title from DOM:", rawTitle);

  const normalized = rawTitle ? normalizeTitle(rawTitle) : null;
  console.log("🔧 Normalized title:", normalized);

  if (normalized && normalized.charCodeAt(0) < 128) {
    console.log("✅ Leading character is ASCII:", normalized.charAt(0));
  } else if (normalized) {
    console.warn("❗ Non-ASCII leading character detected:", normalized.charAt(0), "(char code:", normalized.charCodeAt(0), ")");
  }

  const filename = normalized ? `enriched_subtitles/${normalized}.enriched.json` : null;

  if (filename && await checkEnrichedJSONExists(normalized)) {
    console.log(`📦 Using enriched subtitles from: ${filename}`);
    runPreprocessedMode(lingqTerms, filename);
    
  } else {
    console.warn("🔁 No enriched subtitle JSON found. Falling back to live subtitle mode.");
    const segmentit = window.Segmentit.useDefault(new window.Segmentit.Segment());

    // Wait for Plex to render subtitles before processing
    setTimeout(() => waitForSubtitles(lingqTerms, segmentit), 3000);
  }
}

//////////////////////////////
// 4. ENTRY POINT
//////////////////////////////

// Main function to initialize the full overlay system
async function main() {
  console.log("🚀 main() function is running");
  const video = findPlexVideoElement();
  if (!video) {
    console.log("🚫 No valid Plex video detected. Subtitle overlay system not initialized.");
    return;
  }

  // Create the control panel (if not already created)
  createControlPanel(); 

  // Bind event listeners for the control panel dropdowns and sliders
  bindControlPanelListeners();

  // Load user's LingQ vocabulary terms
  const lingqTerms = await loadLingQTerms();

  // Run core initialization logic for current video
  await initializeForCurrentVideo(lingqTerms);

  // ⛔️ Prime lastVideoSrc and lastVideoExists to avoid duplicate subtitle loading
  const initialVideo = findPlexVideoElement();
  if (initialVideo) {
    lastVideoSrc = initialVideo.src;
    lastVideoExists = true;
  }

  // Continuously monitor for video switches and refresh subtitles
  monitorForVideoChange(lingqTerms);
}

// 🔁 Do NOT run main() immediately — video element may exist before it's fully loaded.
//    Instead, use the fallback interval below to wait until video.readyState >= 2

// Fallback: poll every second until a playable video is detected.
// This avoids initializing too early (e.g. while video is still spinning/loading).
let mainInterval = setInterval(() => {
  const video = findPlexVideoElement();

  if (video && video.readyState >= 2) {
    console.log("🎬 Detected playable video. Initializing subtitle overlay...");
    main();
    clearInterval(mainInterval); // 🧹 Stop polling once main() successfully runs
  } else if (video) {
    console.log("⏳ Video detected but not ready. Waiting...");
  }
}, 100);
