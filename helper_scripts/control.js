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

  // Initialize settings from storage and then control values
  if (window.storageUtils) {
    await window.storageUtils.initializeSettings();
  }
  initializeControlValues(panel);

  // Bind user-facing interactivity and settings
  bindAppearanceControls(panel);
  bindBehaviorControls(panel);
  bindFocusRestoration(panel);
  bindSettingsManagement(panel);

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

  // Initialize all dropdown controls
  const dropdowns = {
    'dropdown-visibility': config.visibility || 'on',
    'dropdown-position': config.position || 'bottom',
    'dropdown-lingq': config.lingqStatus || 'on',
    'dropdown-pinyin': config.pinyin || 'unknown-only',
    'dropdown-tone-color': config.toneColor || 'all',
    'dropdown-translation': config.translation || 'on-hover',
    'dropdown-background': config.background || 'off',
    'dropdown-continuous': config.useContinuous ? 'on' : 'off',
    'dropdown-auto-pause': config.autoPause ? 'on' : 'off',
    'dropdown-remove-silences': config.removeSilences ? 'on' : 'off'
  };

  // Set dropdown values
  Object.entries(dropdowns).forEach(([id, value]) => {
    const dropdown = panel.querySelector(`#${id}`);
    if (dropdown) {
      dropdown.value = value;
    }
  });

  // Initialize sliders
  const sliders = {
    'slider-size': config.fontSizeVH || 5.5,
    'slider-height': config.heightVH || 16,
    'slider-background-opacity': config.backgroundOpacity || 50,
    'slider-autopause-delay': config.autoPauseDelayMs || 0,
    'slider-min-silence-gap': config.minSilenceGapMs || 1000
  };

  // Set slider values
  Object.entries(sliders).forEach(([id, value]) => {
    const slider = panel.querySelector(`#${id}`);
    if (slider) {
      slider.value = value;
    }
  });
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
    panel.querySelector("#dropdown-visibility")?.addEventListener("change", async e => {
        window.subtitleConfig.visibility = e.target.value;
        updateSubtitleVisibility();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('visibility', e.target.value);
        }
    });

      // For "On-Stop" visibility setting, update subtitle visiblity upon play or pause
    const video = findPlexVideoElement();
    if (video) {
        video.addEventListener("pause", updateSubtitleVisibility);
        video.addEventListener("play", updateSubtitleVisibility);
    }

     // "Size" slider adjusted
    document.getElementById("slider-size")?.addEventListener("input", async e => {
        const size = parseFloat(e.target.value);
        window.subtitleConfig.fontSizeVH = size;

        // Update font size immediately on subtitle overlay
        const overlay = document.getElementById("custom-subtitle-overlay");
        if (overlay) overlay.style.fontSize = `${size}vh`;
        

        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('fontSizeVH', size);
        }
    });

    // "Position" dropdown changes
    document.getElementById("dropdown-position")?.addEventListener("change", async e => {
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
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('position', e.target.value);
        }
    });

    // "Height" slider changes
    document.getElementById("slider-height")?.addEventListener("input", async e => {
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
        

        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('heightVH', height);
        }
    });

    // "LingQ Status" dropdown changes
    panel.querySelector("#dropdown-lingq")?.addEventListener("change", async e => {
        window.subtitleConfig.lingqStatus = e.target.value;
        window.reRenderCurrentSubtitle?.();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('lingqStatus', e.target.value);
        }
    });

    // "Pinyin" dropdown changes
    panel.querySelector("#dropdown-pinyin")?.addEventListener("change", async e => {
        window.subtitleConfig.pinyin = e.target.value;
        window.reRenderCurrentSubtitle?.();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('pinyin', e.target.value);
        }
    });

     // "Tone color" dropdown changes
    panel.querySelector("#dropdown-tone-color")?.addEventListener("change", async e => {
        window.subtitleConfig.toneColor = e.target.value;
        window.reRenderCurrentSubtitle?.();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('toneColor', e.target.value);
        }
    });

    // "Translation" dropdown changes
    panel.querySelector("#dropdown-translation")?.addEventListener("change", async e => {
        window.subtitleConfig.translation = e.target.value;
        window.reRenderCurrentSubtitle?.();
        // Update background after re-rendering to account for translation visibility change
        setTimeout(() => window.updateSubtitleBackground?.(), 0);
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('translation', e.target.value);
        }
    });

    // "Background" dropdown changes
    panel.querySelector("#dropdown-background")?.addEventListener("change", async e => {
        window.subtitleConfig.background = e.target.value;
        updateSubtitleBackground();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('background', e.target.value);
        }
    });

    // "Background opacity" slider changes
    panel.querySelector("#slider-background-opacity")?.addEventListener("input", async e => {
        const opacity = parseInt(e.target.value);
        window.subtitleConfig.backgroundOpacity = opacity;
        updateSubtitleBackground();
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('backgroundOpacity', opacity);
        }
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
    panel.querySelector("#dropdown-continuous")?.addEventListener("change", async e => {
        window.subtitleConfig.useContinuous = e.target.value === "on";
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('useContinuous', e.target.value === "on");
        }
    });

    // "Auto-pause" dropdown changes
    panel.querySelector("#dropdown-auto-pause")?.addEventListener("change", async e => {
        window.subtitleConfig.autoPause = e.target.value === "on";
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('autoPause', e.target.value === "on");
        }
    });

    // "Auto-pause delay" slider changes
    panel.querySelector("#slider-autopause-delay")?.addEventListener("input", async e => {
        const value = parseInt(e.target.value);
        window.subtitleConfig.autoPauseDelayMs = value;
        

        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('autoPauseDelayMs', value);
        }
    });

    // "Remove silences" dropdown changes
    panel.querySelector("#dropdown-remove-silences")?.addEventListener("change", async e => {
        window.subtitleConfig.removeSilences = e.target.value === "on";
        console.log("🔇 Remove silences mode:", e.target.value === "on" ? "enabled" : "disabled");
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('removeSilences', e.target.value === "on");
        }
    });

    // "Min silence gap" slider changes
    panel.querySelector("#slider-min-silence-gap")?.addEventListener("input", async e => {
        const value = parseInt(e.target.value);
        window.subtitleConfig.minSilenceGapMs = value;
        

        
        console.log("🔇 Min silence gap set to:", value, "ms");
        
        // Save setting to storage
        if (window.storageUtils) {
            await window.storageUtils.updateSetting('minSilenceGapMs', value);
        }
    });
}


/**
 * Binds settings management controls like reset to defaults.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function bindSettingsManagement(panel) {
  // Reset to defaults button
  panel.querySelector("#reset-settings-btn")?.addEventListener("click", async () => {
    console.log("Reset button clicked");
    
    if (window.storageUtils) {
      try {
        console.log("Before reset - subtitleConfig:", window.subtitleConfig);
        
        await window.storageUtils.resetSettings();
        console.log("Storage reset completed");
        
        // Reload settings and reinitialize controls
        await window.storageUtils.initializeSettings();
        console.log("Settings reinitialized - subtitleConfig:", window.subtitleConfig);
        
        initializeControlValues(panel);
        console.log("Control values reinitialized");
        
        // Apply all visual changes to the subtitle overlay
        const overlay = document.getElementById("custom-subtitle-overlay");
        if (overlay) {
          console.log("Applying visual changes to overlay");
          
          // Apply font size
          const newFontSize = `${window.subtitleConfig.fontSizeVH}vh`;
          overlay.style.fontSize = newFontSize;
          console.log("Font size set to:", newFontSize);
          
          // Apply position and height
          const position = window.subtitleConfig.position;
          const height = window.subtitleConfig.heightVH;
          console.log("Position:", position, "Height:", height);
          
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
        } else {
          console.warn("No subtitle overlay found");
        }
        
        // Update visibility
        updateSubtitleVisibility();
        console.log("Visibility updated");
        
        // Update background
        updateSubtitleBackground();
        console.log("Background updated");
        
        // Re-render current subtitle to apply new settings
        if (window.reRenderCurrentSubtitle) {
          window.reRenderCurrentSubtitle();
          console.log("Subtitle re-rendered");
        } else {
          console.warn("reRenderCurrentSubtitle function not available");
        }
        
        console.log("Settings reset to defaults successfully");
      } catch (error) {
        console.error("Error resetting settings:", error);
      }
    } else {
      console.error("Storage utils not available");
    }
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

/**
 * Hides translation-related controls in live mode.
 * Translation requires preprocessed data not available in live mode.
 * @returns {void}
 */
function hideTranslationInLiveMode() {
  console.log("🙈 hideTranslationInLiveMode called");
  
  const translationDropdown = document.getElementById("dropdown-translation");
  if (translationDropdown) {
    // Find the parent control-row and hide it completely
    const controlRow = translationDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
}

/**
 * Shows translation controls in preprocessed mode.
 * @returns {void}
 */
function showTranslationInPreprocessedMode() {
  console.log("👁️ showTranslationInPreprocessedMode called");
  
  const translationDropdown = document.getElementById("dropdown-translation");
  if (translationDropdown) {
    // Find the parent control-row and show it
    const controlRow = translationDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
}

/**
 * Hides auto-pause controls in live mode.
 * Auto-pause requires subtitle timing data not available in live mode.
 * @returns {void}
 */
function hideAutoPauseInLiveMode() {
  console.log("🙈 hideAutoPauseInLiveMode called");
  
  const autoPauseDropdown = document.getElementById("dropdown-auto-pause");
  const autoPauseDelaySlider = document.getElementById("slider-autopause-delay");
  
  if (autoPauseDropdown) {
    // Find the parent control-row and hide it completely
    const controlRow = autoPauseDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
  
  if (autoPauseDelaySlider) {
    // Find the parent control-row and hide it completely
    const controlRow = autoPauseDelaySlider.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
}

/**
 * Shows auto-pause controls in preprocessed mode.
 * @returns {void}
 */
function showAutoPauseInPreprocessedMode() {
  console.log("👁️ showAutoPauseInPreprocessedMode called");
  
  const autoPauseDropdown = document.getElementById("dropdown-auto-pause");
  const autoPauseDelaySlider = document.getElementById("slider-autopause-delay");
  
  if (autoPauseDropdown) {
    // Find the parent control-row and show it
    const controlRow = autoPauseDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
  
  if (autoPauseDelaySlider) {
    // Find the parent control-row and show it
    const controlRow = autoPauseDelaySlider.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
}

/**
 * Hides the continuous mode option in live mode.
 * Continuous mode doesn't work properly in live mode since we can't track subtitle timing.
 * @returns {void}
 */
function hideContinuousInLiveMode() {
  console.log("🙈 hideContinuousInLiveMode called");
  
  const continuousDropdown = document.getElementById("dropdown-continuous");
  if (continuousDropdown) {
    // Find the parent control-row and hide it completely
    const controlRow = continuousDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
}

/**
 * Shows the continuous mode option in preprocessed mode.
 * @returns {void}
 */
function showContinuousInPreprocessedMode() {
  console.log("👁️ showContinuousInPreprocessedMode called");
  
  const continuousDropdown = document.getElementById("dropdown-continuous");
  if (continuousDropdown) {
    // Find the parent control-row and show it
    const controlRow = continuousDropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
}

/**
 * Hides the entire behavior section in live mode.
 * All behavior controls are hidden in live mode, so hide the section header too.
 * @returns {void}
 */
function hideBehaviorSectionInLiveMode() {
  console.log("🙈 hideBehaviorSectionInLiveMode called");
  
  const behaviorSection = document.getElementById("behavior-section");
  if (behaviorSection) {
    behaviorSection.style.display = 'none';
  }
}

/**
 * Shows the behavior section in preprocessed mode.
 * @returns {void}
 */
function showBehaviorSectionInPreprocessedMode() {
  console.log("👁️ showBehaviorSectionInPreprocessedMode called");
  
  const behaviorSection = document.getElementById("behavior-section");
  if (behaviorSection) {
    behaviorSection.style.display = 'block';
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
window.hideTranslationInLiveMode = hideTranslationInLiveMode;
window.showTranslationInPreprocessedMode = showTranslationInPreprocessedMode;
window.hideAutoPauseInLiveMode = hideAutoPauseInLiveMode;
window.showAutoPauseInPreprocessedMode = showAutoPauseInPreprocessedMode;
window.hideContinuousInLiveMode = hideContinuousInLiveMode;
window.showContinuousInPreprocessedMode = showContinuousInPreprocessedMode;
window.hideBehaviorSectionInLiveMode = hideBehaviorSectionInLiveMode;
window.showBehaviorSectionInPreprocessedMode = showBehaviorSectionInPreprocessedMode;