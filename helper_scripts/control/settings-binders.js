// === helper_scripts/control/settings-binders.js ===

// This module handles all settings management control bindings for the subtitle overlay.
// It manages controls like reset to defaults and other settings-related functionality.

/**
 * Binds settings management controls like reset to defaults.
 * @param {HTMLDivElement} panel - The control panel element.
 * @returns {void}
 */
function bindSettingsManagement(panel) {
f  console.log("🔧 bindSettingsManagement called with panel:", panel);
  
  // Reset to defaults button
  const resetButton = panel.querySelector("#reset-settings-btn");
  console.log("🔧 Reset button found:", resetButton);
  
  resetButton?.addEventListener("click", async () => {
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

// Make functions available globally for other modules
window.bindSettingsManagement = bindSettingsManagement;
window.bindFocusRestoration = bindFocusRestoration; 