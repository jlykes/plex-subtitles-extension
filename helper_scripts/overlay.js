// === helper_scripts/overlay.js ===
// This module creates a custom subtitle overlay container for Plex,
// which replaces the native subtitles with enriched content. 


/**
 * Creates the custom subtitle overlay container in the DOM.
 * This container will hold the enriched subtitles and apply custom styles.
 * It also sets up event listeners for mouse interactions to pause/resume video playback.
 * @returns {void}
 */
function createOverlayContainer() {

  // Remove any existing overlay to prevent duplication or stale state
  const existing = document.getElementById("custom-subtitle-overlay");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "custom-subtitle-overlay";

  // Positioning: top or bottom depending on config
  container.style.position = "absolute";
  const position = window.subtitleConfig?.position || "bottom";  // fallback just in case

  if (position === "bottom") {
    container.style.bottom = `${window.subtitleConfig.heightVH}vh`;
    container.style.top = "auto";
    container.style.transform = "translateX(-50%)";
  } else if (position === "top") {
    container.style.top = `${window.subtitleConfig.heightVH}vh`;
    container.style.bottom = "auto";
    container.style.transform = "translateX(-50%)";
  } else if (position === "center") {
    container.style.top = "50%";
    container.style.bottom = "auto";
    container.style.transform = "translate(-50%, -50%)";
  }

  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";

  // Sizing and styling
  container.style.fontSize = `${window.subtitleConfig.fontSizeVH}vh`;
  container.style.lineHeight = SUBTITLE_LINE_HEIGHT;
  container.style.zIndex = "9999";
  container.style.pointerEvents = "auto";         // Allow interaction with subtitles (e.g., copy)
  container.style.userSelect = "text";             // Allow users to select/copy text
  container.style.color = "white";
  // Padding and border radius will be set by updateSubtitleBackground() based on translation visibility
  container.style.fontFamily = "sans-serif";
  container.style.textAlign = "center";
  container.style.maxWidth = `${SUBTITLE_MAX_WIDTH_VW}vw`;
  container.style.whiteSpace = "pre-wrap";         // Preserve line breaks if needed
  container.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";  // Improve contrast on any background
  container.style.cursor = "text";

  // Background styling is now applied to the main line, not the container
  // This is handled by updateSubtitleBackground() when content is rendered

  // Add to the DOM
  document.body.appendChild(container);

  // Apply initial background styling
  window.updateSubtitleBackground?.();

  // Add custom styles for ruby/pinyin and hover highlighting
  const style = document.createElement("style");
  style.textContent = `
    ruby {
      ruby-position: over;
      user-select: text !important;
    }
    rt {
      font-size: 0.5em;
      line-height: 1;
      color: lightgray;
      user-select: none !important;
      pointer-events: none;
    }
    span {
      user-select: text !important;
    }
    .hover-highlight {
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  container.addEventListener("mouseenter", () => {
    const video = findPlexVideoElement();
    if (video && !video.paused) {
      video.pause();
      container.dataset.wasPlaying = "true";
    }
  });

  container.addEventListener("mouseleave", () => {
    const video = findPlexVideoElement();
    if (video && container.dataset.wasPlaying === "true") {
      video.play();
      delete container.dataset.wasPlaying;
    }
  });

}

/**
 * Hides the original Plex subtitles completely by applying a CSS rule.
 * Ensures only the custom overlay is visible to the user.
 * @returns {void}
 */
function hideOriginalPlexSubtitles() {
  const style = document.createElement("style");
  style.textContent = `
    .libjass-subs {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Clears all content from the custom subtitle overlay.
 * This is useful when stopping playback or switching to a new video.
 * It removes the overlay container from the DOM and resets subtitle tracking state.
 * @returns {void}
 */
function clearSubtitleOverlay() {
  const container = document.getElementById("custom-subtitle-overlay");
  if (container) {
    container.remove(); // Remove the container entirely from DOM
    console.log("🧹 Removed custom subtitle overlay container from DOM.");
  }

  // Reset subtitle tracking state so we don’t display outdated content
  window.lastSubtitleStartTime = null;
  window.subtitleList = [];
} 

/// LOGIC TO HIDE MOUSE UNLESS MOVE
let cursorEnforcementActive = true;
let hideCursorTimer = null;

/**
 * Adds a custom CSS style to hide the cursor across the document.
 * This style is applied globally to all elements, including videos.
 * It ensures the cursor remains hidden unless the user moves the mouse.
 * @returns {void}
 * @see removeCursorHideStyle() to revert this behavior.
 */
function addCursorHideStyle() {
  if (!document.getElementById("custom-cursor-hide-style")) {
    const style = document.createElement("style");
    style.id = "custom-cursor-hide-style";
    style.textContent = `
      html, body, video, * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Removes the custom CSS style that hides the cursor.
 * This reverts the cursor behavior back to normal, allowing it to be visible.
 * It is typically called when the user moves the mouse to temporarily show the cursor.
 * @returns {void}
 */
function removeCursorHideStyle() {
  const style = document.getElementById("custom-cursor-hide-style");
  if (style) style.remove();
}

/**
 * Sets up the cursor enforcement logic to hide the cursor after a period of inactivity.
 * It uses a MutationObserver to re-apply the hiding style if the document changes.
 * The cursor is temporarily shown when the user moves the mouse.
 * After 2 seconds of inactivity, the cursor is hidden again.
 * @returns {void}
 */
function setupCursorEnforcement() {
  addCursorHideStyle(); // Initial force-hide

  // Create the observer that re-enforces the hiding
  // This will re-apply the hiding style if the document changes
  // (e.g., new elements added, styles changed)
  const observer = new MutationObserver(() => {
    if (cursorEnforcementActive) {
      addCursorHideStyle();
    }
  });

  // Start observing the document for changes
  // We watch for childList changes, subtree modifications, and attribute changes
  // Specifically looking for style and class changes that might affect cursor visibility
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // Mouse movement temporarily disables hiding
  // When the user moves the mouse, we remove the hiding style
  // and reset the enforcement state to allow cursor visibility
  // After 2 seconds of no movement, we re-apply the hiding style
  document.addEventListener("mousemove", () => {
    removeCursorHideStyle();
    cursorEnforcementActive = false;
    clearTimeout(hideCursorTimer);
    hideCursorTimer = setTimeout(() => {
      cursorEnforcementActive = true;
      addCursorHideStyle();
    }, 2000);
  });
}
