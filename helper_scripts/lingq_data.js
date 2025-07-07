// === helper_scripts/lingq_data.js ===
// Handles LingQ API fetch/store logic, cookie handling, auto-fetch interval, and storage change listener setup.

/**
 * Requests csrftoken and wwwlingqcomsa cookies for lingq.com from the background script.
 * @returns {Promise<{csrftoken: string, wwwlingqcomsa: string}|null>}
 */
async function getLingqCookies() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getLingqCookies' }, (response) => {
      resolve(response);
    });
  });
}

/**
 * Requests the LingQ vocabulary data from the API via the background script.
 * @param {string} csrftoken
 * @param {string} wwwlingqcomsa
 * @returns {Promise<Object|null>} The LingQ data or null on failure
 */
async function fetchLingqData(csrftoken, wwwlingqcomsa) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'fetchLingqData',
        csrftoken,
        wwwlingqcomsa
      },
      (response) => {
        if (response && response.data) {
          resolve(response.data);
        } else {
          console.error('[LingQ] fetchLingqData error:', response && response.error);
          resolve(null);
        }
      }
    );
  });
}

/**
 * Stores LingQ data in chrome.storage.local under the key 'lingqs'.
 * @param {Object} data
 * @returns {Promise<void>}
 */
async function storeLingqData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ lingqs: data }, () => {
      resolve();
    });
  });
}

/**
 * Sets up automatic periodic fetching of LingQ data. Default: 1 minute.
 * Calls getLingqCookies, fetchLingqData, and storeLingqData in sequence.
 * @param {number} intervalMs
 * @returns {number} The interval ID
 */
function startLingqAutoFetch(intervalMs = 60000) {
  async function fetchAndStoreLingqData() {
    const cookies = await getLingqCookies();
    if (!cookies) {
      console.warn("Could not get LingQ cookies. User may not be logged in.");
      return;
    }
    const data = await fetchLingqData(cookies.csrftoken, cookies.wwwlingqcomsa);
    if (data) {
      await storeLingqData(data);
      console.log(`[LingQ] Auto-fetch: Data updated in chrome.storage.local at ${new Date().toLocaleTimeString()}`);
    } else {
      console.warn("Failed to fetch LingQ data from API.");
    }
  }
  // Fetch once immediately
  fetchAndStoreLingqData();
  // Set up interval
  return setInterval(fetchAndStoreLingqData, intervalMs);
}

/**
 * Sets up a chrome.storage.onChanged listener for LingQ data changes.
 * @param {function} onChange - Callback to run when LingQ data changes
 */
function setupLingqStorageListener(onChange) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lingqs) {
      onChange();
    }
  });
}

/**
 * Loads the LingQ vocabulary terms from chrome.storage.local if available,
 * otherwise falls back to the bundled JSON file.
 * The JSON should be structured as an array of objects with "term" and "status" properties.
 * @returns {Promise<Object>} A promise that resolves to an object mapping terms to their LingQ status
 */
async function loadLingQTerms() {
  // Try to load from chrome.storage.local first
  const localData = await new Promise(resolve => {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('lingqs', (result) => {
        console.log('[DEBUG] lingqs in storage:', result.lingqs);
        resolve(result.lingqs || null);
      });
    } else {
      resolve(null);
    }
  });

  let data;
  if (localData && Array.isArray(localData)) {
    console.log('[LingQ] Loaded LingQ terms from chrome.storage.local');
    data = localData;
  } else {
    console.log('[LingQ] Loaded LingQ terms from bundled lingqs.json');
    const response = await fetch(chrome.runtime.getURL("lingqs.json"));
    data = await response.json();
  }

  const result = {};
  data.forEach(entry => {
    if (entry.term && typeof entry.status === "number") {
      result[entry.term] = entry.status;
    }
  });
  return result;
}

// Export functions for use in control.js
window.lingqData = {
  getLingqCookies,
  fetchLingqData,
  storeLingqData,
  startLingqAutoFetch,
  setupLingqStorageListener,
  loadLingQTerms
}; 