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
// 0. CLEANUP FUNCTION
//////////////////////////////

// Removes the control panel and hover trigger from the DOM
function clearControlPanel() {
  const panel = document.getElementById("subtitle-control-panel");
  const trigger = document.getElementById("subtitle-panel-hover-trigger");
  if (panel) panel.remove();
  if (trigger) trigger.remove();
}


//////////////////////////////
// 1. GLOBAL CONFIG OBJECT
//////////////////////////////

// Shared configuration for subtitles, modifiable via the control panel.
// These values are read by other modules to control subtitle rendering.
window.subtitleConfig = {
  translation: "hover",   // When to show translations: "off", "hover", "always"
  pinyin: "all",          // When to show pinyin: "none", "unknown", or "all"
  fontSizeVH: 5.5,        // Subtitle font size in vh (viewport height units)
  position: "bottom",     // Screen position of subtitles: "bottom" or "top"
  explanations: false,     // Toggle for sentence explanation box (handled externally)
  autoPause: false
};

//////////////////////////////
// 2. EXTERNAL INTERFACES
//////////////////////////////

// Updates the display of the current subtitle mode in the control panel.
function updateModeDisplay(newMode) {
  console.log("📺 updateModeDisplay called with:", newMode); // Debug log
  const modeEl = document.getElementById("mode-display");
  if (modeEl) modeEl.textContent = `${newMode}`;
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
// 3. CREATE PANEL & TRIGGER
//////////////////////////////

function createControlPanel() {
  console.log("🛠 createControlPanel() was called"); // Debug log to trace when control panel is injected
  // Prevent duplicate panels from being created
  if (document.querySelector("#subtitle-control-panel")) return;
  // === Create invisible trigger region for hover detection ===
  const trigger = document.createElement("div");
  trigger.id = "subtitle-panel-hover-trigger";
  Object.assign(trigger.style, {
    position: "fixed",
    top: 0,
    right: 0,
    width: "205px",
    height: "500px",
    zIndex: 99997,
    backgroundColor: "transparent",
    pointerEvents: "auto"
  });
  document.body.appendChild(trigger);

  // === Create the control panel UI container ===
  const panel = document.createElement("div");
  panel.id = "subtitle-control-panel";

  fetch(chrome.runtime.getURL("html/control_panel.html"))
    .then(res => res.text())
    .then(html => {
        panel.innerHTML = html;
        bindControlPanelListeners();
  });

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
    width: "250px",
    maxWidth: "250x",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.1s ease"
  });

  document.body.appendChild(panel);

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
// 4. BIND PANEL LISTENERS
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
  document.getElementById("slider-size")?.addEventListener("input", e => {
    const size = parseFloat(e.target.value);
    window.subtitleConfig.fontSizeVH = size;
    document.getElementById("slider-size").textContent = `${size}vh`;

    // Update font size immediately on subtitle overlay
    const overlay = document.getElementById("custom-subtitle-overlay");
    if (overlay) overlay.style.fontSize = `${size}vh`;
  });

  // When position dropdown changes
  document.getElementById("dropdown-position")?.addEventListener("change", e => {
    window.subtitleConfig.position = e.target.value;

    // Move overlay to top or bottom accordingly
    const overlay = document.getElementById("custom-subtitle-overlay");
    if (overlay) {
      overlay.style.top = e.target.value === "top" ? "15vh" : "auto";
      overlay.style.bottom = e.target.value === "bottom" ? "15vh" : "auto";
    }
  });

    // Bind auto-pause
    document.getElementById("auto-pause-setting")?.addEventListener("change", e => {
        window.subtitleConfig.autoPause = e.target.checked;
    });
}
