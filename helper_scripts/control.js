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
  autoPause: false,
  visibility: "on"        // NEW: "off", "on", "on-stop"
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
    width: "250px",
    height: "800px",
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
    right: "-280px",
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
    transition: "right 0.3s ease, opacity 0.3s ease"
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
    panel.style.right = "12px";  // Slide in
    panel.style.pointerEvents = "auto";
  }

  // Hide the panel after a short delay unless mouse is still over it
  function hidePanelDelayed() {
    hoverActive = false;
    hideTimeout = setTimeout(() => {
      if (!hoverActive) {
        panel.style.opacity = "0";
        panel.style.right = "-280px";  // Slide out
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
// 4. PANEL UPDATE HOOKS
//////////////////////////////

// Update subtitle visbility when control panel area clicked
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

//////////////////////////////
// 5. BIND PANEL LISTENERS
//////////////////////////////

// Binds listeners to control panel elements that update subtitleConfig
function bindControlPanelListeners() {
    const panel = document.getElementById("subtitle-control-panel");
    if (!panel) return;

    // == APPEARANCE ==

    // "Visibility" dropdown changes
    document.getElementById("dropdown-visibility")?.addEventListener("change", e=> {
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
            overlay.style.bottom = `${SUBTITLE_BOTTOM_OFFSET_VH}vh`;
            overlay.style.top = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (e.target.value === "top") {
            overlay.style.top = `${SUBTITLE_BOTTOM_OFFSET_VH}vh`;
            overlay.style.bottom = "auto";
            overlay.style.transform = "translateX(-50%)";
        } else if (e.target.value === "center") {
            overlay.style.top = "50%";
            overlay.style.bottom = "auto";
            overlay.style.transform = "translate(-50%, -50%)";
        }
    });



    // When translation dropdown changes
    document.getElementById("translation-setting")?.addEventListener("change", e => {
        window.subtitleConfig.translation = e.target.value;
    });

    // When pinyin dropdown changes
    document.getElementById("pinyin-setting")?.addEventListener("change", e => {
        window.subtitleConfig.pinyin = e.target.value;
    });



    // Bind auto-pause
    document.getElementById("auto-pause-setting")?.addEventListener("change", e => {
        window.subtitleConfig.autoPause = e.target.checked;
    });

    // 🔄 Blur dropdowns after interaction to restore spacebar
    panel.querySelectorAll("select").forEach(select => {
        select.addEventListener("change", e => {
        e.target.blur(); // remove keyboard focus
        document.activeElement.blur(); // ensure global blur
        setTimeout(() => document.body.focus(), 0); // restore body focus on next tick
        });

        // Also prevent keys from sticking to select after blur
        select.addEventListener("keydown", e => {
        if ([" ", "ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault(); // stop the key from triggering dropdown navigation
            e.target.blur();    // force blur
            setTimeout(() => document.body.focus(), 0); // refocus body
        }
        });
    });

    // 🔄 Blur range sliders after interaction to restore spacebar
    panel.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener("change", e => {
        e.target.blur();
        document.activeElement.blur();
        setTimeout(() => document.body.focus(), 0);
        });

        slider.addEventListener("keydown", e => {
        if ([" ", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
            e.target.blur();
            setTimeout(() => document.body.focus(), 0);
        }
        });
    });

}
