// === helper_scripts/control/ui-managers.js ===

// This module handles showing and hiding UI elements based on the current
// subtitle mode (live vs preprocessed). It manages which controls are
// available in each mode since some features require preprocessed data.

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

// Make functions available globally for other modules
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