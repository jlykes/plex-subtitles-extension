// === helper_scripts/overlay.js ===

// Creates a custom subtitle overlay container and injects it into the page.
// This overlay will replace Plex's native subtitles and display enriched content
// (e.g., pinyin, coloring, hover tooltips) with custom styling.
function createOverlayContainer() {

  // Remove any existing overlay to prevent duplication or stale state
  const existing = document.getElementById("custom-subtitle-overlay");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "custom-subtitle-overlay";

  // Positioning: top or bottom depending on config
  container.style.position = "absolute";
  container.style.bottom = SUBTITLE_POSITION === "bottom" ? `${SUBTITLE_BOTTOM_OFFSET_VH}vh` : "auto";
  container.style.top = SUBTITLE_POSITION === "top" ? `${SUBTITLE_BOTTOM_OFFSET_VH}vh` : "auto";
  container.style.left = "50%";
  container.style.transform = "translateX(-50%)";

  // Sizing and styling
  container.style.fontSize = `${SUBTITLE_FONT_SIZE_VH}vh`;
  container.style.lineHeight = SUBTITLE_LINE_HEIGHT;
  container.style.zIndex = "9999";
  container.style.pointerEvents = "auto";         // Allow interaction with subtitles (e.g., copy)
  container.style.userSelect = "text";             // Allow users to select/copy text
  container.style.color = "white";
  container.style.padding = "10px 20px";
  container.style.borderRadius = "10px";
  container.style.fontFamily = "sans-serif";
  container.style.textAlign = "center";
  container.style.maxWidth = `${SUBTITLE_MAX_WIDTH_VW}vw`;
  container.style.whiteSpace = "pre-wrap";         // Preserve line breaks if needed
  container.style.textShadow = "2px 2px 4px rgba(0,0,0,0.8)";  // Improve contrast on any background
  container.style.cursor = "text";

  // Add to the DOM
  document.body.appendChild(container);

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

// Hides the original Plex subtitles completely by applying a CSS rule.
// Ensures only the custom overlay is visible to the user.
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

// Clears all content from the custom subtitle overlay.
// This is useful when stopping playback or switching to a new video.
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

// Enforce 'cursor: none !important' using CSS + MutationObserver
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

function removeCursorHideStyle() {
  const style = document.getElementById("custom-cursor-hide-style");
  if (style) style.remove();
}

// Initial force-hide
addCursorHideStyle();

// Create the observer that re-enforces the hiding
const observer = new MutationObserver(() => {
  if (cursorEnforcementActive) {
    addCursorHideStyle();
  }
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class']
});

// Mouse movement temporarily disables hiding
document.addEventListener("mousemove", () => {
  removeCursorHideStyle();             // Let the cursor show
  cursorEnforcementActive = false;    // Disable MutationObserver response

  // Clear any previous timer
  clearTimeout(hideCursorTimer);

  // After 2s of no movement, hide the cursor again
  hideCursorTimer = setTimeout(() => {
    cursorEnforcementActive = true;
    addCursorHideStyle();
  }, 2000);
});
