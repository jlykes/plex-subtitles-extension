// === helper_scripts/preprocessed.js ===
// This module handles preprocessed subtitle mode for Plex,
// which uses enriched JSON data to display subtitles with enhanced features.

// Interval handle for polling loop and optional pause scheduling
let preprocessedInterval = null;
window.lastPausedSubtitleStart = null;
window.autoPausePollingIntervals = window.autoPausePollingIntervals || {};

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
  
  // Enable features available in preprocessed mode
  enableRemoveSilencesInPreprocessedMode();
  showTranslationInPreprocessedMode();
  showAutoPauseInPreprocessedMode();
  showContinuousInPreprocessedMode();
  showBehaviorSectionInPreprocessedMode();

  // Fetch enriched subtitles from the packaged JSON file
  fetch(chrome.runtime.getURL(filename))
    .then(res => res.json())
    .then(enrichedSubs => {
      window.subtitleList = enrichedSubs;

      // Show percentage rows and sentence explanation for preprocessed mode
      showPercentageRows();
      showSentenceExplanation();
      showStatusPercentagesLoading();
      const percentages = calculateLingQStatusPercentages(enrichedSubs, window.lingqTerms);
      updateStatusPercentagesDisplay(percentages);

      // Stop existing loop if switching videos/modes
      if (preprocessedInterval) {
        clearInterval(preprocessedInterval);
        preprocessedInterval = null;
      }

      // Begin polling playback time to sync subtitles
      startPollingLoop(enrichedSubs);
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
    renderPreprocessedLine(currentSub);
  };
}

/**
 * Polls every 300ms to determine which subtitle should be displayed.
 * Uses current video time to find appropriate entry in enriched subtitle list.
 * Handles auto-pause logic based on subtitle end times.
 * @param {Array} enrichedSubs - Array of enriched subtitle objects
 * @returns {void}
 */
function startPollingLoop(enrichedSubs) {
  window.lastRenderedIndex = -1
  
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

    // Set up variables for auto-pause logic, limit pause if repeated subtitle
    const currentIndex = enrichedSubs.findIndex(s => s.start === active.start);
    const nextSub = enrichedSubs[currentIndex + 1];
    const isRepeated = nextSub && nextSub.text?.trim() === active.text?.trim();

    // Monitor for remove silences skip conditions FIRST
    // Check continuously regardless of subtitle changes
    if (active && nextSub) {
      const skipExecuted = monitorVideoTimeForSkips(
        currentTime,
        active,
        nextSub,
        enrichedSubs,
        currentIndex
      );
      
      // If a skip was executed, we don't need to continue with this iteration
      if (skipExecuted) {
        return;
      }
    }

    // If the active subtitle hasn't changed, skip rendering
    if (active.start === window.lastRenderedIndex) return;

    // Render the subtitle line, and update the rendered index
    renderSubtitle(active);
    window.lastRenderedIndex = active.start;

    // Initialize auto-pause if enabled and conditions are met 
    // (subtitle has not yet ended and is not a repeated line)
    if (shouldAutoPause(active, isRepeated)) {
      scheduleAutoPause(active);
    }
  }, 50);
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
      window.updateSubtitleBackground?.();
    });
    wrapper.addEventListener("mouseleave", () => {
      translation.style.visibility = "hidden";
      window.updateSubtitleBackground?.();
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
 * @returns {void}
 */
function renderPreprocessedLine(sub) {
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
    // Strip non-Chinese characters for LingQ lookup
    const chineseOnly = (word.match(/[\u4e00-\u9fff]+/g) || []).join('');
    const status = window.lingqTerms[chineseOnly];
    const meaning = sub.word_meanings?.find(w => w.word === word)?.meaning || "";

    const wordSpan = createWordWrapper({ word, pinyin, status, meaning });
    mainLine.appendChild(wordSpan);
  });

  // Append the main line and translation to the wrapper
  wrapper.appendChild(mainLine);
  wrapper.appendChild(translation);
  container.appendChild(wrapper);

  // Apply background styling after content is rendered
  window.updateSubtitleBackground?.();

  // Attach popup listeners after rendering words
  if (window.initWordPopup) window.initWordPopup();
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
 * @returns {void}
 */
function renderSubtitle(sub) {
  const container = document.getElementById("custom-subtitle-overlay");
  if (!container) return;

  // Use window.lingqTerms instead of the passed parameter to get the most up-to-date data
  renderPreprocessedLine(sub);

  window.lastSubtitleStartTime = sub.start;
  window.lastRenderedText = sub.text;
  
  // Check video player visibility after rendering subtitle
  window.updateSubtitleVisibility?.();
}

/**
 * Checks if auto-pause should be triggered based on the current subtitle state.
 * This function evaluates whether auto-pause is enabled in the configuration,
 * whether the subtitle has not yet ended, and whether it is not a repeated line.
 * @param {*} active The currently active subtitle object
 * @param {*} isRepeated True if the subtitle is a repeated line
 * @returns {boolean} True if auto-pause should be triggered
 */
function shouldAutoPause(active, isRepeated) {
  
  // Check if auto-pause is enabled in the config and if the subtitle has not yet ended
  // Also ensure that the subtitle is not a repeated line (to avoid unnecessary pauses)
  return (
    window.subtitleConfig.autoPause &&
    !isRepeated
  );
}

/**
 * Polls the video playback to determine when to auto-pause at the end of a subtitle,
 * allowing for a delay (to catch late dialogue). It avoids using setTimeout to prevent
 * conflicts when subtitle lines change quickly.
 * 
 * This version does not require the subtitle to still be active at the pause moment —
 * it allows a slight delay past the subtitle's end, even if the next subtitle has started.
 * 
 * Prevents double-pause behavior by only allowing one pause per subtitle line.
 * 
 * @param {Object} currentSub - The subtitle object currently being rendered
 */
function scheduleAutoPause(currentSub) {
  const video = findPlexVideoElement();
  if (!video || !currentSub) return;

  // If already scheduled for this subtitle, skip
  if (window.autoPausePollingIntervals[currentSub.start]) {
    return;
  }

  // If video is already very close to the end of the subtitle, we can skip scheduling
  // a pause — this avoids unnecessary pauses if the subtitle is about to end
  const now = video.currentTime;
  const timeToEndOfCurrentSub = currentSub.end - now;
  const minTimeToEnd = window.subtitleConfig.autoPauseDelayMs / 1000 + 0.5; // Minimum time to end before we consider scheduling a pause
  if (timeToEndOfCurrentSub < minTimeToEnd) {
    console.log("⏱️ Skipping auto-pause scheduling for:", currentSub.text, " — too close to end of subtitle.");
    return;
  }

  console.log("⏱️ Scheduling auto-pause for:", currentSub.text);

  // Create a polling interval for this subtitle
  const intervalId = setInterval(() => {
    const v = findPlexVideoElement();
    if (!v || v.paused) return;

    const now = v.currentTime;
    const delayMs = window.subtitleConfig.autoPauseDelayMs || 0;
    const delaySec = delayMs / 1000;
    const elapsedSinceEnd = now - currentSub.end;

    if (window.lastPausedSubtitleStart === currentSub.start) {
      // Already paused for this subtitle
      clearInterval(window.autoPausePollingIntervals[currentSub.start]);
      delete window.autoPausePollingIntervals[currentSub.start];
      return;
    }

    if (elapsedSinceEnd >= delaySec) {
      v.currentTime = Math.max(0, currentSub.end) - 0.05;
      v.pause();
      window.lastPausedSubtitleStart = currentSub.start;
      console.log("⏸️ Auto-paused triggered by:", currentSub.text, "after delay of", delayMs, "ms");

      clearInterval(window.autoPausePollingIntervals[currentSub.start]);
      delete window.autoPausePollingIntervals[currentSub.start];
    }
  }, 5);

  window.autoPausePollingIntervals[currentSub.start] = intervalId;
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
  // Clear all auto-pause intervals
  if (window.autoPausePollingIntervals) {
    Object.values(window.autoPausePollingIntervals).forEach(clearInterval);
    window.autoPausePollingIntervals = {};
  }
  
  // Clear percentage display when stopping preprocessed mode
  clearStatusPercentagesDisplay();
};