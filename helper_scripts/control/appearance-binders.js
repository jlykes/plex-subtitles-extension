// === helper_scripts/control/appearance-binders.js ===

// This module handles all appearance-related control bindings for the subtitle overlay.
// It manages controls like visibility, font size, position, LingQ status, pinyin, etc.

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

// Make function available globally for other modules
window.bindAppearanceControls = bindAppearanceControls; 