// === helper_scripts/preprocessed.js ===

// This function begins the enriched subtitle rendering process.
// It fetches the subtitle JSON, synchronizes it with video playback,
// and continually updates the subtitle overlay based on current time.

let preprocessedInterval = null;

function runPreprocessedMode(lingqTerms, filename) {
  console.log(`📦 Preprocessed subtitle mode enabled. Loading: ${filename}`);
  window.lingqTerms = lingqTerms;

  // 🔄 Update control panel to indicate that we are in preprocessed mode
  if (typeof updateModeDisplay === "function") {
    updateModeDisplay("Preprocessed");
  }

  clearSubtitleOverlay();        // Ensure clean state before loading new subtitles
  createOverlayContainer();      // Recreate overlay (ensures styles/tooltips are attached)

  // Load the enriched subtitle JSON file from the extension's resource path
  fetch(chrome.runtime.getURL(filename))
    .then(res => res.json())
    .then(enrichedSubs => {
      window.subtitleList = enrichedSubs;  // Store subtitles globally for navigation
      let lastRenderedIndex = -1;  // Prevent re-rendering the same subtitle

      // 🔁 Clear any previously running subtitle polling interval to prevent duplicate rendering
      if (preprocessedInterval) {
        clearInterval(preprocessedInterval);
        preprocessedInterval = null;
      }
          
      let autoPauseTimeout = null;
      let lastPausedIndex = -1;

      // Set up a polling loop that runs every 300ms to sync subtitles with playback
      preprocessedInterval = setInterval(() => {
        const video = findPlexVideoElement();
        if (!video) return;

        const currentTime = video.currentTime;

        // // Detect if repeated subtitle, for purposes of auto-pause
        // let isRepeatedSubtitle = false;
        // const currentIndex = enrichedSubs.findIndex(s => s.start === active.start);
        // const nextSub = enrichedSubs[currentIndex + 1];

        let active;
        if (window.subtitleConfig.useContinuous) {
          for (let i = enrichedSubs.length - 1; i >= 0; i--) {
            if (currentTime >= enrichedSubs[i].start) {
              active = enrichedSubs[i];
              break;
            }
          }
        } else {
          active = enrichedSubs.find(s => currentTime >= s.start && currentTime <= s.end);
        }

        // 🧱 Bail out early if no active subtitle (non-continuous mode)
        if (!active) {
          const container = document.getElementById("custom-subtitle-overlay");
          if (container && !window.subtitleConfig.useContinuous) {
            container.innerHTML = "";
            window.lastRenderedText = "";
          }
          return;
        }

        // ✅ Only run this if `active` is defined:
        let isRepeatedSubtitle = false;
        const currentIndex = enrichedSubs.findIndex(s => s.start === active.start);
        const nextSub = enrichedSubs[currentIndex + 1];

        if (nextSub && nextSub.text && nextSub.text.trim() === active.text.trim()) {
          isRepeatedSubtitle = true;
        }

        // If no subtitle should be shown right now, clear the overlay
        if (!active) {
          if (!window.subtitleConfig.useContinuous) {
            const container = document.getElementById("custom-subtitle-overlay");
            if (container) {
              container.innerHTML = "";
              window.lastRenderedText = "";
            }
          }
          return;
        }

        // Skip if the current subtitle is the same as last rendered
        if (active.start === lastRenderedIndex) return;

        // Update global state and render the new subtitle
        lastRenderedIndex = active.start;
        window.lastSubtitleStartTime = active.start;
        window.lastRenderedText = active.text;
        
        const container = document.getElementById("custom-subtitle-overlay");
        if (!container) return;  // Don't render if container is gone

        renderPreprocessedLine(active, lingqTerms);

        // Auto-pause if setting is set, and not repeated subittle
        if (window.subtitleConfig.autoPause && active.end !== lastPausedIndex && !isRepeatedSubtitle) {
          clearTimeout(autoPauseTimeout); // Cancel previous pause

          const video = findPlexVideoElement();
          const now = video?.currentTime ?? 0;
          const extra = window.subtitleConfig.autoPauseDelayMs || 0;
          const delay = Math.max(0, (active.end - now) * 1000 + extra);


          autoPauseTimeout = setTimeout(() => {
            const v = findPlexVideoElement();
            if (v && !v.paused) {
              v.pause();
              console.log("⏸️ Auto-paused at subtitle end");
            }
          }, delay);

          lastPausedIndex = active.end;
        }
      }, 300);
    });
  
  // Define reRender function for pre-processed mode (for purposes of changing LingQ color status)
  window.reRenderCurrentSubtitle = () => {
    if (!window.subtitleList || !window.lastSubtitleStartTime) return;

    const currentSub = window.subtitleList.find(
      s => s.start === window.lastSubtitleStartTime
    );
    if (!currentSub) return;

    const container = document.getElementById("custom-subtitle-overlay");
    if (!container) return;

    container.innerHTML = "";
    renderPreprocessedLine(currentSub, window.lingqTerms || {});
  };
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

  // Wrapper contains the full line (Chinese subtitle + translation)
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";                     // Stack children vertically
  wrapper.style.flexDirection = "column";             // Ensure vertical stacking order
  wrapper.style.alignItems = "center";                // Center content horizontally
  wrapper.style.cursor = "pointer";                   // Show pointer cursor on hover
  wrapper.style.marginTop = "4px";                    // Add some spacing above

  // Main subtitle line with Chinese characters and annotations
  const mainLine = document.createElement("div");
  mainLine.style.display = "inline-block";            // Allow inline behavior
  mainLine.style.verticalAlign = "bottom";            // Align with other inline content if needed
  mainLine.style.position = "relative";               // Enable tooltip positioning if needed
  mainLine.style.textAlign = "center";                // Center the Chinese text

  // Translation line (shown only on hover)
  const translation = document.createElement("div");
  translation.textContent = sub.translation || "";
  translation.style.fontSize = "0.5em";               // Smaller font size for translation
  translation.style.color = "#ccc";                   // Light gray text color
  translation.style.marginTop = "4px";                // Spacing between Chinese and translation
  translation.style.whiteSpace = "normal";            // Allow line wrapping when needed
  translation.style.wordBreak = "break-word";         // Break long words if needed
  translation.style.textAlign = "center";             // Center the translation text
  translation.style.maxWidth = "90vw";                // Prevent overflowing the viewport width
  translation.style.minHeight = "1em";                // Reserve height even when hidden or empty

  // Toggle visibility of the translation on hover
  const visibilitySetting = window.subtitleConfig.translation;

  if (visibilitySetting === "off") {
    translation.style.visibility = "hidden";
  } else if (visibilitySetting === "on-hover") {
    translation.style.visibility = "hidden"; // hidden by default
    wrapper.addEventListener("mouseenter", () => {
      translation.style.visibility = "visible";
    });
    wrapper.addEventListener("mouseleave", () => {
      translation.style.visibility = "hidden";
    });
  } else if (visibilitySetting === "always") {
    translation.style.visibility = "visible";
  }
    
  // Process each segmented word or character in the subtitle line
  // sub.segmented.forEach(entry => {
  //   const word = entry.word;
  //   const pinyin = entry.pinyin;
  //   const isPunct = isPunctuationDigitOrSpace(word);
  //   const status = lingqTerms[word];  // LingQ known/learning/ignored status
  //   const underlineColor = window.subtitleConfig.lingqStatus === "on" ? getUnderlineColor(status) : null;
  //   const wordInfo = sub.word_meanings?.find(w => w.word === word);
  //   const meaningText = wordInfo?.meaning || "";

  //   // Container for the individual word and its features
  //   const wordWrapper = document.createElement("span");
  //   wordWrapper.style.position = "relative";
  //   wordWrapper.style.display = "inline-block";

  //   // Add underline (fake)
  //   if (underlineColor && !isPunct) {
  //     wordWrapper.style.borderBottom = `0.1em solid ${underlineColor}`;
  //     wordWrapper.style.paddingBottom = "2px";
  //     wordWrapper.style.borderRadius = "0.05em"; // <-- Add this line
  //   }

  //   // Tooltip definition shown on hover above the word
  //   const tooltip = document.createElement("div");
  //   tooltip.textContent = meaningText;
  //   tooltip.style.position = "absolute";
  //   tooltip.style.bottom = "100%";
  //   tooltip.style.left = "50%";
  //   tooltip.style.transform = "translateX(-50%)";
  //   tooltip.style.padding = "4px 8px";
  //   tooltip.style.backgroundColor = "#222";
  //   tooltip.style.color = "#fff";
  //   tooltip.style.fontSize = "0.5em";
  //   tooltip.style.whiteSpace = "normal";
  //   tooltip.style.borderRadius = "4px";
  //   tooltip.style.boxShadow = "0 2px 6px rgba(0,0,0,0.5)";
  //   tooltip.style.display = "none";
  //   tooltip.style.zIndex = "1000";
  //   tooltip.style.maxWidth = "200px";
  //   tooltip.style.textAlign = "left";

  //   // Hover interaction to show/hide tooltip
  //   wordWrapper.addEventListener("mouseenter", () => {
  //     tooltip.style.display = "block";
  //     wordWrapper.classList.add("hover-highlight");
  //   });
  //   wordWrapper.addEventListener("mouseleave", () => {
  //     tooltip.style.display = "none";
  //     wordWrapper.classList.remove("hover-highlight");
  //   });

  //   // Read tone coloring mode from config: "none", "all", or "unknown-only"
  //   const toneMode = window.subtitleConfig.toneColor;

  //   // Determine whether this word should be tone-colored
  //   // "all" → always color
  //   // "unknown-only" → color only if LingQ status !== 3 (not known)
  //   const shouldColor = toneMode === "all" || (toneMode === "unknown-only" && status !== 3);

  //   // Determine whether to show pinyin (Ruby annotation)
  //   const pinyinSetting = window.subtitleConfig.pinyin; // "none", "unknown-only", or "all"
  //   const shouldShowPinyin = pinyinSetting === "all" || (pinyinSetting === "unknown-only" && status !== 3);

  //   const charList = [...word];
  //   const pinyinList = (pinyin || "").split(" ");

  //   // Loop over each character
  //   charList.forEach((char, i) => {
  //     // Create the visible character span
  //     const charSpan = document.createElement("span");
  //     charSpan.textContent = char;
  //     charSpan.style.margin = "0";

  //     // Determine whether to apply tone color
  //     if (shouldColor && pinyinList[i]) {
  //       const toneColor = getToneColor(pinyinList[i]);
  //       charSpan.style.color = toneColor;
  //     } else {
  //       charSpan.style.color = "white";
  //     }

  //     // Determine whether to apply pinyin ruby
  //     if (!isPunct && shouldShowPinyin) {
  //       // Create ruby text (pinyin)
  //       const rt = document.createElement("rt");
  //       rt.textContent = pinyinList[i] || "";
  //       rt.style.color = charSpan.style.color;

  //       // Wrap charSpan and rt in a ruby container
  //       const rubyChar = document.createElement("ruby");
  //       rubyChar.appendChild(charSpan);
  //       rubyChar.appendChild(rt);

  //       // Add this annotated ruby block to the line
  //       wordWrapper.appendChild(rubyChar);
  //     } else {
  //       // No ruby: just show the colored character
  //       wordWrapper.appendChild(charSpan);
  //     }
  //   });


  //   // Append tooltip and word to the main line
  //   wordWrapper.appendChild(tooltip);
  //   mainLine.appendChild(wordWrapper);
  // });

  // Process each segmented word or character in the subtitle line
  sub.segmented.forEach(entry => {
    const word = entry.word;
    const pinyin = entry.pinyin;
    const status = lingqTerms[word];
    const meaning = sub.word_meanings?.find(w => w.word === word)?.meaning || "";

    const wrapper = createWordWrapper({ word, pinyin, status, meaning });
    mainLine.appendChild(wrapper);
  });

  // Combine everything and inject into the DOM
  wrapper.appendChild(mainLine);
  wrapper.appendChild(translation);
  container.appendChild(wrapper);
}

// Re-renders subtitle given state of LingQ status
window.reRenderCurrentSubtitle = () => {
  if (!window.subtitleList || !window.lastSubtitleStartTime) return;

  const currentSub = window.subtitleList.find(
    s => s.start === window.lastSubtitleStartTime
  );
  if (!currentSub) return;

  const container = document.getElementById("custom-subtitle-overlay");
  if (!container) return;

  container.innerHTML = "";
  renderPreprocessedLine(currentSub, window.lingqTerms || {});
};

// Stops pre-processed mode (for the purposes of switching to a new video)
window.stopPreprocessedMode = function () {
  if (preprocessedInterval) {
    clearInterval(preprocessedInterval);
    preprocessedInterval = null;
    console.log("🛑 Preprocessed subtitle polling stopped");
  }
};