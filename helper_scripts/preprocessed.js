// === helper_scripts/preprocessed.js ===
// This module handles preprocessed subtitle mode for Plex,
// which uses enriched JSON data to display subtitles with enhanced features.

// Interval handle for polling loop and optional pause scheduling
let preprocessedInterval = null;
let autoPauseTimeout = null;

/**
 * Entry point: starts preprocessed subtitle mode.
 * Loads enriched JSON, initializes overlay container, begins polling loop.
 * @param {Array} lingqTerms - Array of LingQ vocabulary terms to highlight in subtitles
 * @param {string} filename - Name of the preprocessed subtitle JSON file to load
 * @returns {void}
 */
function runPreprocessedMode(lingqTerms, filename) {
  console.log(`📦 Preprocessed subtitle mode enabled. Loading: ${filename}`);
  window.lingqTerms = lingqTerms;

  updateModeDisplay("Preprocessed");        // Show current mode in control panel
  clearSubtitleOverlay();                   // Clear existing overlay
  createOverlayContainer();                 // Ensure overlay element is available

  // Fetch enriched subtitles from the packaged JSON file
  fetch(chrome.runtime.getURL(filename))
    .then(res => res.json())
    .then(enrichedSubs => {
      window.subtitleList = enrichedSubs;

      // Stop existing loop if switching videos/modes
      if (preprocessedInterval) {
        clearInterval(preprocessedInterval);
        preprocessedInterval = null;
      }

      // Begin polling playback time to sync subtitles
      startPollingLoop(enrichedSubs, lingqTerms);
    });


  // New function to re-render current subtitle when config changes (e.g., pinyin visibility)
  // Initialized here to ensure it replaces any previous version initiatied by live mode
  window.reRenderCurrentSubtitle = () => {
    const currentSub = window.subtitleList?.find(
      s => s.start === window.lastSubtitleStartTime
    );
    if (!currentSub) return;

    const container = document.getElementById("custom-subtitle-overlay");
    if (!container) return;

    container.innerHTML = "";
    renderPreprocessedLine(currentSub, window.lingqTerms || {});
  };
}

/**
 * Polls every 300ms to determine which subtitle should be displayed.
 * Uses current video time to find appropriate entry in enriched subtitle list.
 * Handles auto-pause logic based on subtitle end times.
 * @param {Array} enrichedSubs - Array of enriched subtitle objects
 * @param {Object} lingqTerms - Object mapping LingQ vocabulary terms to their statuses
 * @returns {void}
 */
function startPollingLoop(enrichedSubs, lingqTerms) {
  let lastRenderedIndex = -1;
  let lastPausedIndex = -1;
  
  preprocessedInterval = setInterval(() => {
    const video = findPlexVideoElement();
    if (!video) return;

    const currentTime = video.currentTime;

    // Decide whether to use continuous vs. normal subtitle display mode
    // If continuous mode, get the most recent subtitle; otherwise, get the active one
    // (which may be null if no subtitle is active)
    const active = window.subtitleConfig.useContinuous
      ? getMostRecentSubtitle(currentTime, enrichedSubs)
      : getActiveSubtitle(currentTime, enrichedSubs);

    if (!active) {
      clearInactiveOverlayIfNeeded();
      return;
    }

    // If the active subtitle hasn't changed, skip rendering
    if (active.start === lastRenderedIndex) return;

    // Set up variables for auto-pause logic, limit pause if repeated subtitle
    const currentIndex = enrichedSubs.findIndex(s => s.start === active.start);
    const nextSub = enrichedSubs[currentIndex + 1];
    const isRepeated = nextSub && nextSub.text?.trim() === active.text?.trim();

    // Render the subtitle line, and update the rendered index
    renderSubtitle(active, lingqTerms);
    lastRenderedIndex = active.start;

    // Initialize auto-pause if enabled and conditions are met
    if (shouldAutoPause(active, lastPausedIndex, isRepeated)) {
      scheduleAutoPause(active.end, () => {
        const v = findPlexVideoElement();
        if (v && !v.paused) {
          v.pause();
          console.log("⏸️ Auto-paused at subtitle end");
        }
      });
      lastPausedIndex = active.end;
    }
  }, 300);
}

/**
 * Creates and styles the outer wrapper, main line, and translation divs
 * for subtitle rendering. Handles translation visibility modes.
 * @param {string} translationText - The subtitle translation text to display
 * @returns {{ wrapper: HTMLElement, mainLine: HTMLElement, translation: HTMLElement }} The created elements
 */
function createSubtitleWrapper(translationText) {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.cursor = "pointer";
  wrapper.style.marginTop = "4px";

  const mainLine = document.createElement("div");
  mainLine.style.display = "inline-block";
  mainLine.style.verticalAlign = "bottom";
  mainLine.style.position = "relative";
  mainLine.style.textAlign = "center";

  const translation = document.createElement("div");
  translation.textContent = translationText || "";
  translation.style.fontSize = "0.5em";
  translation.style.color = "#ccc";
  translation.style.marginTop = "4px";
  translation.style.whiteSpace = "normal";
  translation.style.wordBreak = "break-word";
  translation.style.textAlign = "center";
  translation.style.maxWidth = "90vw";
  translation.style.minHeight = "1em";

  // Configure visibility based on translation setting
  const visibility = window.subtitleConfig.translation;
  if (visibility === "off") {
    translation.style.visibility = "hidden";
  } else if (visibility === "on-hover") {
    translation.style.visibility = "hidden";
    wrapper.addEventListener("mouseenter", () => {
      translation.style.visibility = "visible";
    });
    wrapper.addEventListener("mouseleave", () => {
      translation.style.visibility = "hidden";
    });
  } else if (visibility === "always") {
    translation.style.visibility = "visible";
  }

  return { wrapper, mainLine, translation };
}


/**
 * Renders a subtitle line by generating annotated spans for each word
 * and displaying a translation block with hover/visibility rules.
 * @param {Object} sub - The subtitle object containing text, segmented words, and translation
 * @param {Object} lingqTerms - Object mapping LingQ vocabulary terms to their statuses
 * @returns {void}
 */
function renderPreprocessedLine(sub, lingqTerms) {
  console.log("🔁 renderPreprocessedLine called with:", sub.text);

  // Get the overlay container and clear previous content
  const container = document.getElementById("custom-subtitle-overlay");
  container.innerHTML = "";

  // Update the current explanation in the control panel
  updateCurrentExplanation(sub.explanation || "");

  // Create wrapper, mainline, and translation divs
  const { wrapper, mainLine, translation } = createSubtitleWrapper(sub.translation);

  // Create and append one annotated span per segmented word
  sub.segmented.forEach(entry => {
    const word = entry.word;
    const pinyin = entry.pinyin;
    const status = lingqTerms[word];
    const meaning = sub.word_meanings?.find(w => w.word === word)?.meaning || "";

    const wordSpan = createWordWrapper({ word, pinyin, status, meaning });
    mainLine.appendChild(wordSpan);
  });

  // Append the main line and translation to the wrapper
  wrapper.appendChild(mainLine);
  wrapper.appendChild(translation);
  container.appendChild(wrapper);
}

/**
 * Gets the subtitle currently covering the playback time (normal mode).
 * If no subtitle is active, returns undefined.
 * @param {number} currentTime - Current playback time in seconds
 * @param {Array} subs - Array of subtitle objects with start and end times
 * @returns {Object|undefined} - The active subtitle object or undefined if none is active
 */
function getActiveSubtitle(currentTime, subs) {

  // Find the subtitle that is currently active based on playback time
  // It does this by finding the first subtitle where currentTime is between start and end
  // of that subtitle
  return subs.find(s => currentTime >= s.start && currentTime <= s.end);
}

/**
 * Gets the most recent subtitle that started before current time (continuous mode).
 * This is used to display the last subtitle line
 * when the user is still watching but no new subtitle has started.
 * @param {number} currentTime - Current playback time in seconds
 * @param {Array} subs - Array of subtitle objects with start times
 * @returns {Object|null} - The most recent subtitle object or null if none found
 */
function getMostRecentSubtitle(currentTime, subs) {
  
  // Iterate backwards through the subtitles to find the most recent one
  // that started before the current playback time
  for (let i = subs.length - 1; i >= 0; i--) {
    if (currentTime >= subs[i].start) return subs[i];
  }
  return null;
}

/**
 * Clears overlay display when no subtitle is active.
 * If continuous mode is not enabled, it empties the overlay container
 * and resets the last rendered text to avoid showing stale content.
 * This is useful when the user stops playback or switches videos.
 * @returns {void}
 */
function clearInactiveOverlayIfNeeded() {
  if (!window.subtitleConfig.useContinuous) {
    const container = document.getElementById("custom-subtitle-overlay");
    if (container) {
      container.innerHTML = "";
      window.lastRenderedText = "";
    }
  }
}

/**
 * Handles overlay and state update for a given subtitle line.
 * Renders the subtitle text, updates the last subtitle start time,
 * and stores the last rendered text for potential re-rendering.
 * @param {Object} sub - The subtitle object containing start time, text, etc.
 * @param {Object} lingqTerms - Object mapping LingQ vocabulary terms to their statuses
 * @returns {void}
 */
function renderSubtitle(sub, lingqTerms) {
  const container = document.getElementById("custom-subtitle-overlay");
  if (!container) return;

  renderPreprocessedLine(sub, lingqTerms);

  window.lastSubtitleStartTime = sub.start;
  window.lastRenderedText = sub.text;
}

/**
 * Determines if auto-pause should trigger based on current config and context.
 * Checks if auto-pause is enabled, the subtitle has not yet ended,
 * and whether the subtitle is not a repeated line.
 * @param {Object} active - The currently active subtitle object
 * @param {number} lastPausedIndex - The index of the last paused subtitle
 * @param {boolean} isRepeated - Whether the current subtitle is a repeated line
 * @returns {boolean} - True if auto-pause should be triggered, false otherwise
 */
function shouldAutoPause(active, lastPausedIndex, isRepeated) {
  
  // Works by checking if auto-pause is enabled in the config,
  // the active subtitle has not yet ended, and it is not a repeated line.
  return (
    window.subtitleConfig.autoPause &&
    active.end !== lastPausedIndex &&
    !isRepeated
  );
}

/**
 * Sets a timeout to auto-pause playback after the subtitle ends.
 * Calculates the delay based on the end time of the subtitle,
 * current playback time, and any additional delay configured.
 * Clears any existing timeout to avoid multiple pauses.
 * @param {number} endTime - The end time of the subtitle in seconds
 * @param {Function} callback - The function to call when the timeout expires
 * @returns {void}
 */
function scheduleAutoPause(endTime, callback) {
  clearTimeout(autoPauseTimeout);
  const now = findPlexVideoElement()?.currentTime ?? 0;
  const extra = window.subtitleConfig.autoPauseDelayMs || 0;
  const delay = Math.max(0, (endTime - now) * 1000 + extra);
  autoPauseTimeout = setTimeout(callback, delay);
}

/**
 * Stops preprocessed mode when switching videos or subtitle modes.
 * Clears the polling interval and any scheduled auto-pause timeouts.
 * This ensures no stale intervals or timeouts remain active,
 * preventing unexpected behavior when the user resumes playback.
 * @returns {void}
 */
window.stopPreprocessedMode = function () {
  if (preprocessedInterval) {
    clearInterval(preprocessedInterval);
    preprocessedInterval = null;
    console.log("🛑 Preprocessed subtitle polling stopped");
  }
  clearTimeout(autoPauseTimeout);
  autoPauseTimeout = null;
};
