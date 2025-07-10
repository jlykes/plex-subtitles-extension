// === helper_scripts/control/skip-logic.js ===

// This module handles the "remove silences" feature that automatically skips
// over silent gaps between subtitles. It monitors video playback and executes
// skips when appropriate conditions are met.

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
 * Hides the remove silences option in live mode.
 * This function should be called when switching to live mode.
 * @returns {void}
 */
function disableRemoveSilencesInLiveMode() {
  const dropdown = document.getElementById("dropdown-remove-silences");
  const slider = document.getElementById("slider-min-silence-gap");
  
  if (dropdown) {
    // Find the parent control-row and hide it completely
    const controlRow = dropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
  
  if (slider) {
    // Find the parent control-row and hide it completely
    const controlRow = slider.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'none';
    }
  }
  
  console.log("🔇 Remove silences hidden for live mode");
}

/**
 * Shows the remove silences option in preprocessed mode.
 * This function should be called when switching to preprocessed mode.
 * @returns {void}
 */
function enableRemoveSilencesInPreprocessedMode() {
  const dropdown = document.getElementById("dropdown-remove-silences");
  const slider = document.getElementById("slider-min-silence-gap");
  
  if (dropdown) {
    // Find the parent control-row and show it
    const controlRow = dropdown.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
  
  if (slider) {
    // Find the parent control-row and show it
    const controlRow = slider.closest('.control-row');
    if (controlRow) {
      controlRow.style.display = 'flex';
    }
  }
  
  console.log("🔇 Remove silences shown for preprocessed mode");
}

// Make functions available globally for other modules
window.monitorVideoTimeForSkips = monitorVideoTimeForSkips;
window.skipToNextSubtitle = skipToNextSubtitle;
window.disableRemoveSilencesInLiveMode = disableRemoveSilencesInLiveMode;
window.enableRemoveSilencesInPreprocessedMode = enableRemoveSilencesInPreprocessedMode; 