// === helper_scripts/control.js ===
// Control Panel for Plex Subtitle Overlay
// ----------------------------------------
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

// Shared configuration for subtitles, modifiable via the control panel.
// These values are read by other modules to control subtitle rendering.
window.subtitleConfig = {
  mode: "auto",           // Subtitle source mode: auto-detect, live, or preprocessed
  translation: "hover",   // When to show translations: "off", "hover", "always"
  pinyin: "all",          // When to show pinyin: "none", "unknown", or "all"
  fontSizeVH: 5.5,        // Subtitle font size in vh (viewport height units)
  position: "bottom",     // Screen position of subtitles: "bottom" or "top"
  explanations: false     // Toggle for sentence explanation box (handled externally)
};

//////////////////////////////
// 2. EXTERNAL INTERFACES
//////////////////////////////

// Updates the display of the current subtitle mode in the control panel.
function updateModeDisplay(newMode) {
  console.log("📺 updateModeDisplay called with:", newMode); // Debug log
  window.subtitleConfig.mode = newMode;
  const modeEl = document.getElementById("mode-display");
  if (modeEl) modeEl.textContent = `Mode: ${newMode}`;
  else console.warn("⚠️ updateModeDisplay: #mode-display element not found");
}

// Shows or hides a sentence explanation box in the panel, based on content.
function updateCurrentExplanation(text) {
  console.log("📘 updateCurrentExplanation called with:", text); // Debug log
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

//////////////////////////////
// 3. CONDITIONAL PANEL INJECTION
//////////////////////////////

// Checks if a valid Plex video player is present in the DOM.
function isPlexVideoPresent() {
  return [...document.querySelectorAll("video")]
    .some(el => el.classList.contains("HTMLMedia-mediaElement-u17S9P"));
}

// Only creates the panel if we're on a Plex tab with a valid video.
function createControlPanelIfNeeded() {
  if (!isPlexVideoPresent()) return;
  if (!document.querySelector("#subtitle-control-panel")) {
    createControlPanel();
  }
}

// Delay initial check slightly to wait for Plex's DOM to load.
setTimeout(() => {
  createControlPanelIfNeeded();
}, 500);

// Fallback: watch for DOM changes in case Plex injects the video player after load.
const observer = new MutationObserver(() => {
  if (isPlexVideoPresent() && !document.querySelector("#subtitle-control-panel")) {
    createControlPanel();
    observer.disconnect(); // Stop watching once panel is injected
  }
});
observer.observe(document.body, { childList: true, subtree: true });

//////////////////////////////
// 4. CREATE PANEL & TRIGGER
//////////////////////////////

function createControlPanel() {
  // Prevent duplicate panels from being created
  if (document.querySelector("#subtitle-control-panel")) return;
  // === Create invisible trigger region for hover detection ===
  const trigger = document.createElement("div");
  trigger.id = "subtitle-panel-hover-trigger";
  Object.assign(trigger.style, {
    position: "fixed",
    top: 0,
    right: 0,
    width: "400px",
    height: "700px",
    zIndex: 99997,
    backgroundColor: "transparent",
    pointerEvents: "auto"
  });
  document.body.appendChild(trigger);

  // === Create the control panel UI container ===
  const panel = document.createElement("div");
  panel.id = "subtitle-control-panel";
  panel.innerHTML = `
    <div id="mode-display" style="margin-bottom: 12px;">Mode: auto</div>
    <label>Translation:
      <select id="translation-setting">
        <option value="off">Off</option>
        <option value="hover" selected>Hover</option>
        <option value="always">Always</option>
      </select>
    </label><br/><br/>
    <label>Pinyin:
      <select id="pinyin-setting">
        <option value="none">None</option>
        <option value="unknown">Unknown</option>
        <option value="all" selected>All</option>
      </select>
    </label><br/><br/>
    <label>Font Size:
      <input type="range" id="font-size-setting" min="3" max="10" step="0.1" value="5.5"/>
      <span id="font-size-value">5.5vh</span>
    </label><br/><br/>
    <label>Position:
      <select id="position-setting">
        <option value="bottom" selected>Bottom</option>
        <option value="top">Top</option>
      </select>
    </label><br/><br/>
    <div id="sentence-explanation-wrapper" style="margin-top: 12px;">
      <div><strong>Sentence Explanation:</strong></div>
      <div id="sentence-explanation" style="margin-top: 6px; font-style: italic; color: #ccc; font-size: 15px;"></div>
    </div>
  `;

  // === Apply styling to panel ===
  Object.assign(panel.style, {
    position: "fixed",
    top: "12px",
    right: "12px",
    backgroundColor: "rgba(34,34,34,0.85)",
    color: "#fff",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "16px",
    zIndex: 99998,
    fontFamily: "sans-serif",
    lineHeight: "1.6",
    maxWidth: "300px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.1s ease"
  });

  document.body.appendChild(panel);

  // Setup all event listeners for dropdowns, sliders, etc.
  bindControlPanelListeners();

  //////////////////////////////
  // 5. Hover Visibility Logic
  //////////////////////////////

  let hoverActive = false;
  let hideTimeout;

  // Show the panel immediately
  function showPanel() {
    clearTimeout(hideTimeout);
    hoverActive = true;
    panel.style.opacity = "1";
    panel.style.pointerEvents = "auto";
  }

  // Hide the panel after a short delay unless mouse is still over it
  function hidePanelDelayed() {
    hoverActive = false;
    hideTimeout = setTimeout(() => {
      if (!hoverActive) {
        panel.style.opacity = "0";
        panel.style.pointerEvents = "none";
      }
    }, 300);
  }

  // Attach hover listeners to trigger zone and panel
  trigger.addEventListener("mouseenter", showPanel);
  trigger.addEventListener("mouseleave", hidePanelDelayed);
  panel.addEventListener("mouseenter", showPanel);
  panel.addEventListener("mouseleave", hidePanelDelayed);
}

//////////////////////////////
// 5. BIND PANEL LISTENERS
//////////////////////////////

// Binds listeners to control panel elements that update subtitleConfig
function bindControlPanelListeners() {
  const panel = document.getElementById("subtitle-control-panel");
  if (!panel) return;

  // When translation dropdown changes
  document.getElementById("translation-setting")?.addEventListener("change", e => {
    window.subtitleConfig.translation = e.target.value;
  });

  // When pinyin dropdown changes
  document.getElementById("pinyin-setting")?.addEventListener("change", e => {
    window.subtitleConfig.pinyin = e.target.value;
  });

  // When font size slider is adjusted
  document.getElementById("font-size-setting")?.addEventListener("input", e => {
    const size = parseFloat(e.target.value);
    window.subtitleConfig.fontSizeVH = size;
    document.getElementById("font-size-value").textContent = `${size}vh`;

    // Update font size immediately on subtitle overlay
    const overlay = document.getElementById("custom-subtitle-overlay");
    if (overlay) overlay.style.fontSize = `${size}vh`;
  });

  // When position dropdown changes
  document.getElementById("position-setting")?.addEventListener("change", e => {
    window.subtitleConfig.position = e.target.value;

    // Move overlay to top or bottom accordingly
    const overlay = document.getElementById("custom-subtitle-overlay");
    if (overlay) {
      overlay.style.top = e.target.value === "top" ? "15vh" : "auto";
      overlay.style.bottom = e.target.value === "bottom" ? "15vh" : "auto";
    }
  });
}
