// === helper_scripts/utils.js ===
// This module contains utility functions used across the extension,
// such as loading LingQ terms, normalizing titles, and creating styled word spans.

const CHINESE_FONT_KAITI_STACK = "'KaiTi-Web', 'KaiTi', 'KaiTi_GB2312', 'Kaiti SC', 'STKaiti', 'DFKai-SB', serif";
const CHINESE_FONT_SYSTEM_SANS_STACK = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', 'Source Han Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const LATIN_UI_FONT_STACK = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

function getChineseFontChoice() {
  return window.subtitleConfig?.chineseFont || "system-sans";
}

function getChineseFontFamily() {
  return getChineseFontChoice() === "kaiti"
    ? CHINESE_FONT_KAITI_STACK
    : CHINESE_FONT_SYSTEM_SANS_STACK;
}

function applyChineseFontToOverlay() {
  const fontFamily = getChineseFontFamily();
  const overlay = document.getElementById("custom-subtitle-overlay");
  if (overlay) overlay.style.fontFamily = fontFamily;
  document.querySelectorAll(".char-mining-drawer-host").forEach((host) => {
    host.style.setProperty("--plex-chinese-font", fontFamily);
  });
}

window.getChineseFontFamily = getChineseFontFamily;
window.applyChineseFontToOverlay = applyChineseFontToOverlay;

function isSingleChineseCharacter(term) {
  return /^[\u4e00-\u9fff]$/.test(String(term || ""));
}

function isKnownSingleCharacterStatus(statusInfo) {
  if (!statusInfo || typeof statusInfo !== "object") return false;
  return statusInfo.status === -1 || statusInfo.status === 3;
}

function rebuildKnownSingleCharWords(lingqTerms = window.lingqTerms || {}) {
  const knownChars = new Set();
  Object.entries(lingqTerms || {}).forEach(([term, info]) => {
    if (isSingleChineseCharacter(term) && isKnownSingleCharacterStatus(info)) {
      knownChars.add(term);
    }
  });
  window.knownSingleCharWords = knownChars;
  console.log(`[LingQ] Known single-character cache rebuilt (${knownChars.size} chars)`);
  return knownChars;
}

function getKnownSingleCharWords() {
  if (!(window.knownSingleCharWords instanceof Set)) {
    return rebuildKnownSingleCharWords();
  }
  return window.knownSingleCharWords;
}

function syncKnownSingleCharWord(term, statusInfo) {
  if (!isSingleChineseCharacter(term)) return;
  const knownChars = getKnownSingleCharWords();
  if (isKnownSingleCharacterStatus(statusInfo)) {
    knownChars.add(term);
  } else {
    knownChars.delete(term);
  }
}

window.rebuildKnownSingleCharWords = rebuildKnownSingleCharWords;
window.getKnownSingleCharWords = getKnownSingleCharWords;
window.syncKnownSingleCharWord = syncKnownSingleCharWord;

/**
 * Returns the underline color based on the LingQ status code
 * @param {Object} statusInfo The LingQ status info object with status and extended_status properties
 * @param {string} word The word to check if it's Chinese
 * @returns {string|null} The hex color code for the underline, or null if no underline should be applied
 */
function getUnderlineColor(statusInfo, word) {
  // Only underline if the word is Chinese
  if (word && !isChineseWord(word)) return null;
  
  // Check if statusInfo is valid
  if (!statusInfo || typeof statusInfo !== 'object') return null;
  
  // Extract status and extended_status from the status info object
  const status = statusInfo.status;
  const extended_status = statusInfo.extended_status;
  
  switch (status) {
    case -1:
      return null; // No underline for Ignored
    case 3:
      // Differentiate between "Known" and "Learned" based on extended_status
      if (extended_status === 0 || extended_status === null) {
        return "rgba(128, 128, 128, 0.3)"; // Light gray, somewhat transparent for "Learned"
      } else {
        return null; // No underline for "Known" (status=3, extended_status=3)
      }
    case 2: return "rgba(255,230,0,0.2)";    // Familiar — light yellow
    case 1: return "rgba(255,230,0,0.5)";    // Learning — medium yellow
    case 0: return "#ffe600";    // New — bold yellow
    default: return "blue";     // Fallback color
  }
}

function applyWordUnderlineStyle(element, underlineColor) {
  if (!element || !element.style) return;

  element.style.borderBottom = "";

  if (!underlineColor) {
    element.style.backgroundImage = "";
    element.style.backgroundRepeat = "";
    element.style.backgroundSize = "";
    element.style.backgroundPosition = "";
    element.style.paddingBottom = "";
    element.style.borderRadius = "";
    return;
  }

  Object.assign(element.style, {
    backgroundImage: `linear-gradient(${underlineColor}, ${underlineColor})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 0.1em",
    backgroundPosition: "0 100%",
    paddingBottom: "2px",
    borderRadius: "0.05em",
  });
}

window.applyWordUnderlineStyle = applyWordUnderlineStyle;

/**
 * Checks if a token is punctuation, a digit, or whitespace.
 * This is useful for filtering out non-content tokens in subtitles.
 * @param {*} token The token to check, typically a word or character from subtitles
 * @returns {boolean} True if the token is punctuation, a digit, or whitespace, false otherwise
 */
function isPunctuationDigitOrSpace(token) {
  const invisibleChars = ['‌', '‍', '​', '﻿'];
  return (
    token.trim() === '' ||
    /^[\p{P}\p{S}]+$/u.test(token) ||  // Unicode punctuation or symbols
    /^\d+$/.test(token) ||             // Numeric
    invisibleChars.includes(token)     // Invisible or formatting-only chars
  );
}

/**
 * Uses the pinyin-pro library to convert a Chinese word or character to pinyin.
 * If the library is not available or conversion fails, returns "none".
 * @param {*} word The Chinese word or character to convert to pinyin
 * @returns {string} The pinyin representation of the word, or "none" if conversion fails
 */
function getPinyin(word) {
  if (window.pinyin) {
    try {
      return window.pinyin(word, { toneType: 'symbol', type: 'array' }).join(' ');
    } catch (e) {
      console.error('Pinyin error:', e);
      return "none";
    }
  }
  return "none";
}

/**
 * Gets the color associated with the tone of a given pinyin string.
 * @param {*} pinyin The pinyin string with tone marks
 * @returns {string} The hex color code representing the tone
 */
function getToneColor(pinyin) {
  const toneMatch = pinyin.match(/[āēīōūǖ]|[áéíóúǘ]|[ǎěǐǒǔǚ]|[àèìòùǜ]/);
  const tone = toneMatch
    ? {
        "āēīōūǖ": 1,
        "áéíóúǘ": 2,
        "ǎěǐǒǔǚ": 3,
        "àèìòùǜ": 4,
      }[Object.keys({
        "āēīōūǖ": 1,
        "áéíóúǘ": 2,
        "ǎěǐǒǔǚ": 3,
        "àèìòùǜ": 4,
      }).find(key => key.includes(toneMatch[0]))] || 5
    : 5;

  switch (tone) {
    case 1: return "#f8c2c2"; // tone 1: soft red
    case 2: return "#f8f2b2"; // tone 2: muted yellow
    case 3: return "#baf5c6"; // tone 3: pastel green
    case 4: return "#a8d2f0"; // tone 4: sky blue
    default: return "#dddddd"; // neutral tone: light gray
  }
}

/**
 * Attempts to detect the media title from the browser tab.
 * If the default Plex title ("Plex") is still set, retries a few times with a delay.
 * This is useful for cases where the title may not be immediately available
 * (e.g. when the page is still loading or the title is dynamically set).
 * @param {*} maxRetries The maximum number of retries to detect the title
 * @param {*} delay The delay in milliseconds between retries
 * @returns {string|null} The detected media title, or null if it could not be detected
 */
async function detectMediaTitleWithRetry(maxRetries = 20, delay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const title = document.title.trim();
    if (title && title !== "Plex") {
      return title;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return null;  // Could not detect title in time
}

/**
 * Normalizes a media title for use in file names or URLs.
 * This function removes leading whitespace, special characters,
 * and converts spaces to underscores. It also removes the leading ▶ character
 * and any fallback Plex titles that may be present.
 * @param {*} title The media title to normalize
 * @returns {string} The normalized title suitable for file names or URLs
 */
function normalizeTitle(title) {
  return title
    .trim()                                 // Remove leading/trailing whitespace
    .replace(/^▶\s*/, "")                 // Remove leading ▶ character
    .replace(/^Plex.*$/i, "")              // Remove fallback Plex titles
    .replace(/[:]/g, " -")                 // Replace colons with hyphens
    .replace(/\s+/g, "_")                 // Convert spaces to underscores
    .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ".") // Replace Chinese characters and fullwidth punctuation with dots
    .replace(/[#]/g, "")                  // Remove hash symbols (URL fragment identifiers)
    .replace(/[—'&,’]/g, "_");             // Replace em dash, apostrophe, ampersand, comma, and curly apostrophe with underscores
}

/**
 * Checks if the enriched JSON file for the given normalized title exists.
 * This is used to determine if preprocessed subtitles are available for the current media.
 * It fetches the file from the extension's URL and checks the response status.
 * If the file exists, it returns true; otherwise, it returns false.
 * @param {*} normalizedTitle The normalized title of the media, used to construct the file path
 * @returns True if the enriched JSON file exists, false otherwise
 */
async function checkEnrichedJSONExists(normalizedTitle) {
  const url = chrome.runtime.getURL(`enriched_subtitles/${normalizedTitle}.enriched.json`);
  console.log("🔍 Checking for enriched JSON at URL:", url);
  try {
    const res = await fetch(url);
    console.log("📄 Response status:", res.status, res.ok ? "✅ Found" : "❌ Not found");
    return res.ok;
  } catch (e) {
    console.log("❌ Error fetching enriched JSON:", e);
    return false;
  }
}

/**
 * Looks for the active Plex video element in the DOM.
 * @returns {HTMLElement|null} The video element if found, or null if not
 */
function findPlexVideoElement() {
  return [...document.querySelectorAll("video")].find(el =>
    el.classList.contains("HTMLMedia-mediaElement-u17S9P")
  );
}

/**
 * Returns true if the word contains at least one Chinese character.
 * @param {string} word
 * @returns {boolean}
 */
function isChineseWord(word) {
  return /[\u4e00-\u9fff]/.test(word);
}

/**
 * Determines if a word is considered "known" based on its LingQ status.
 * A word is "known" if it has status=3 (regardless of extended_status).
 * @param {Object} statusInfo - The LingQ status object with status and extended_status properties
 * @returns {boolean} True if the word is known, false otherwise
 */
function isKnownWord(statusInfo) {
  // Check if statusInfo is valid
  if (!statusInfo || typeof statusInfo !== 'object') return false;
  
  return statusInfo.status === 3;
}

function shouldShowPinyinForCharacter(char, word, statusInfo, knownSingleChars, pinyinMode) {
  const chineseOnly = (String(word || "").match(/[\u4e00-\u9fff]+/g) || []).join("");
  if (!/[\u4e00-\u9fff]/.test(char)) return false;
  if (!chineseOnly) return false;

  const tags = Array.isArray(statusInfo?.tags) ? statusInfo.tags : [];
  if (tags.includes("characters known")) return false;
  if (statusInfo?.status === -1) return false;
  if (statusInfo?.status === 3 && statusInfo.extended_status === 3) return false;
  if (knownSingleChars && knownSingleChars.has(char)) return false;

  if (pinyinMode === "all") return true;
  if (pinyinMode !== "unknown-only") return false;

  return true;
}

/**
 * Creates a fully styled and annotated word span for a subtitle line.
 * Includes optional pinyin ruby, tone coloring, underlining by LingQ status,
 * and a hoverable tooltip showing word meaning.
 * @param {Object} opts
 * @param {string} opts.word - The raw Chinese word or character
 * @param {string} opts.pinyin - The pinyin with tone marks (space-separated for multi-char words)
 * @param {Object} opts.status - The LingQ status object with status and extended_status properties
 * @param {string} opts.meaning - Definition or explanation for tooltip display
 * @returns {HTMLElement} A styled span or ruby wrapper element
 */
function createWordWrapper({ word, pinyin, status, meaning }) {
  const config = window.subtitleConfig || {};
  const isPunct = isPunctuationDigitOrSpace(word);

  // === Strip non-Chinese characters for LingQ lookup ===
  const chineseOnly = (word.match(/[\u4e00-\u9fff]+/g) || []).join('');
  
  // === Determine settings from global subtitle config ===
  // Handle words not in LingQ data - they should be underlined in blue
  let underlineColor = null;
  if (config.lingqStatus === "on" && !isPunct && isChineseWord(word)) {
    // Use the Chinese-only version for LingQ lookup
    const lingqStatus = window.lingqTerms[chineseOnly];
    if (lingqStatus) {
      // Word is in LingQ data, use its status
      underlineColor = getUnderlineColor(lingqStatus, word);
    } else {
      // Word is not in LingQ data, underline in blue
      underlineColor = "blue";
    }
  }

  const shouldColor =
    config.toneColor === "all" ||
    (config.toneColor === "unknown-only" && (!status || !isKnownWord(status)));

  // === Split characters and corresponding pinyin ===
  const charList = [...word]; // Split Chinese word into characters
  const pinyinList = (pinyin || "").split(" "); // One pinyin per char
  const knownSingleChars = getKnownSingleCharWords();

  // === Create wrapper for the full word ===
  const wrapper = document.createElement("span");
  wrapper.classList.add("subtitle-word");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  // === Add underline if applicable ===
  applyWordUnderlineStyle(wrapper, underlineColor);

  // === Add tooltip (hover definition), if present ===
  if (meaning) {
    const tooltip = document.createElement("div");
    tooltip.textContent = meaning;

    Object.assign(tooltip.style, {
      position: "absolute",
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "4px 8px",
      backgroundColor: "#222",
      color: "#fff",
      fontSize: "0.5em",
      borderRadius: "4px",
      whiteSpace: "normal",
      boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
      display: "none",
      zIndex: "1000",
      maxWidth: "200px",
      textAlign: "left"
    });

    wrapper.addEventListener("mouseenter", () => {
      tooltip.style.display = "block";
    });
    wrapper.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    wrapper.appendChild(tooltip);
  }

  // === Render each character with pinyin and tone color if needed ===
  charList.forEach((char, i) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.margin = "0";
    if (/[^\u0000-\u007F]/.test(char) && /[\u4e00-\u9fff]/.test(char)) {
      span.style.fontFamily = getChineseFontFamily();
    }

    const toneColor = shouldColor && pinyinList[i] ? getToneColor(pinyinList[i]) : "white";
    span.style.color = toneColor;

    const shouldShowCharPinyin =
      !isPunct &&
      shouldShowPinyinForCharacter(char, word, status, knownSingleChars, config.pinyin) &&
      Boolean(pinyinList[i]);

    if (shouldShowCharPinyin) {
      const ruby = document.createElement("ruby");
      const rt = document.createElement("rt");
      rt.textContent = pinyinList[i] || "";
      rt.style.color = toneColor;
      rt.style.fontFamily = LATIN_UI_FONT_STACK;

      ruby.appendChild(span);
      ruby.appendChild(rt);
      wrapper.appendChild(ruby);
    } else {
      wrapper.appendChild(span);
    }
  });

  return wrapper;
}

/**
 * Extracts all word occurrences from enriched subtitle data.
 * Works with the enriched JSON structure that contains segmented words.
 * @param {Array} subtitleData - Array of enriched subtitle objects
 * @returns {Array<string>} Array of all word occurrences (not unique)
 */
function extractAllWordsFromSubtitles(subtitleData) {
  const allWords = [];
  
  if (!subtitleData || !Array.isArray(subtitleData)) {
    return allWords;
  }

  // Iterate through each subtitle in the enriched JSON
  subtitleData.forEach(subtitle => {
    // Extract words from the segmented array (enriched JSON format)
    if (subtitle.segmented && Array.isArray(subtitle.segmented)) {
      subtitle.segmented.forEach(segment => {
        // Only include words that contain at least one Chinese character
        if (segment.word && isChineseWord(segment.word)) {
          allWords.push(segment.word);
        }
      });
    }
  });

  return allWords;
}

/**
 * Gets the LingQ status for a specific word.
 * @param {string} word - The word to look up
 * @param {Object} lingqTerms - Object mapping terms to their LingQ status info
 * @returns {number} The LingQ status (0, 1, 2, or 3), defaults to 0 if not found
 */
function getLingQStatusForWord(word, lingqTerms) {
  if (!lingqTerms || !word) {
    return 0; // Default to new status
  }
  
  // Direct lookup in LingQ terms
  if (lingqTerms.hasOwnProperty(word)) {
    const statusInfo = lingqTerms[word];
    // Check if statusInfo is valid and has a status property
    if (statusInfo && typeof statusInfo === 'object' && typeof statusInfo.status === 'number') {
      return statusInfo.status;
    }
    // If statusInfo is invalid, return 0 (new status)
    return 0;
  }
  
  // If not found, return 0 (new status)
  return 0;
}

/**
 * Calculates percentage breakdown of words by LingQ status, including 'unseen' (not in LingQ data).
 * Now differentiates between "Known" (status=3, extended_status=3) and "Learned" (status=3, extended_status=0).
 * @param {Array} subtitleData - Array of enriched subtitle objects
 * @param {Object} lingqTerms - Object mapping terms to their LingQ status info
 * @returns {Object} Object containing counts and percentages for each status and unseen
 */
function calculateLingQStatusPercentages(subtitleData, lingqTerms) {
  // Extract all word occurrences from enriched subtitle data
  const allWords = extractAllWordsFromSubtitles(subtitleData);
  const totalWords = allWords.length;
  
  if (totalWords === 0) {
    return {
      totalWords: 0,
      status3_known: { percentage: 0, count: 0 },    // Known (status=3, extended_status=3)
      status3_learned: { percentage: 0, count: 0 },  // Learned (status=3, extended_status=0)
      status2: { percentage: 0, count: 0 },          // Familiar  
      status1: { percentage: 0, count: 0 },          // Recognized
      status0: { percentage: 0, count: 0 },          // New
      unseen:  { percentage: 0, count: 0 }           // Unseen (not in LingQ data)
    };
  }

  // Initialize counters for each status and unseen
  const statusCounts = { 
    0: 0, 
    1: 0, 
    2: 0, 
    '3_known': 0,    // status=3, extended_status=3
    '3_learned': 0,  // status=3, extended_status=0
    ignored: 0,      // status=-1
    unseen: 0        // Words not found in LingQ data
  };

  // Count each word occurrence by its LingQ status or as unseen
  allWords.forEach(word => {
    if (lingqTerms && lingqTerms.hasOwnProperty(word)) {
      const statusInfo = lingqTerms[word];
      const status = statusInfo.status;
      const extended_status = statusInfo.extended_status;
      if (status === -1) {
        statusCounts.ignored++;
      } else if (status === 3) {
        if (extended_status === 0 || extended_status === null) {
          statusCounts['3_learned']++;
        } else {
          statusCounts['3_known']++;
        }
      } else if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts[0]++;
      }
    } else {
      statusCounts.unseen++;
    }
  });

  // Calculate percentages and format output
  const result = {
    totalWords: totalWords,
    status3_known: { 
      percentage: Math.round((statusCounts['3_known'] / totalWords) * 100), 
      count: statusCounts['3_known'] 
    },
    status3_learned: { 
      percentage: Math.round((statusCounts['3_learned'] / totalWords) * 100), 
      count: statusCounts['3_learned'] 
    },
    status2: { 
      percentage: Math.round((statusCounts[2] / totalWords) * 100), 
      count: statusCounts[2] 
    },
    status1: { 
      percentage: Math.round((statusCounts[1] / totalWords) * 100), 
      count: statusCounts[1] 
    },
    status0: { 
      percentage: Math.round((statusCounts[0] / totalWords) * 100), 
      count: statusCounts[0] 
    },
    ignored: {
      percentage: Math.round((statusCounts.ignored / totalWords) * 100),
      count: statusCounts.ignored
    },
    unseen: {
      percentage: Math.round((statusCounts.unseen / totalWords) * 100),
      count: statusCounts.unseen
    }
  };

  return result;
}

/**
 * Formats a percentage value for display (no decimals).
 * @param {number} value - The percentage value
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    return '---';
  }
  return `${value}%`;
}

/**
 * Calculates the skip trigger time for remove silences feature.
 * Uses the auto-pause threshold to ensure user hears the entire subtitle.
 * @param {number} subtitleEndTime - The end time of the current subtitle
 * @param {number} autoPauseThreshold - The auto-pause threshold in milliseconds
 * @returns {number} The time when skip should trigger
 */
function calculateSkipTriggerTime(subtitleEndTime, autoPauseThreshold) {
  if (typeof subtitleEndTime !== 'number' || isNaN(subtitleEndTime)) {
    return 0;
  }
  
  // Convert auto-pause threshold from milliseconds to seconds
  const thresholdInSeconds = (autoPauseThreshold || 0) / 1000;
  
  return subtitleEndTime + thresholdInSeconds;
}

/**
 * Determines if current playback should skip to next subtitle.
 * @param {number} currentTime - Current video time in seconds
 * @param {Object} currentSubtitle - Current subtitle object with start/end times
 * @param {Object} nextSubtitle - Next subtitle object with start time
 * @param {boolean} removeSilencesEnabled - Whether remove silences mode is enabled
 * @param {number} autoPauseThreshold - Auto-pause threshold in milliseconds
 * @returns {Object} Object containing skip decision and next subtitle time
 */
function shouldSkipToNextSubtitle(currentTime, currentSubtitle, nextSubtitle, removeSilencesEnabled, autoPauseThreshold) {
  // If remove silences is disabled, don't skip
  if (!removeSilencesEnabled) {
    return {
      shouldSkip: false,
      nextSubtitleTime: 0,
      skipReason: "disabled"
    };
  }

  // If no current subtitle or invalid timing, don't skip
  if (!currentSubtitle || typeof currentSubtitle.end !== 'number') {
    return {
      shouldSkip: false,
      nextSubtitleTime: 0,
      skipReason: "no_current_subtitle"
    };
  }

  // If no next subtitle, don't skip (end of video)
  if (!nextSubtitle || typeof nextSubtitle.start !== 'number') {
    return {
      shouldSkip: false,
      nextSubtitleTime: 0,
      skipReason: "no_next_subtitle"
    };
  }

  // Calculate the silence gap between current and next subtitle
  const silenceGapMs = (nextSubtitle.start - currentSubtitle.end) * 1000; // Convert to milliseconds
  
  // Get minimum silence gap threshold from config
  const minSilenceGapMs = window.subtitleConfig?.minSilenceGapMs || 1000;
  
  // If silence gap is too small, don't skip
  if (silenceGapMs < minSilenceGapMs) {
    return {
      shouldSkip: false,
      nextSubtitleTime: nextSubtitle.start,
      skipReason: "gap_too_small",
      silenceGapMs: silenceGapMs,
      minSilenceGapMs: minSilenceGapMs
    };
  }

  // Check if auto-pause is enabled and we're within the auto-pause window
  // If so, don't skip to allow auto-pause to execute at the correct location
  if (window.subtitleConfig?.autoPause) {
    const autoPauseDelayMs = window.subtitleConfig.autoPauseDelayMs || 0;
    const autoPauseDelaySec = autoPauseDelayMs / 1000;
    const timeSinceSubtitleEnd = currentTime - currentSubtitle.end;
    
    // DEBUG: Log auto-pause window check
    console.log("🔍 Auto-pause window check:", {
      currentTime: currentTime.toFixed(2),
      subtitleEnd: currentSubtitle.end.toFixed(2),
      timeSinceSubtitleEnd: timeSinceSubtitleEnd.toFixed(2),
      autoPauseDelaySec: autoPauseDelaySec,
      windowEnd: (autoPauseDelaySec + 0.5).toFixed(2),
      withinWindow: timeSinceSubtitleEnd >= 0 && timeSinceSubtitleEnd <= autoPauseDelaySec + 0.5
    });
    
    // If we're within the auto-pause window, don't skip
    if (timeSinceSubtitleEnd >= 0 && timeSinceSubtitleEnd <= autoPauseDelaySec + 0.5) {
      return {
        shouldSkip: false,
        nextSubtitleTime: nextSubtitle.start,
        skipReason: "auto_pause_window",
        silenceGapMs: silenceGapMs,
        timeSinceSubtitleEnd: timeSinceSubtitleEnd.toFixed(2),
        autoPauseDelaySec: autoPauseDelaySec
      };
    }
  }

  // Calculate when we should trigger the skip
  const skipTriggerTime = calculateSkipTriggerTime(currentSubtitle.end, autoPauseThreshold);
  
  // DEBUG: Log skip calculation
  console.log("🔍 Skip Calculation:", {
    currentTime: currentTime.toFixed(2),
    subtitleEnd: currentSubtitle.end.toFixed(2),
    autoPauseThreshold: autoPauseThreshold,
    skipTriggerTime: skipTriggerTime.toFixed(2),
    silenceGapMs: silenceGapMs.toFixed(0),
    minSilenceGapMs: minSilenceGapMs,
    autoPauseEnabled: window.subtitleConfig?.autoPause || false,
    shouldSkip: currentTime >= skipTriggerTime
  });
  
  // Check if current time has reached or passed the skip trigger time
  if (currentTime >= skipTriggerTime) {
    return {
      shouldSkip: true,
      nextSubtitleTime: nextSubtitle.start,
      skipReason: "end_of_subtitle_plus_threshold",
      silenceGapMs: silenceGapMs
    };
  }

  return {
    shouldSkip: false,
    nextSubtitleTime: nextSubtitle.start,
    skipReason: "not_yet_time",
    silenceGapMs: silenceGapMs
  };
}

/**
 * Finds the start time of the next subtitle segment.
 * @param {number} currentIndex - Current subtitle index
 * @param {Array} subtitleData - Array of subtitle objects
 * @returns {Object} Object containing next subtitle info
 */
function getNextSubtitleTime(currentIndex, subtitleData) {
  if (!subtitleData || !Array.isArray(subtitleData) || currentIndex < 0) {
    return {
      found: false,
      nextTime: 0,
      nextIndex: -1
    };
  }

  // Look for the next subtitle with a different start time
  for (let i = currentIndex + 1; i < subtitleData.length; i++) {
    const nextSubtitle = subtitleData[i];
    if (nextSubtitle && typeof nextSubtitle.start === 'number') {
      return {
        found: true,
        nextTime: nextSubtitle.start,
        nextIndex: i
      };
    }
  }

  // No next subtitle found (end of video)
  return {
    found: false,
    nextTime: 0,
    nextIndex: -1
  };
}

// Make the functions available globally for other modules
window.formatPercentage = formatPercentage;
window.calculateSkipTriggerTime = calculateSkipTriggerTime;
window.shouldSkipToNextSubtitle = shouldSkipToNextSubtitle;
window.getNextSubtitleTime = getNextSubtitleTime;
