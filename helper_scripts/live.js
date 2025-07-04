// === Live Subtitle Fallback Mode ===
// This module handles subtitle overlay rendering when no enriched JSON is found.
// It uses MutationObserver to watch for raw subtitle elements rendered by Plex in real time
// and enhances them by replacing the subtitle overlay content with enriched formatting.

// Global reference to the MutationObserver so we can disconnect it later if needed
let liveSubtitleObserver = null;

// This function monitors DOM mutations to detect live subtitle changes on Plex
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

// Replaces the live subtitle text with a styled overlay.
// Performs segmentation of Chinese text, looks up LingQ status, colors accordingly,
// and optionally annotates with pinyin using ruby tags.
function updateOverlay(text, lingqTerms, segmentit) {
  window.lastLiveSubtitle = text;
  renderLiveLine(text, lingqTerms, segmentit);
}

// Function to render a subtitle in live mode
function renderLiveLine(text, lingqTerms, segmentit) {
  const container = document.getElementById("custom-subtitle-overlay");
  if (!container) return;
  container.innerHTML = "";

  const words = segmentit.doSegment(text)
    .map(w => w.w)
    .filter(w => w && w.trim() !== "");

  words.forEach(word => {
    const span = document.createElement("span");
    span.textContent = word;
    span.style.color = "white";
    span.style.margin = "0";

    if (!isPunctuationDigitOrSpace(word)) {
      const status = lingqTerms[word];
      const underlineColor = window.subtitleConfig.lingqStatus === "on" ? getUnderlineColor(status) : null;

      if (underlineColor) {
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = underlineColor;
        span.style.textDecorationThickness = "4px";
        span.style.textUnderlineOffset = "8px";
      }

      if (SHOW_PINYIN && status !== 3) {
        const ruby = document.createElement("ruby");
        ruby.appendChild(span);

        const rt = document.createElement("rt");
        rt.textContent = getPinyin(word);

        ruby.appendChild(rt);
        container.appendChild(ruby);
        return;
      }
    }

    container.appendChild(span);
  });
}


// Note: Call waitForSubtitles(...) from main() in content.js if enriched JSON is not found.
