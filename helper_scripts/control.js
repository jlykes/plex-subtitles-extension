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

  // === Behavior Settings ===
  useContinuous: true,         // Keep last subtitle shown after time range ends
  autoPause: false,            // Automatically pause video when subtitle ends
  autoPauseDelayMs: 200        // Delay (ms) before pausing video
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

  // Bind user-facing interactivity and settings
  bindAppearanceControls(panel);
  bindBehaviorControls(panel);
  bindFocusRestoration(panel);

  // Enable hover-to-show behavior
  initHoverPanelBehavior(panel, trigger);
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