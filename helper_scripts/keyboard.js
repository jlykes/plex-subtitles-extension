// === helper_scripts/keyboard.js ===

// This module sets up keyboard shortcuts to control subtitle playback and Plex UI behavior.
//
// Shortcuts:
//   S - Repeats the currently displayed subtitle
//   A - Jumps to the previous subtitle in the list
//   D - Advances to the next subtitle
//   H - Toggles visibility of the Plex UI overlay (playback controls)
// 
// These shortcuts only function in preprocessed subtitle mode,
// where `window.subtitleList` and `window.lastSubtitleStartTime`
// are populated from the enriched JSON subtitle file.

// Used to make sure doesn't run more than ones
let keyboardShortcutsInitialized = false;

// Tracks whether Plex UI is currently hidden
window.__plexUIHidden = false;


/**
 * Toggles visibility of known Plex UI elements (e.g., playback controls, overlays)
 * by modifying their `display` property. Targets a known list of DOM elements
 * based on class names and data-testid attributes used by Plex.
 */
function togglePlexUIBlocker() {
  const elements = document.querySelectorAll(`
    .AudioVideoFullPlayer-topBar-Cv6J6C,
    .AudioVideoFullPlayer-bottomBar-h224iE,
    .PlayerControls-controls-PXkgmR,
    .PlayPauseOverlay-overlay-lF71cy,
    [data-testid="playerControlsContainer"]
  `);

  // Check if all targeted elements are currently hidden
  const currentlyHidden = Array.from(elements).every(el => el.style.display === "none");

  // Toggle visibility by setting display to 'none' or reverting it
  elements.forEach(el => {
    el.style.display = currentlyHidden ? "" : "none";
  });

  // Track the current hidden state globally
  window.__plexUIHidden = !currentlyHidden;
  console.log(`🎛️ Plex UI is now ${currentlyHidden ? "visible" : "hidden"}`);
}

/**
 * Sets up global keyboard event listener for controlling subtitle navigation
 * and toggling the Plex UI overlay.
 */
function setupKeyboardShortcuts() {
  if (keyboardShortcutsInitialized) return;
  
  keyboardShortcutsInitialized = true; // Prevent multiple initializations

  window.addEventListener("keydown", (e) => {
    // Attempt to find the Plex video element by class name
    const video = findPlexVideoElement();
    if (!video) {
      return;
    }

    const key = e.key.toLowerCase();

    // H - Toggle Plex UI overlay visibility
    if (key === "h") {
      togglePlexUIBlocker();
      return;
    }

    // S - Repeat the current subtitle
    if (key === "s" && window.lastSubtitleStartTime != null) {
      video.currentTime = window.lastSubtitleStartTime;
      video.play();
    }

    // A - Jump to the previous subtitle
    if (key === "a") {
      const index = window.subtitleList?.findIndex(s => s.start === window.lastSubtitleStartTime);
      if (index > 0) {
        const prev = window.subtitleList[index - 1];
        window.lastSubtitleStartTime = prev.start;
        video.currentTime = prev.start;
        video.play();
      }
    }

    // D - Jump to the next subtitle
    if (key === "d") {
      const index = window.subtitleList?.findIndex(s => s.start === window.lastSubtitleStartTime);
      if (index >= 0 && index < window.subtitleList.length - 1) {
        const next = window.subtitleList[index + 1];
        window.lastSubtitleStartTime = next.start;
        video.currentTime = next.start;
        video.play();
      }
    }
  });

  // Also allow click-to-pause when Plex UI is hidden
  // Ensure click-to-pause still works when Plex UI is hidden
  document.addEventListener("click", (event) => {
    const video = findPlexVideoElement();
    if (!video) {
      return;
    }
  
    const isSubtitlePanel = event.target.closest("#subtitle-control-panel");
    const isSubtitleOverlay = event.target.closest("#custom-subtitle-overlay");
  
    console.log("🖱️ Click target:", event.target);
    console.log("➡️ Subtitle Panel:", !!isSubtitlePanel);
    console.log("➡️ Subtitle Overlay:", !!isSubtitleOverlay);
    console.log("➡️ Plex UI hidden?", window.__plexUIHidden);
  
    if (
      window.__plexUIHidden &&
      !isSubtitlePanel &&
      !isSubtitleOverlay
    ) {
      console.log(`[🖱️ Click during hidden UI] Toggling playback`);
      video.paused ? video.play() : video.pause();
    }
  });
}

// Note: Call setupKeyboardShortcuts() from main() in content.js
// after subtitles have been loaded and the video element is ready.
