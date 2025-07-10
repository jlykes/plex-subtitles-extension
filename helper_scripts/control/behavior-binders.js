// === helper_scripts/control/behavior-binders.js ===

// This module handles all behavior-related control bindings for the subtitle overlay.
// It manages controls like auto-pause, continuous mode, and remove silences.

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

// Make function available globally for other modules
window.bindBehaviorControls = bindBehaviorControls; 