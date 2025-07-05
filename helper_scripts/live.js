// === helper_scripts/live.js ===

// This module handles subtitle overlay rendering when no enriched JSON is found.
// It uses MutationObserver to watch for raw subtitle elements rendered by Plex in real time
// and enhances them by replacing the subtitle overlay content with enriched formatting.


// Global reference to the MutationObserver so we can disconnect it later if needed
let liveSubtitleObserver = null;


/**
 * This function sets up a MutationObserver to watch for live subtitle changes
 * in the Plex video player. It replaces the subtitle text with an enriched overlay
 * that highlights vocabulary terms from LingQ and segments Chinese text using Segmentit.
 * @param {*} lingqTerms The vocabulary terms from LingQ to highlight in subtitles
 * @param {*} segmentit The Segmentit instance for segmenting Chinese text
 * @return {void}
 */
function waitForSubtitles(lingqTerms, segmentit) {
  updateModeDisplay("Live");
  console.log("🎯 Live subtitle mode enabled.");

  window.lingqTerms = lingqTerms;
  window.segmentit = segmentit;

  // 🧹 Clear any previously running observer to avoid duplicated rendering logic
  if (liveSubtitleObserver) {
    liveSubtitleObserver.disconnect();
    liveSubtitleObserver = null;
  }

  // Create new observer to look for subtitle DOM changes under the Plex subtitle container
  liveSubtitleObserver = new MutationObserver(() => {
    const subtitleElements = document.querySelectorAll('.libjass-subs span span');

    subtitleElements.forEach((el) => {
      const text = el.innerText.trim();

      if (!el.dataset.overlayed && text) {
        updateOverlay(text, lingqTerms, segmentit);
        el.dataset.overlayed = "true";
      }
    });
  });

  // Begin watching for any changes to subtitle-related nodes across the full document body
  liveSubtitleObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Re-render function for LingQ status visbility changes
  window.reRenderCurrentSubtitle = () => {
    if (!window.lastLiveSubtitle) return;
    renderLiveLine(window.lastLiveSubtitle, window.lingqTerms || {}, window.segmentit);
  };

  console.log("👀 Watching for Plex subtitles...");
}


/**
 * Replaces the live subtitle text with a styled overlay.
 * This function segments the Chinese text, looks up LingQ vocabulary terms,
 * colors the words according to their status, and optionally annotates with pinyin.
 * It updates the global `lastLiveSubtitle` variable for re-rendering purposes.
 * @param {*} text The live subtitle text to render
 * @param {*} lingqTerms The vocabulary terms from LingQ to highlight in subtitles
 * @param {*} segmentit The Segmentit instance for segmenting Chinese text
 * @returns {void}
 */
function updateOverlay(text, lingqTerms, segmentit) {
  window.lastLiveSubtitle = text;
  renderLiveLine(text, lingqTerms, segmentit);
}


/**
 * This function renders a live subtitle line by segmenting the text,
 * creating annotated word wrappers, and appending them to the subtitle overlay container.
 * It uses the Segmentit library to segment Chinese text into word tokens,
 * and highlights vocabulary terms from LingQ by applying appropriate styles.
 * It also retrieves pinyin for each word to display as a ruby annotation if configured.
 * @param {*} text The live subtitle text to render
 * @param {*} lingqTerms The vocabulary terms from LingQ to highlight in subtitles
 * @param {*} segmentit The Segmentit instance for segmenting Chinese text
 * @returns {void}
 */
function renderLiveLine(text, lingqTerms, segmentit) {
  const container = document.getElementById("custom-subtitle-overlay");
  if (!container) return;
  container.innerHTML = "";

  // Segment the incoming live subtitle line into Chinese word tokens
  const words = segmentit.doSegment(text)
    .map(w => w.w)
    .filter(w => w && w.trim() !== "");

  // For each segmented word, create an annotated wrapper using shared logic
  words.forEach(word => {
    const pinyin = getPinyin(word);
    const status = lingqTerms[word];
    const wrapper = createWordWrapper({
      word,
      pinyin,
      status,
      meaning: "" // No word meanings available in live mode
    });

    container.appendChild(wrapper);
  });
}


/**
 * Stops the live subtitle observer and cleans up resources.
 * This function disconnects the MutationObserver that watches for live subtitle changes,
 * effectively stopping the live subtitle rendering process.
 * It should be called when the video ends or when switching to a new video.
 * @returns {void}
 */
window.stopLiveMode = function () {
  console.log("🛑 Live subtitle function called");
  if (liveSubtitleObserver) {
    liveSubtitleObserver.disconnect();
    liveSubtitleObserver = null;
    console.log("🛑 Live subtitle observer disconnected");
  }
};

// Note: Call waitForSubtitles(...) from main() in content.js if enriched JSON is not found.
