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
// 1. PANEL INITIALIZATION & CLEANUP
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

  // Bind manual LingQ update button
  bindLingqUpdateButton();

  // Start automatic LingQ data fetching every 1 minute and do initial fetch
  if (!window.lingqInitialFetchPromise) {
    // Initial fetch promise (resolves after first fetch completes)
    window.lingqInitialFetchPromise = (async () => {
      const cookies = await window.lingqData.getLingqCookies();
      if (cookies) {
        const data = await window.lingqData.fetchLingqData(cookies.csrftoken, cookies.wwwlingqcomsa);
        if (data) {
          await window.lingqData.storeLingqData(data);
          console.log("[LingQ] Initial fetch complete and data stored.");
        } else {
          console.warn("[LingQ] Initial fetch failed: API returned no data.");
        }
      } else {
        console.warn("[LingQ] Initial fetch failed: No cookies found.");
      }
    })();
  }
  window.lingqData.startLingqAutoFetch();

  // Set up LingQ storage change listener to re-render subtitles and update percentages
  // whenever LingQ data changes in storage
  window.lingqData.setupLingqStorageListener(() => {
    // Always update window.lingqTerms with latest data from storage
    window.lingqData.loadLingQTerms().then(lingqTerms => {
      window.lingqTerms = lingqTerms;
      console.log('[control] Updated window.lingqTerms with latest data from storage');
      
      // Don't re-render if a word popup is currently open
      const popup = document.querySelector('.word-popup');
      if (popup) {
        console.log('[control] Skipping subtitle re-render because word popup is open');
        return;
      }
      
      // Re-render subtitle and update percentages
      if (window.reRenderCurrentSubtitle) {
        window.reRenderCurrentSubtitle();
      }
      if (window.subtitleList && Array.isArray(window.subtitleList)) {
        const percentages = calculateLingQStatusPercentages(window.subtitleList, lingqTerms);
        updateStatusPercentagesDisplay(percentages);
      }
    });
  });

  // Set up video player visibility monitoring
  setupVideoPlayerVisibilityMonitoring();
  
  // Initial visibility check for control panel
  updateControlPanelVisibility();
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
  
  // Clean up video player visibility monitoring
  cleanupVideoPlayerVisibilityMonitoring();
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
  
  // Set up video player visibility monitoring if not already set up
  if (!videoPlayerVisibilityObserver) {
    setupVideoPlayerVisibilityMonitoring();
  }
}

//////////////////////////////
// 2. DOM STRUCTURE HELPERS
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
    width: "300px",
    height: "700px",
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
    right: "-330px", // hidden initially (adjusted for wider panel)
    backgroundColor: "rgba(34, 34, 34, 0.85)",
    color: "#fff",
    padding: "18px",
    borderRadius: "12px",
    fontSize: "16px",
    zIndex: 99998,
    fontFamily: "sans-serif",
    lineHeight: "1.6",
    width: "300px",
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
        panel.style.right = "-330px";
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
// 3. CONTROL INITIALIZATION
//////////////////////////////

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

//////////////////////////////
// 4. SUBTITLE VISIBILITY & DISPLAY
//////////////////////////////

/**
 * Checks if the Plex video player is currently visible.
 * This function looks for the main Plex container and checks if it has
 * the 'show-video-player' class, which indicates the video player is visible.
 * @returns {boolean} True if the video player is visible, false otherwise.
 */
function isPlexVideoPlayerVisible() {
  const plexContainer = document.querySelector('#plex');
  if (!plexContainer) {
    console.log("🔍 isPlexVideoPlayerVisible: Plex container not found");
    return false;
  }
  
  const hasShowVideoPlayerClass = plexContainer.classList.contains('show-video-player');
  console.log("🔍 isPlexVideoPlayerVisible: Container classes:", plexContainer.className, "Has show-video-player:", hasShowVideoPlayerClass);
  
  // Check if the container has the 'show-video-player' class
  return hasShowVideoPlayerClass;
}

/**
 * Updates the visibility of the subtitle overlay based on the current configuration.
 * This function checks the `window.subtitleConfig.visibility` setting
 * and applies the appropriate display style to the subtitle overlay container.
 * It handles three visibility modes:
 * - "off": Hides the overlay completely.
 * - "on": Shows the overlay regardless of video state.
 * - "on-stop": Shows the overlay only when the video is paused.
 * 
 * Additionally, this function now checks if the Plex video player is visible.
 * If the video player is minimized (showing movie info instead), subtitles are hidden
 * regardless of the visibility setting.
 * @returns {void}
 */
function updateSubtitleVisibility() {
    console.log("🎬 updateSubtitleVisibility called");
    
    const container = document.getElementById("custom-subtitle-overlay");
    if (!container) {
        console.log("⚠️ updateSubtitleVisibility: Subtitle container not found");
        return;
    }

    // First check if the Plex video player is visible
    // If not visible (minimized), hide subtitles regardless of settings
    const videoPlayerVisible = isPlexVideoPlayerVisible();
    console.log("🎬 updateSubtitleVisibility: Video player visible:", videoPlayerVisible);
    
    if (!videoPlayerVisible) {
        console.log("🎬 updateSubtitleVisibility: Hiding subtitles - video player not visible");
        container.style.display = "none";
        return;
    }

    const visibility = window.subtitleConfig?.visibility || 'on';
    console.log("🎬 updateSubtitleVisibility: Visibility setting:", visibility);

    if (visibility === "off") {
        console.log("🎬 updateSubtitleVisibility: Hiding subtitles - visibility off");
        container.style.display = "none";
    } else if (visibility === "on") {
        console.log("🎬 updateSubtitleVisibility: Showing subtitles - visibility on");
        container.style.display = "block";
    } else if (visibility === "on-stop") {
        const video = findPlexVideoElement();
        const isPaused = video && video.paused;
        console.log("🎬 updateSubtitleVisibility: on-stop mode, video paused:", isPaused);
        
        if (isPaused) {
            console.log("🎬 updateSubtitleVisibility: Showing subtitles - video paused");
            container.style.display = "block";
        } else {
            console.log("🎬 updateSubtitleVisibility: Hiding subtitles - video playing");
            container.style.display = "none";
        }
    }
}

/**
 * Updates the visibility of the control panel based on video player state.
 * This function hides the control panel when the video player is minimized
 * (showing movie info instead) to keep the interface clean.
 * @returns {void}
 */
function updateControlPanelVisibility() {
  console.log("🎛️ updateControlPanelVisibility called");
  
  const panel = document.getElementById("subtitle-control-panel");
  const trigger = document.getElementById("subtitle-panel-hover-trigger");
  
  if (!panel || !trigger) {
    console.log("⚠️ updateControlPanelVisibility: Control panel elements not found");
    return;
  }

  // Check if the Plex video player is visible
  const videoPlayerVisible = isPlexVideoPlayerVisible();
  console.log("🎛️ updateControlPanelVisibility: Video player visible:", videoPlayerVisible);
  
  if (!videoPlayerVisible) {
    console.log("🎛️ updateControlPanelVisibility: Hiding control panel - video player not visible");
    // Hide both panel and trigger
    panel.style.display = "none";
    trigger.style.display = "none";
  } else {
    console.log("🎛️ updateControlPanelVisibility: Showing control panel - video player visible");
    // Show both panel and trigger
    panel.style.display = "block";
    trigger.style.display = "block";
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
 * Sets up a MutationObserver to monitor changes in the Plex video player visibility.
 * This observer watches for changes in the class list of the main Plex container
 * and updates subtitle visibility when the video player is shown or hidden.
 * @returns {void}
 */
function setupVideoPlayerVisibilityMonitoring() {
  // Clean up any existing observer
  if (videoPlayerVisibilityObserver) {
    videoPlayerVisibilityObserver.disconnect();
    videoPlayerVisibilityObserver = null;
  }

  const plexContainer = document.querySelector('#plex');
  if (!plexContainer) {
    console.log("⚠️ setupVideoPlayerVisibilityMonitoring: Plex container not found");
    return;
  }

  // Create observer to watch for class changes on the Plex container
  videoPlayerVisibilityObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        console.log("🎬 Video player visibility state changed, updating visibility");
        console.log("🎬 Mutation details:", {
          type: mutation.type,
          attributeName: mutation.attributeName,
          oldValue: mutation.oldValue,
          target: mutation.target.className
        });
        updateSubtitleVisibility();
        updateControlPanelVisibility();
      }
    });
  });

  // Start observing the Plex container for class attribute changes
  videoPlayerVisibilityObserver.observe(plexContainer, {
    attributes: true,
    attributeFilter: ['class']
  });

  console.log("👀 Video player visibility monitoring set up");
}

/**
 * Cleans up the video player visibility observer.
 * This should be called when the extension is unloaded or when cleaning up.
 * @returns {void}
 */
function cleanupVideoPlayerVisibilityMonitoring() {
  if (videoPlayerVisibilityObserver) {
    videoPlayerVisibilityObserver.disconnect();
    videoPlayerVisibilityObserver = null;
    console.log("🧹 Video player visibility monitoring cleaned up");
  }
}

//////////////////////////////
// 5. PANEL DISPLAY UPDATES
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

//////////////////////////////
// 6. LINGQ STATUS PERCENTAGES
//////////////////////////////

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
    'status-known': percentages?.status3_known?.percentage,      // Known (status=3, extended_status=3)
    'status-learned': percentages?.status3_learned?.percentage,  // Learned (status=3, extended_status=0)
    'status-familiar': percentages?.status2?.percentage,         // Familiar (status=2)
    'status-recognized': percentages?.status1?.percentage,       // Recognized (status=1)
    'status-new': percentages?.status0?.percentage,              // New (status=0)
    'status-unseen': percentages?.unseen?.percentage             // Unseen (not in LingQ data)
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

function showPercentageRows() {
  console.log("👁️ showPercentageRows called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-learned',
    'status-familiar', 
    'status-recognized',
    'status-new',
    'status-unseen'
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

function hidePercentageRows() {
  console.log("🙈 hidePercentageRows called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-learned',
    'status-familiar', 
    'status-recognized',
    'status-new',
    'status-unseen'
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

function clearStatusPercentagesDisplay() {
  console.log("🧹 clearStatusPercentagesDisplay called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-learned',
    'status-familiar', 
    'status-recognized',
    'status-new',
    'status-unseen'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = '---';
    }
  });
}

function showStatusPercentagesLoading() {
  console.log("⏳ showStatusPercentagesLoading called");
  
  const statusElements = [
    'total-words',
    'status-known',
    'status-learned',
    'status-familiar', 
    'status-recognized',
    'status-new',
    'status-unseen'
  ];

  statusElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = 'Calculating...';
    }
  });
}

//////////////////////////////
// 7. LINGQ DATA FETCHING
//////////////////////////////

/**
 * Binds the manual LingQ update button functionality.
 * This function sets up the click handler for the update button
 * and manages the button state during the update process.
 * @returns {void}
 */
function bindLingqUpdateButton() {
  const btn = document.getElementById('update-lingq-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Updating...';
    try {
      const cookies = await window.lingqData.getLingqCookies();
      if (!cookies) throw new Error('Not logged in to LingQ');
      const data = await window.lingqData.fetchLingqData(cookies.csrftoken, cookies.wwwlingqcomsa);
      if (!data) throw new Error('API fetch failed');
      await window.lingqData.storeLingqData(data);
      btn.textContent = 'Success!';
      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 1200);
    } catch (e) {
      btn.textContent = 'Error!';
      setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 1800);
    }
  });
}

//////////////////////////////
// 8. GLOBAL EXPORTS & VARIABLES
//////////////////////////////

// Global promise for initial LingQ fetch
window.lingqInitialFetchPromise = null;

// Global reference to the video player visibility observer
let videoPlayerVisibilityObserver = null;

// Make the functions available globally for other modules
window.bindControlPanelListeners = bindControlPanelListeners;
window.initializeControlValues = initializeControlValues;
window.updateSubtitleBackground = updateSubtitleBackground;
window.updateStatusPercentagesDisplay = updateStatusPercentagesDisplay;
window.isPlexVideoPlayerVisible = isPlexVideoPlayerVisible;
window.updateControlPanelVisibility = updateControlPanelVisibility;
window.setupVideoPlayerVisibilityMonitoring = setupVideoPlayerVisibilityMonitoring;
window.cleanupVideoPlayerVisibilityMonitoring = cleanupVideoPlayerVisibilityMonitoring;

