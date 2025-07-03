// === helper_scripts/preprocessed.js ===

// This function begins the enriched subtitle rendering process.
// It fetches the subtitle JSON, synchronizes it with video playback,
// and continually updates the subtitle overlay based on current time.
function runPreprocessedMode(lingqTerms, filename) {
  console.log(`📦 Preprocessed subtitle mode enabled. Loading: ${filename}`);

  // 🔄 Update control panel to indicate that we are in preprocessed mode
  if (typeof updateModeDisplay === "function") {
    updateModeDisplay("preprocessed");
  }

  clearSubtitleOverlay();        // Ensure clean state before loading new subtitles
  createOverlayContainer();      // Recreate overlay (ensures styles/tooltips are attached)

  // Load the enriched subtitle JSON file from the extension's resource path
  fetch(chrome.runtime.getURL(filename))
    .then(res => res.json())
    .then(enrichedSubs => {
      window.subtitleList = enrichedSubs;  // Store subtitles globally for navigation
      let lastRenderedIndex = -1;  // Prevent re-rendering the same subtitle

      // Set up a polling loop that runs every 300ms to sync subtitles with playback
      setInterval(() => {
        const video = document.querySelector("video");
        if (!video) return;

        const currentTime = video.currentTime;

        // Determine which subtitle should be shown based on current time
        let active;
        if (USE_CONTINUOUS_SUBTITLES) {
          for (let i = enrichedSubs.length - 1; i >= 0; i--) {
            if (currentTime >= enrichedSubs[i].start) {
              active = enrichedSubs[i];
              break;
            }
          }
        } else {
          active = enrichedSubs.find(s => currentTime >= s.start && currentTime <= s.end);
        }

        // If no subtitle should be shown right now, clear the overlay
        if (!active) {
          if (!USE_CONTINUOUS_SUBTITLES) {
            const container = document.getElementById("custom-subtitle-overlay");
            container.innerHTML = "";
            window.lastRenderedText = "";
          }
          return;
        }

        // Skip if the current subtitle is the same as last rendered
        if (active.start === lastRenderedIndex) return;

        // Update global state and render the new subtitle
        lastRenderedIndex = active.start;
        window.lastSubtitleStartTime = active.start;
        window.lastRenderedText = active.text;

        renderPreprocessedLine(active, lingqTerms);
      }, 300);
    });
}

// Render a single enriched subtitle line into the overlay container.
// Adds color, pinyin, tooltip definitions, and on-hover translation.
function renderPreprocessedLine(sub, lingqTerms) {
  console.log("🔁 renderPreprocessedLine called with:", sub.text);
  const container = document.getElementById("custom-subtitle-overlay");
  container.innerHTML = "";  // Clear previous subtitle line

  // 🔄 Update sentence explanation in the control panel (if available)
  if (typeof updateCurrentExplanation === "function") {
    updateCurrentExplanation(sub.explanation || "");
  }

  // Wrapper contains the full line (text + translation)
  const wrapper = document.createElement("div");
  wrapper.style.display = "block";
  wrapper.style.position = "relative";
  wrapper.style.cursor = "pointer";

  // Main subtitle line with Chinese characters and annotations
  const mainLine = document.createElement("div");
  mainLine.style.display = "inline-block";
  mainLine.style.verticalAlign = "bottom";
  mainLine.style.position = "relative";

  // Create a line of English translation (shown only on hover)
  const translation = document.createElement("div");
  translation.textContent = sub.translation || "";
  translation.style.position = "absolute";
  translation.style.bottom = "-1.6em";
  translation.style.left = "50%";
  translation.style.transform = "translateX(-50%)";
  translation.style.fontSize = "0.5em";
  translation.style.color = "#ccc";
  translation.style.marginTop = "4px";
  translation.style.whiteSpace = "nowrap";
  translation.style.display = "none";
  translation.style.textAlign = "center";

  // Toggle visibility of the translation on hover
  wrapper.addEventListener("mouseenter", () => {
    translation.style.display = "block";
  });
  wrapper.addEventListener("mouseleave", () => {
    translation.style.display = "none";
  });

  // Process each segmented word or character in the subtitle line
  sub.segmented.forEach(entry => {
    const word = entry.word;
    const pinyin = entry.pinyin;
    const isPunct = isPunctuationDigitOrSpace(word);
    const status = lingqTerms[word];  // LingQ known/learning/ignored status
    const underlineColor = ENABLE_LINGQ_COLORING ? getUnderlineColor(status) : null;
    const wordInfo = sub.word_meanings?.find(w => w.word === word);
    const meaningText = wordInfo?.meaning || "";

    // Container for the individual word and its features
    const wordWrapper = document.createElement("span");
    wordWrapper.style.position = "relative";
    wordWrapper.style.display = "inline-block";

    // Tooltip definition shown on hover above the word
    const tooltip = document.createElement("div");
    tooltip.textContent = meaningText;
    tooltip.style.position = "absolute";
    tooltip.style.bottom = "100%";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translateX(-50%)";
    tooltip.style.padding = "4px 8px";
    tooltip.style.backgroundColor = "#222";
    tooltip.style.color = "#fff";
    tooltip.style.fontSize = "0.5em";
    tooltip.style.whiteSpace = "normal";
    tooltip.style.borderRadius = "4px";
    tooltip.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
    tooltip.style.display = "none";
    tooltip.style.zIndex = "1000";
    tooltip.style.maxWidth = "200px";
    tooltip.style.textAlign = "left";

    // Hover interaction to show/hide tooltip
    wordWrapper.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
      wordWrapper.classList.add("hover-highlight");
    });
    wordWrapper.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
      wordWrapper.classList.remove("hover-highlight");
    });

    // Annotate with ruby + pinyin if enabled and appropriate
    if (!isPunct && SHOW_PINYIN && status !== 3) {
      const ruby = document.createElement("ruby");
      const span = document.createElement("span");
      span.textContent = word;
      span.style.margin = "0";
      span.style.color = "white";

      // Add LingQ underline if enabled
      if (!isPunct && underlineColor) {
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = underlineColor;
        span.style.textDecorationThickness = "4px";
        span.style.textUnderlineOffset = "8px";
      }

      const rt = document.createElement("rt");
      rt.textContent = pinyin;

      ruby.appendChild(span);
      ruby.appendChild(rt);
      wordWrapper.appendChild(ruby);
    } else {
      // If punctuation or no pinyin, just create a styled span
      const span = document.createElement("span");
      span.textContent = word;
      span.style.margin = "0";
      span.style.color = "white";

      if (!isPunct && underlineColor) {
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = underlineColor;
        span.style.textDecorationThickness = "4px";
        span.style.textUnderlineOffset = "8px";
      }

      wordWrapper.appendChild(span);
    }

    // Append tooltip and word to the main line
    wordWrapper.appendChild(tooltip);
    mainLine.appendChild(wordWrapper);
  });

  // Combine everything and inject into the DOM
  wrapper.appendChild(mainLine);
  wrapper.appendChild(translation);
  container.appendChild(wrapper);
}
