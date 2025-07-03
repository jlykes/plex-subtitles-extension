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
const SUBTITLE_POSITION = "bottom";

// Subtitle text display formatting
const SUBTITLE_FONT_SIZE_VH = 5.5;
const SUBTITLE_LINE_HEIGHT = 1.1;
const SUBTITLE_BOTTOM_OFFSET_VH = 15;
const SUBTITLE_MAX_WIDTH_VW = 90;

//////////////////////////////
// 2. VIDEO SWITCH MONITOR
//////////////////////////////

// Looks for the active Plex video element based on known CSS class
function findPlexVideoElement() {
  return [...document.querySelectorAll("video")].find(el =>
    el.classList.contains("HTMLMedia-mediaElement-u17S9P")
  );
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

        // Delay to let Plex update the DOM (e.g. title metadata)
        setTimeout(() => {
          loadSubtitlesForCurrentVideo(lingqTerms);
        }, 1000);
      }
    } else if (lastVideoExists) {
      // The video has been closed or ended
      lastVideoSrc = null;
      lastVideoExists = false;
      clearSubtitleOverlay();
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
    updateModeDisplay("preprocessed");
    runPreprocessedMode(lingqTerms, filename);
  } else {
    console.warn("🔁 No enriched subtitle JSON found. Falling back to live subtitle mode.");
    updateModeDisplay("live");

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
  if (typeof bindControlPanelListeners === "function") {
    bindControlPanelListeners();
  }

  // Load user's LingQ vocabulary terms
  const lingqTerms = await loadLingQTerms();

  // Create overlay container and suppress original Plex subtitles
  createOverlayContainer();
  hideOriginalPlexSubtitles();

  // Setup keyboard shortcuts (S/A/D)
  setupKeyboardShortcuts();

  // Load and display subtitles for the current video
  await loadSubtitlesForCurrentVideo(lingqTerms);

  // ⛔️ Prime lastVideoSrc and lastVideoExists to avoid duplicate subtitle loading
  const initialVideo = findPlexVideoElement();
  if (initialVideo) {
    lastVideoSrc = initialVideo.src;
    lastVideoExists = true;
  }

  // Continuously monitor for video switches and refresh subtitles
  monitorForVideoChange(lingqTerms);
}

// Attempt to run immediately
main();

// Fallback: if main() exits early, watch for video and retry once
let mainInterval = setInterval(() => {
  const video = findPlexVideoElement();
  if (video) {
    console.log("🎬 Detected late video. Initializing subtitle overlay...");
    main();
    clearInterval(mainInterval);
  }
}, 1000);
