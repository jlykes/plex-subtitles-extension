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

  console.log("👀 Watching for Plex subtitles...");
}


// Replaces the live subtitle text with a styled overlay.
// Performs segmentation of Chinese text, looks up LingQ status, colors accordingly,
// and optionally annotates with pinyin using ruby tags.
function updateOverlay(text, lingqTerms, segmentit) {
  // Locate the custom overlay container where subtitles will be rendered
  const container = document.getElementById("custom-subtitle-overlay");
  container.innerHTML = "";  // Clear any existing content

  // Segment the incoming subtitle line using the Segmentit library
  // Each word object has a .w field containing the segmented string
  const words = segmentit.doSegment(text)
    .map(w => w.w)
    .filter(w => w && w.trim() !== "");  // Remove empty or purely whitespace segments

  // Iterate through each segmented word to apply styling and pinyin
  words.forEach(word => {
    const span = document.createElement("span");  // Basic span to hold the word
    span.textContent = word;
    span.style.color = "white";
    span.style.margin = "0";

    // Skip punctuation, digits, and whitespace from further processing
    if (!isPunctuationDigitOrSpace(word)) {
      const status = lingqTerms[word];  // Retrieve the LingQ status (0=new, 1=learning, 2=known, 3=ignored)
      const underlineColor = ENABLE_LINGQ_COLORING ? getUnderlineColor(status) : null;

      // Apply underline styling based on LingQ color if enabled
      if (underlineColor) {
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = underlineColor;
        span.style.textDecorationThickness = "4px";
        span.style.textUnderlineOffset = "8px";
      }

      // If pinyin display is enabled and word is not marked "ignored",
      // use ruby annotation to show pronunciation above the word
      if (SHOW_PINYIN && status !== 3) {
        const ruby = document.createElement("ruby");
        ruby.appendChild(span);

        const rt = document.createElement("rt");
        rt.textContent = getPinyin(word);  // Retrieve pinyin string from dictionary

        ruby.appendChild(rt);
        container.appendChild(ruby);
        return;  // Avoid also appending the original span outside the ruby
      }
    }

    // Append the styled or raw word span to the overlay container
    container.appendChild(span);
  });
}

// Note: Call waitForSubtitles(...) from main() in content.js if enriched JSON is not found.
