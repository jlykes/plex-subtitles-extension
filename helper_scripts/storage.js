// === helper_scripts/storage.js ===

// This module handles Chrome storage sync for the control panel settings.
// It provides functions to save, load, and manage user preferences across devices.

//////////////////////////////
// 1. DEFAULT SETTINGS
//////////////////////////////

/**
 * Default configuration values for the subtitle overlay.
 * These are used when no saved settings exist or when resetting to defaults.
 * @returns {Object} Default settings object
 */
function getDefaultSettings() {
  return {
    // === Appearance Settings ===
    visibility: "on",
    fontSizeVH: 5.5,
    position: "bottom",
    heightVH: 16,
    lingqStatus: "on",
    pinyin: "unknown-only",
    toneColor: "all",
    translation: "on-hover",
    background: "off",
    backgroundOpacity: 50,

    // === Behavior Settings ===
    useContinuous: true,
    autoPause: false,
    autoPauseDelayMs: 0,
    removeSilences: false,
    minSilenceGapMs: 1000
  };
}

//////////////////////////////
// 2. STORAGE OPERATIONS
//////////////////////////////

/**
 * Saves the current settings to Chrome storage sync.
 * @param {Object} settings - The settings object to save
 * @returns {Promise<void>}
 */
function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    // Check if Chrome storage is available
    if (!chrome.storage || !chrome.storage.sync) {
      console.warn('Chrome storage not available, using fallback');
      // Store in localStorage as fallback
      try {
        localStorage.setItem('subtitleSettings', JSON.stringify(settings));
        resolve();
      } catch (error) {
        reject(error);
      }
      return;
    }

    chrome.storage.sync.set({ subtitleSettings: settings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Settings saved successfully');
        resolve();
      }
    });
  });
}

/**
 * Loads settings from Chrome storage sync with fallback to defaults.
 * @returns {Promise<Object>} The loaded settings object
 */
function loadSettings() {
  return new Promise((resolve, reject) => {
    // Check if Chrome storage is available
    if (!chrome.storage || !chrome.storage.sync) {
      console.warn('Chrome storage not available, using localStorage fallback');
      try {
        const savedSettings = localStorage.getItem('subtitleSettings');
        const defaultSettings = getDefaultSettings();
        
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          const mergedSettings = { ...defaultSettings, ...parsedSettings };
          console.log('Settings loaded from localStorage');
          resolve(mergedSettings);
        } else {
          console.log('No saved settings found, using defaults');
          resolve(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        resolve(getDefaultSettings());
      }
      return;
    }

    chrome.storage.sync.get(['subtitleSettings'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        const savedSettings = result.subtitleSettings;
        const defaultSettings = getDefaultSettings();
        
        if (savedSettings) {
          // Merge saved settings with defaults to handle missing properties
          const mergedSettings = { ...defaultSettings, ...savedSettings };
          console.log('Settings loaded from storage');
          resolve(mergedSettings);
        } else {
          console.log('No saved settings found, using defaults');
          resolve(defaultSettings);
        }
      }
    });
  });
}

/**
 * Resets all settings to their default values.
 * @returns {Promise<void>}
 */
function resetSettings() {
  return new Promise((resolve, reject) => {
    const defaultSettings = getDefaultSettings();
    
    // Check if Chrome storage is available
    if (!chrome.storage || !chrome.storage.sync) {
      console.warn('Chrome storage not available, using localStorage fallback');
      try {
        localStorage.setItem('subtitleSettings', JSON.stringify(defaultSettings));
        console.log('Settings reset to defaults (localStorage)');
        resolve();
      } catch (error) {
        reject(error);
      }
      return;
    }

    chrome.storage.sync.set({ subtitleSettings: defaultSettings }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error resetting settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Settings reset to defaults');
        resolve();
      }
    });
  });
}

/**
 * Clears all stored settings from Chrome storage.
 * @returns {Promise<void>}
 */
function clearSettings() {
  return new Promise((resolve, reject) => {
    // Check if Chrome storage is available
    if (!chrome.storage || !chrome.storage.sync) {
      console.warn('Chrome storage not available, using localStorage fallback');
      try {
        localStorage.removeItem('subtitleSettings');
        console.log('Settings cleared from localStorage');
        resolve();
      } catch (error) {
        reject(error);
      }
      return;
    }

    chrome.storage.sync.remove(['subtitleSettings'], () => {
      if (chrome.runtime.lastError) {
        console.error('Error clearing settings:', chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
      } else {
        console.log('Settings cleared from storage');
        resolve();
      }
    });
  });
}

//////////////////////////////
// 3. SETTINGS MANAGEMENT
//////////////////////////////

/**
 * Updates a specific setting and saves it to storage.
 * @param {string} key - The setting key to update
 * @param {*} value - The new value for the setting
 * @returns {Promise<void>}
 */
async function updateSetting(key, value) {
  try {
    const currentSettings = await loadSettings();
    currentSettings[key] = value;
    await saveSettings(currentSettings);
    
    // Update the global config object
    if (window.subtitleConfig) {
      window.subtitleConfig[key] = value;
    }
    
    console.log(`Setting updated: ${key} = ${value}`);
  } catch (error) {
    console.error('Error updating setting:', error);
    throw error;
  }
}

/**
 * Initializes the global subtitle config with saved settings.
 * This should be called when the extension starts.
 * @returns {Promise<void>}
 */
async function initializeSettings() {
  try {
    const settings = await loadSettings();
    
    // Initialize the global config object
    window.subtitleConfig = settings;
    
    console.log('Settings initialized:', settings);
  } catch (error) {
    console.error('Error initializing settings:', error);
    // Fallback to defaults
    window.subtitleConfig = getDefaultSettings();
  }
}

/**
 * Exports current settings as a JSON string for backup/transfer.
 * @returns {Promise<string>} JSON string of current settings
 */
async function exportSettings() {
  try {
    const settings = await loadSettings();
    return JSON.stringify(settings, null, 2);
  } catch (error) {
    console.error('Error exporting settings:', error);
    throw error;
  }
}

/**
 * Imports settings from a JSON string.
 * @param {string} jsonString - JSON string containing settings
 * @returns {Promise<void>}
 */
async function importSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    await saveSettings(settings);
    
    // Update the global config object
    window.subtitleConfig = settings;
    
    console.log('Settings imported successfully');
  } catch (error) {
    console.error('Error importing settings:', error);
    throw error;
  }
}

//////////////////////////////
// 4. STORAGE CHANGE LISTENER
//////////////////////////////

/**
 * Sets up a listener for storage changes to sync settings across extension parts.
 * @param {Function} callback - Function to call when settings change
 * @returns {void}
 */
function setupStorageChangeListener(callback) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.subtitleSettings) {
      const newSettings = changes.subtitleSettings.newValue;
      if (newSettings) {
        // Update global config
        window.subtitleConfig = newSettings;
        
        // Call the callback to update UI
        if (callback && typeof callback === 'function') {
          callback(newSettings);
        }
        
        console.log('Settings updated from storage change');
      }
    }
  });
}

// Export functions for use in other modules
window.storageUtils = {
  getDefaultSettings,
  saveSettings,
  loadSettings,
  resetSettings,
  clearSettings,
  updateSetting,
  initializeSettings,
  exportSettings,
  importSettings,
  setupStorageChangeListener
}; 