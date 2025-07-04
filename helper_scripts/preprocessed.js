// === helper_scripts/preprocessed.js ===

// Interval handle for polling loop and optional pause scheduling
let preprocessedInterval = null;
let autoPauseTimeout = null;

/**
 * Entry point: starts preprocessed subtitle mode.
 * Loads enriched JSON, initializes overlay container, begins polling loop.
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

  // Re-render current subtitle when config (e.g., pinyin visibility) changes
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
 */
function startPollingLoop(enrichedSubs, lingqTerms) {
  let lastRenderedIndex = -1;
  let lastPausedIndex = -1;

  preprocessedInterval = setInterval(() => {
    const video = findPlexVideoElement();
    if (!video) return;

    const currentTime = video.currentTime;

    // Decide whether to use continuous vs. normal subtitle display mode
    const active = window.subtitleConfig.useContinuous
      ? getMostRecentSubtitle(currentTime, enrichedSubs)
      : getActiveSubtitle(currentTime, enrichedSubs);

    if (!active) {
      clearInactiveOverlayIfNeeded();
      return;
    }

    if (active.start === lastRenderedIndex) return;

    const currentIndex = enrichedSubs.findIndex(s => s.start === active.start);
    const nextSub = enrichedSubs[currentIndex + 1];
    const isRepeated = nextSub && nextSub.text?.trim() === active.text?.trim();

    renderSubtitle(active, lingqTerms);
    lastRenderedIndex = active.start;

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
 *
 * @param {string} translationText - The subtitle translation text to display
 * @returns {{ wrapper: HTMLElement, mainLine: HTMLElement, translation: HTMLElement }}
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
 */
function renderPreprocessedLine(sub, lingqTerms) {
  console.log("🔁 renderPreprocessedLine called with:", sub.text);

  const container = document.getElementById("custom-subtitle-overlay");
  container.innerHTML = "";

  updateCurrentExplanation(sub.explanation || "");

  // Create wrapper, mainline, and translation divs
  const { wrapper, mainLine, translation } = createSubtitleWrapper(sub.translation);

  // Create one annotated span per segmented word
  sub.segmented.forEach(entry => {
    const word = entry.word;
    const pinyin = entry.pinyin;
    const status = lingqTerms[word];
    const meaning = sub.word_meanings?.find(w => w.word === word)?.meaning || "";

    const wordSpan = createWordWrapper({ word, pinyin, status, meaning });
    mainLine.appendChild(wordSpan);
  });

  wrapper.appendChild(mainLine);
  wrapper.appendChild(translation);
  container.appendChild(wrapper);
}

/**
 * Gets the subtitle currently covering the playback time (normal mode).
 */
function getActiveSubtitle(currentTime, subs) {
  return subs.find(s => currentTime >= s.start && currentTime <= s.end);
}

/**
 * Gets the most recent subtitle that started before current time (continuous mode).
 */
function getMostRecentSubtitle(currentTime, subs) {
  for (let i = subs.length - 1; i >= 0; i--) {
    if (currentTime >= subs[i].start) return subs[i];
  }
  return null;
}

/**
 * Clears overlay display when no subtitle is active.
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
 */
function shouldAutoPause(active, lastPausedIndex, isRepeated) {
  return (
    window.subtitleConfig.autoPause &&
    active.end !== lastPausedIndex &&
    !isRepeated
  );
}

/**
 * Sets a timeout to auto-pause playback after the subtitle ends.
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
