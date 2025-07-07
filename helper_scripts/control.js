// === helper_scripts/control.js ===

// This module creates a floating UI for toggling subtitle display options.
// The panel appears when the mouse enters the top-right region of the screen
// and stays open while hovered. It reflects the current subtitle mode
// (live or preprocessed) and exposes controls like translation mode,
// pinyin visibility, font size, position, and explanation display.
//
// 🔄 UPDATE: Panel now only appears if a Plex video is present (identified by
// the special class HTMLMedia-mediaElement-u17S9P). This avoids rendering it
// on non-Plex tabs or pages without active video playback.


//////////////////////////////
// 1. GLOBAL CONFIG OBJECT
//////////////////////////////

// Shared configuration for subtitle appearance and behavior.
// This global object is modified by the control panel and read by
// the rendering logic in `live.js` and `preprocessed.js`.
window.subtitleConfig = {
  // === Appearance Settings ===
  visibility: "on",            // "off", "on", or "on-stop"
  fontSizeVH: 5.5,             // Subtitle font size (in viewport height units)
  position: "bottom",          // "bottom", "top", or "center"
  heightVH: 16,                // Subtitle offset from top/bottom in vh (viewport height units) 
  lingqStatus: "on",           // LingQ status display: "on", "unknown-only", or "off"
  pinyin: "unknown-only",      // Pinyin display mode: "none", "unknown-only", or "all"
  toneColor: "all",             // Whether to color characters by tone (true/false)
  translation: "on-hover",     // Translation visibility: "off", "on-hover", or "always"
  background: "off",           // Background display: "off" or "on"
  backgroundOpacity: 50,       // Background opacity percentage (0-100)

  // === Behavior Settings ===
  useContinuous: true,         // Keep last subtitle shown after time range ends
  autoPause: false,            // Automatically pause video when subtitle ends
  autoPauseDelayMs: 0,         // Delay (ms) before pausing video
  removeSilences: false,       // Skip from subtitle end to next subtitle start
  minSilenceGapMs: 1000        // Minimum silence gap to skip (1 second default)
};

//////////////////////////////
// 2. PANEL INITIALIZATION
//////////////////////////////

/**
 * Creates the control panel DOM elements and binds all event listeners.
 * Called once per page load when the overlay is injected.
 * This function:
 * - Creates the hover trigger element that shows the panel
 * - Creates the panel container with initial styles
 * - Loads the HTML content from the extension directory
 * - Binds all user-facing controls for appearance and behavior
 * - Initializes hover-to-show behavior
 * @returns {Promise<void>}
 */
async function createControlPanel() {
  if (document.querySelector("#subtitle-control-panel")) return; // Avoid duplicate insertion

  const trigger = createPanelHoverTrigger();
  document.body.appendChild(trigger);

  const panel = createPanelContainer();
  document.body.appendChild(panel);

  // Load HTML content from extension directory
  const html = await fetch(chrome.runtime.getURL("html/control_panel.html")).then(r => r.text());
  panel.innerHTML = html;

  // Initialize control values from config
  initializeControlValues(panel);

  // Bind user-facing interactivity and settings
  bindAppearanceControls(panel);
  bindBehaviorControls(panel);
  bindFocusRestoration(panel);

  // Enable hover-to-show behavior
  initHoverPanelBehavior(panel, trigger);
}

/**
 * Initializes control values from the global subtitle config.
 * This ensures that when the control panel is created, all controls
 * reflect the current configuration state.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function initializeControlValues(panel) {
  const config = window.subtitleConfig || {};

  // Initialize background controls
  const backgroundDropdown = panel.querySelector("#dropdown-background");
  if (backgroundDropdown) {
    backgroundDropdown.value = config.background || "off";
  }

  const backgroundOpacitySlider = panel.querySelector("#slider-background-opacity");
  if (backgroundOpacitySlider) {
    const opacity = config.backgroundOpacity || 50;
    backgroundOpacitySlider.value = opacity;
  }

  // Initialize min silence gap slider
  const minSilenceGapSlider = panel.querySelector("#slider-min-silence-gap");
  if (minSilenceGapSlider) {
    const minGap = config.minSilenceGapMs || 1000;
    minSilenceGapSlider.value = minGap;
    
    // Update the display value
    const valueDisplay = panel.querySelector("#slider-min-silence-gap-value");
    if (valueDisplay) {
      valueDisplay.textContent = `${minGap}ms`;
    }
  }
}


/**
 * Clears the control panel and its hover trigger from the DOM.
 * This is typically called when the overlay is removed or the page is unloaded.
 * It ensures no leftover elements remain that could interfere with future overlays.
 * @returns {void}
 */
function clearControlPanel() {
  const panel = document.getElementById("subtitle-control-panel");
  const trigger = document.getElementById("subtitle-panel-hover-trigger");
  if (panel) panel.remove();
  if (trigger) trigger.remove();
}

//////////////////////////////
// 3. DOM STRUCTURE HELPERS
//////////////////////////////

/**
 * Creates the transparent hover zone that triggers the control panel to appear.
 * This element is positioned in the top-right corner of the viewport
 * and covers a large area to ensure easy access.
 * It is styled to be invisible but captures mouse events.
 * @returns {HTMLDivElement} The hover trigger element.
 */
function createPanelHoverTrigger() {
  const trigger = document.createElement("div");
  trigger.id = "subtitle-panel-hover-trigger";
  Object.assign(trigger.style, {
    position: "fixed",
    top: 0,
    right: 0,
    width: "250px",
    height: "600px",
    zIndex: 99997,
    backgroundColor: "transparent",
    pointerEvents: "auto"
  });
  return trigger;
}

/**
 * Creates the styled floating control panel container element.
 * This panel will hold all the controls for subtitle appearance and behavior.
 * It is initially positioned off-screen to the right and becomes visible
 * when the user hovers over the trigger area.
 * @returns {HTMLDivElement} The control panel container element.
 */
function createPanelContainer() {
  const panel = document.createElement("div");
  panel.id = "subtitle-control-panel";
  Object.assign(panel.style, {
    position: "fixed",
    top: "12px",
    right: "-280px", // hidden initially
    backgroundColor: "rgba(34, 34, 34, 0.85)",
    color: "#fff",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "16px",
    zIndex: 99998,
    fontFamily: "sans-serif",
    lineHeight: "1.6",
    width: "250px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    opacity: "0",
    pointerEvents: "none",
    transition: "right 0.3s ease, opacity 0.3s ease"
  });
  return panel;
}

/**
 * Controls how the panel slides in and out on hover.
 * This function sets up event listeners on the trigger and panel
 * to show the panel when hovered and hide it after a delay when not hovered.
 * It uses a timeout to allow the user to move the mouse between the trigger and panel.
 * @param {HTMLDivElement} panel - The control panel element.
 * @param {HTMLDivElement} trigger - The hover trigger element.
 * @returns {void}
 */
function initHoverPanelBehavior(panel, trigger) {
  let hoverActive = false;
  let hideTimeout;

  const showPanel = () => {
    clearTimeout(hideTimeout);
    hoverActive = true;
    panel.style.opacity = "1";
    panel.style.right = "12px";
    panel.style.pointerEvents = "auto";
  };

  const hidePanelDelayed = () => {
    hoverActive = false;
    hideTimeout = setTimeout(() => {
      if (!hoverActive) {
        panel.style.opacity = "0";
        panel.style.right = "-280px";
        panel.style.pointerEvents = "none";
      }
    }, 300);
  };

  trigger.addEventListener("mouseenter", showPanel);
  trigger.addEventListener("mouseleave", hidePanelDelayed);
  panel.addEventListener("mouseenter", showPanel);
  panel.addEventListener("mouseleave", hidePanelDelayed);
}

//////////////////////////////
// 4. CONTROL BINDERS
//////////////////////////////

/**
 * Binds dropdowns and sliders related to subtitle **appearance**:
 * visibility, font size, position, LingQ status, pinyin, etc.
 * This function sets up event listeners for each control element
 * and updates the global `subtitleConfig` object accordingly.
 * It also updates the subtitle overlay immediately when settings change.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function bindAppearanceControls(panel) {
    const overlay = () => document.getElementById("custom-subtitle-overlay");

    // "Visibility" dropdown changes  
    panel.querySelector("#dropdown-visibility")?.addEventListener("change", e => {
        window.subtitleConfig.visibility = e.target.value;
        updateSubtitleVisibility();
    });

      // For "On-Stop" visibility setting, update subtitle visiblity upon play or pause
    const video = findPlexVideoElement();
    if (video) {
        video.addEventListener("pause", updateSubtitleVisibility);
        video.addEventListener("play", updateSubtitleVisibility);
    }

     // "Size" slider adjusted
    document.getElementById("slider-size")?.addEventListener("input", e => {
        const size = parseFloat(e.target.value);
        window.subtitleConfig.fontSizeVH = size;

        // Update font size immediately on subtitle overlay
        const overlay = document.getElementById("custom-subtitle-overlay");
        if (overlay) overlay.style.fontSize = `${size}vh`;
    });

    // "Position" dropdown changes
    document.getElementById("dropdown-position")?.addEventListener("change", e => {
        window.subtitleConfig.position = e.target.value;

        const overlay = document.getElementById("custom-subtitle-overlay");
        if (!overlay) return;

        if (e.target.value === "bottom") {
            overlay.style.bottom = `${window.subtitleConfig.heightVH}vh`;
            overlay.style.top = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (e.target.value === "top") {
            overlay.style.top = `${window.subtitleConfig.heightVH}vh`;
            overlay.style.bottom = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (e.target.value === "center") {
            overlay.style.top = "50%";
            overlay.style.bottom = "auto";
            overlay.style.transform = "translate(-50%, -50%)";
        }
    });

    // "Height" slider changes
    document.getElementById("slider-height")?.addEventListener("input", e => {
        const height = parseFloat(e.target.value);
        window.subtitleConfig.heightVH = height;

        const overlay = document.getElementById("custom-subtitle-overlay");
        if (!overlay) return;

        const position = window.subtitleConfig.position;

        if (position === "bottom") {
            overlay.style.bottom = `${height}vh`;
            overlay.style.top = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (position === "top") {
            overlay.style.top = `${height}vh`;
            overlay.style.bottom = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (position === "center") {
            overlay.style.top = "50%";
            overlay.style.bottom = "auto";
            overlay.style.transform = "translate(-50%, -50%)";
        }
    });

    // "LingQ Status" dropdown changes
    panel.querySelector("#dropdown-lingq")?.addEventListener("change", e => {
        window.subtitleConfig.lingqStatus = e.target.value;
        window.reRenderCurrentSubtitle?.();
    });

    // "Pinyin" dropdown changes
    panel.querySelector("#dropdown-pinyin")?.addEventListener("change", e => {
        window.subtitleConfig.pinyin = e.target.value;
        window.reRenderCurrentSubtitle?.();
    });

     // "Tone color" dropdown changes
    panel.querySelector("#dropdown-tone-color")?.addEventListener("change", e => {
        window.subtitleConfig.toneColor = e.target.value;
        window.reRenderCurrentSubtitle?.();
    });

    // "Translation" dropdown changes
    panel.querySelector("#dropdown-translation")?.addEventListener("change", e => {
        window.subtitleConfig.translation = e.target.value;
        window.reRenderCurrentSubtitle?.();
        // Update background after re-rendering to account for translation visibility change
        setTimeout(() => window.updateSubtitleBackground?.(), 0);
    });

    // "Background" dropdown changes
    panel.querySelector("#dropdown-background")?.addEventListener("change", e => {
        window.subtitleConfig.background = e.target.value;
        updateSubtitleBackground();
    });

    // "Background opacity" slider changes
    panel.querySelector("#slider-background-opacity")?.addEventListener("input", e => {
        const opacity = parseInt(e.target.value);
        window.subtitleConfig.backgroundOpacity = opacity;
        updateSubtitleBackground();
    });
}

/**
 * Binds behavior-related controls: auto-pause and continuous mode.
 * This function sets up event listeners for the behavior controls
 * and updates the global `subtitleConfig` object accordingly.
 * It allows users to toggle continuous subtitle display and auto-pause behavior.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function bindBehaviorControls(panel) {
    
    // "Continuous" dropdown changes
    panel.querySelector("#dropdown-continuous")?.addEventListener("change", e => {
        window.subtitleConfig.useContinuous = e.target.value === "on";
    });

    // "Auto-pause" dropdown changes
    panel.querySelector("#dropdown-auto-pause")?.addEventListener("change", e => {
        window.subtitleConfig.autoPause = e.target.value === "on";
    });

    // "Auto-pause delay" slider changes
    panel.querySelector("#slider-autopause-delay")?.addEventListener("input", e => {
        window.subtitleConfig.autoPauseDelayMs = parseInt(e.target.value);
    });

    // "Remove silences" dropdown changes
    panel.querySelector("#dropdown-remove-silences")?.addEventListener("change", e => {
        window.subtitleConfig.removeSilences = e.target.value === "on";
        console.log("🔇 Remove silences mode:", e.target.value === "on" ? "enabled" : "disabled");
    });

    // "Min silence gap" slider changes
    panel.querySelector("#slider-min-silence-gap")?.addEventListener("input", e => {
        const value = parseInt(e.target.value);
        window.subtitleConfig.minSilenceGapMs = value;
        
        // Update the display value
        const valueDisplay = panel.querySelector("#slider-min-silence-gap-value");
        if (valueDisplay) {
            valueDisplay.textContent = `${value}ms`;
        }
        
        console.log("🔇 Min silence gap set to:", value, "ms");
    });
}

/**
 * Restores keyboard focus to the document after interacting with controls.
 * Prevents issues with Plex navigation when focus gets trapped on inputs.
 * This function adds event listeners to dropdowns and sliders
 * to blur them when changed or interacted with, restoring focus to the body.
 * This ensures that keyboard navigation remains smooth and intuitive.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function bindFocusRestoration(panel) {
  const blurAndFocus = (e) => {
    e.target.blur();
    document.activeElement.blur();
    setTimeout(() => document.body.focus(), 0);
  };

  panel.querySelectorAll("select").forEach(select => {
    select.addEventListener("change", blurAndFocus);
    select.addEventListener("keydown", e => {
      if ([" ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        blurAndFocus(e);
      }
    });
  });

  panel.querySelectorAll('input[type="range"]').forEach(slider => {
    slider.addEventListener("change", blurAndFocus);
    slider.addEventListener("keydown", e => {
      if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        blurAndFocus(e);
      }
    });
  });
}

//////////////////////////////
// 5. EXTERNAL INTERFACES
//////////////////////////////

/**
 * Updates the subtitle mode text in the control panel display area.
 * Typically called when switching between modes.
 * @param {string} newMode - The new subtitle mode (e.g., "Live", "Preprocessed").
 * @returns {void}
 */
function updateModeDisplay(newMode) {
  console.log("📺 updateModeDisplay called with:", newMode);
  const modeEl = document.getElementById("mode-display");
  if (modeEl) modeEl.textContent = `${newMode}`;
  else console.warn("⚠️ updateModeDisplay: #mode-display element not found");
}

/**
 * Sets or hides the sentence explanation text shown in the panel.
 * Typically called by `preprocessed.js` when a line has an explanation.
 * @param {string} text - The explanation text to display.
 * @returns {void}
 */
function updateCurrentExplanation(text) {
  console.log("📘 updateCurrentExplanation called with:", text);
  const wrapper = document.getElementById("sentence-explanation-wrapper");
  const box = document.getElementById("sentence-explanation");

  if (wrapper && box) {
    if (text && text.trim()) {
      box.textContent = text;
      wrapper.style.display = "block";
    } else {
      wrapper.style.display = "none";
    }
  } else {
    console.warn("⚠️ updateCurrentExplanation: elements not found");
  }
}

/**
 * Backward-compatible function that calls all individual binder functions.
 * Still used by other modules, so retained for compatibility.
 * This function binds all the necessary event listeners
 * and initializes the control panel functionality.
 * It should be called once the control panel is injected into the DOM.
 * @returns {void}
 */
function bindControlPanelListeners() {
  const panel = document.getElementById("subtitle-control-panel");
  if (!panel) return;

  bindAppearanceControls(panel);
  bindBehaviorControls(panel);
  bindFocusRestoration(panel);
}

/**
 * Updates the visibility of the subtitle overlay based on the current configuration.
 * This function checks the `window.subtitleConfig.visibility` setting
 * and applies the appropriate display style to the subtitle overlay container.
 * It handles three visibility modes:
 * - "off": Hides the overlay completely.
 * - "on": Shows the overlay regardless of video state.
 * - "on-stop": Shows the overlay only when the video is paused.
 * @returns {void}
 */
function updateSubtitleVisibility() {
    const container = document.getElementById("custom-subtitle-overlay");
    if (!container) return;

    const visibility = window.subtitleConfig.visibility;

    if (visibility === "off") {
        container.style.display = "none";
    } else if (visibility === "on") {
        container.style.display = "block";
    } else if (visibility === "on-stop") {
        const video = findPlexVideoElement();
        if (video && video.paused) {
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    }
}

/**
 * Updates the background styling of the subtitle overlay based on the current configuration.
 * This function applies a semi-transparent black background to either the entire container
 * (when translation is visible) or just the main line (when translation is hidden).
 * @returns {void}
 */
function updateSubtitleBackground() {
    const container = document.getElementById("custom-subtitle-overlay");
    if (!container) return;

    // Get the wrapper (first child of container)
    const wrapper = container.firstElementChild;
    if (!wrapper) return;

    // Get mainLine and translation as children of wrapper
    const mainLine = wrapper.children[0];
    const translation = wrapper.children[1];

    if (!mainLine) return;

    const backgroundEnabled = window.subtitleConfig.background === "on";
    const opacity = window.subtitleConfig.backgroundOpacity || 50;

    if (backgroundEnabled) {
        const translationVisible = translation &&
            translation.style.visibility !== "hidden" &&
            translation.textContent.trim() !== "";

        if (translationVisible) {
            // Background on container, not main line
            container.style.backgroundColor = `rgba(0,0,0,${opacity/100})`;
            container.style.padding = "10px 20px";
            container.style.borderRadius = "10px";
            mainLine.style.backgroundColor = "transparent";
            mainLine.style.padding = "0";
            mainLine.style.borderRadius = "0";
        } else {
            // Background on main line only
            container.style.backgroundColor = "transparent";
            container.style.padding = "0";
            container.style.borderRadius = "0";
            mainLine.style.backgroundColor = `rgba(0,0,0,${opacity/100})`;
            mainLine.style.padding = "8px 16px";
            mainLine.style.borderRadius = "8px";
        }
    } else {
        // Remove all backgrounds when disabled
        container.style.backgroundColor = "transparent";
        container.style.padding = "0";
        container.style.borderRadius = "0";
        mainLine.style.backgroundColor = "transparent";
        mainLine.style.padding = "0";
        mainLine.style.borderRadius = "0";
    }
}

/**
 * Updates the LingQ status percentage display in the control panel.
 * This function takes the calculated percentages and updates all the
 * percentage display elements in the Key Info section.
 * @param {Object} percentages - Object containing status percentages
 * @returns {void}
 */
function updateStatusPercentagesDisplay(percentages) {
  console.log("📊 updateStatusPercentagesDisplay called with:", percentages);
  
  // Update total words count with comma formatting
  const totalWordsElement = document.getElementById('total-words');
  if (totalWordsElement && percentages) {
    const totalWords = percentages.totalWords || 0;
    totalWordsElement.textContent = totalWords.toLocaleString();
  }
  
  // Update each status percentage display
  const statusElements = {
    'status-known': percentages?.status3?.percentage,      // Known (4/5) maps to data status 3
    'status-familiar': percentages?.status2?.percentage,   // Familiar (3) maps to data status 2
    'status-recognized': percentages?.status1?.percentage, // Recognized (2) maps to data status 1
    'status-new': percentages?.status0?.percentage         // New (1) maps to data status 0
  };

  Object.entries(statusElements).forEach(([elementId, percentage]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = formatPercentage(percentage);
    } else {
      console.warn(`⚠️ updateStatusPercentagesDisplay: #${elementId} element not found`);
    }
  });
}

/**
 * Shows the percentage display rows in the control panel.
 * This is called when switching to preprocessed mode.
 * @returns {void}
 */
function showPercentageRows() {
  console.log("👁️ showPercentageRows called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-familiar', 
    'status-recognized',
    'status-new'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      // Find the parent control-row and show it
      const controlRow = element.closest('.control-row');
      if (controlRow) {
        controlRow.style.display = 'flex';
      }
    }
  });
}

/**
 * Hides the percentage display rows in the control panel.
 * This is called when switching to live mode.
 * @returns {void}
 */
function hidePercentageRows() {
  console.log("🙈 hidePercentageRows called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-familiar', 
    'status-recognized',
    'status-new'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      // Find the parent control-row and hide it
      const controlRow = element.closest('.control-row');
      if (controlRow) {
        controlRow.style.display = 'none';
      }
    }
  });
}

/**
 * Clears all status percentage displays in the control panel.
 * This is typically called when switching videos or when no data is available.
 * @returns {void}
 */
function clearStatusPercentagesDisplay() {
  console.log("🧹 clearStatusPercentagesDisplay called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-familiar', 
    'status-recognized',
    'status-new'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = '---';
    }
  });
}

/**
 * Shows a loading state for the status percentage calculations.
 * This provides user feedback while calculations are in progress.
 * @returns {void}
 */
function showStatusPercentagesLoading() {
  console.log("⏳ showStatusPercentagesLoading called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-familiar', 
    'status-recognized',
    'status-new'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = 'Calculating...';
    }
  });
}

/**
 * Hides the sentence explanation section in the control panel.
 * This is called when switching to live mode since explanations aren't available.
 * @returns {void}
 */
function hideSentenceExplanation() {
  console.log("🙈 hideSentenceExplanation called");
  
  const wrapper = document.getElementById("sentence-explanation-wrapper");
  if (wrapper) {
    wrapper.style.display = "none";
  }
}

/**
 * Shows the sentence explanation section in the control panel.
 * This is called when switching to preprocessed mode.
 * @returns {void}
 */
function showSentenceExplanation() {
  console.log("👁️ showSentenceExplanation called");
  
  const wrapper = document.getElementById("sentence-explanation-wrapper");
  if (wrapper) {
    wrapper.style.display = "block";
  }
}

//////////////////////////////
// 6. REMOVE SILENCES FUNCTIONALITY
//////////////////////////////

/**
 * Monitors video time for skip conditions and executes skips when needed.
 * This function should be called periodically during video playback.
 * @param {number} currentTime - Current video time in seconds
 * @param {Object} currentSubtitle - Current subtitle object
 * @param {Object} nextSubtitle - Next subtitle object
 * @param {Array} subtitleData - Full subtitle data array
 * @param {number} currentIndex - Current subtitle index
 * @returns {boolean} True if a skip was executed, false otherwise
 */
function monitorVideoTimeForSkips(currentTime, currentSubtitle, nextSubtitle, subtitleData, currentIndex) {
  // Check if remove silences mode is enabled
  if (!window.subtitleConfig?.removeSilences) {
    return false;
  }

  // Get auto-pause threshold from config
  const autoPauseThreshold = window.subtitleConfig.autoPauseDelayMs || 0;

  // DEBUG: Log current state
  console.log("🔍 Skip Debug:", {
    currentTime: currentTime.toFixed(2),
    currentSubtitleEnd: currentSubtitle?.end?.toFixed(2),
    nextSubtitleStart: nextSubtitle?.start?.toFixed(2),
    autoPauseThreshold: autoPauseThreshold,
    removeSilencesEnabled: window.subtitleConfig?.removeSilences
  });

  // Check if we should skip to next subtitle
  const skipResult = shouldSkipToNextSubtitle(
    currentTime, 
    currentSubtitle, 
    nextSubtitle, 
    true, // removeSilencesEnabled
    autoPauseThreshold
  );

  // DEBUG: Log skip result
  console.log("🔍 Skip Result:", skipResult);

  if (skipResult.shouldSkip) {
    console.log("⏭️ Executing skip:", skipResult.skipReason, "to time:", skipResult.nextSubtitleTime);
    skipToNextSubtitle(skipResult.nextSubtitleTime);
    return true;
  }

  return false;
}

/**
 * Executes a skip to the specified time while maintaining playback state.
 * @param {number} nextTime - The time to skip to in seconds
 * @returns {void}
 */
function skipToNextSubtitle(nextTime) {
  const video = findPlexVideoElement();
  if (!video) {
    console.warn("⚠️ skipToNextSubtitle: No video element found");
    return;
  }

  // Note: We don't cancel auto-pause timers here anymore
  // Instead, we prevent skipping if auto-pause is about to fire

  // Store current playback state
  const wasPlaying = !video.paused;
  const currentPlaybackRate = video.playbackRate;

  // Perform the skip
  video.currentTime = nextTime;

  // Restore playback state if it was playing
  if (wasPlaying && video.paused) {
    video.play().catch(e => {
      console.warn("⚠️ Failed to resume playback after skip:", e);
    });
  }

  console.log("✅ Skip completed to time:", nextTime);
}

/**
 * Disables the remove silences option in live mode.
 * This function should be called when switching to live mode.
 * @returns {void}
 */
function disableRemoveSilencesInLiveMode() {
  const dropdown = document.getElementById("dropdown-remove-silences");
  if (dropdown) {
    dropdown.disabled = true;
    dropdown.value = "off";
    window.subtitleConfig.removeSilences = false;
    
    // Add visual indication that it's not available
    const label = dropdown.previousElementSibling;
    if (label && label.tagName === "LABEL") {
      label.style.opacity = "0.5";
      label.title = "Not available in live mode";
    }
    
    console.log("🔇 Remove silences disabled for live mode");
  }
}

/**
 * Enables the remove silences option in preprocessed mode.
 * This function should be called when switching to preprocessed mode.
 * @returns {void}
 */
function enableRemoveSilencesInPreprocessedMode() {
  const dropdown = document.getElementById("dropdown-remove-silences");
  if (dropdown) {
    dropdown.disabled = false;
    
    // Remove visual indication
    const label = dropdown.previousElementSibling;
    if (label && label.tagName === "LABEL") {
      label.style.opacity = "1";
      label.title = "";
    }
    
    console.log("🔇 Remove silences enabled for preprocessed mode");
  }
}

// Make the functions available globally for other modules
window.updateSubtitleBackground = updateSubtitleBackground;
window.updateStatusPercentagesDisplay = updateStatusPercentagesDisplay;
window.showPercentageRows = showPercentageRows;
window.hidePercentageRows = hidePercentageRows;
window.clearStatusPercentagesDisplay = clearStatusPercentagesDisplay;
window.showStatusPercentagesLoading = showStatusPercentagesLoading;
window.hideSentenceExplanation = hideSentenceExplanation;
window.showSentenceExplanation = showSentenceExplanation;
window.monitorVideoTimeForSkips = monitorVideoTimeForSkips;
window.skipToNextSubtitle = skipToNextSubtitle;
window.disableRemoveSilencesInLiveMode = disableRemoveSilencesInLiveMode;
window.enableRemoveSilencesInPreprocessedMode = enableRemoveSilencesInPreprocessedMode;