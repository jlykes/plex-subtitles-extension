// === helper_scripts/utils.js ===

// Loads the user's LingQ vocabulary list from the static JSON file bundled with the extension.
// Converts it into a lookup object where each term is mapped to its LingQ status (0=new, 1=learning, 2=known, 3=ignored).
async function loadLingQTerms() {
  const response = await fetch(chrome.runtime.getURL("lingqs.json"));
  const data = await response.json();
  const result = {};
  data.forEach(entry => {
    if (entry.term && typeof entry.status === "number") {
      result[entry.term] = entry.status;
    }
  });
  return result;
}

// Returns a color associated with the LingQ status code.
// These are used for underlining words based on familiarity level.
function getUnderlineColor(status) {
  switch (status) {
    case 3: return null;         // Ignored — no underline
    case 2: return "#fff9c4";    // Known — light yellow
    case 1: return "#fdd835";    // Learning — medium yellow
    case 0: return "#fbc02d";    // New — bold yellow
    default: return "blue";     // Fallback color
  }
}

// Determines whether the given token is punctuation, digits, or whitespace.
// Also filters out special invisible Unicode characters sometimes found in subtitle text.
function isPunctuationDigitOrSpace(token) {
  const invisibleChars = ['‌', '‍', '​', '﻿'];
  return (
    token.trim() === '' ||
    /^[\p{P}\p{S}]+$/u.test(token) ||  // Unicode punctuation or symbols
    /^\d+$/.test(token) ||             // Numeric
    invisibleChars.includes(token)     // Invisible or formatting-only chars
  );
}

// Uses the pinyin-pro library (injected globally) to retrieve the pinyin pronunciation of a word.
// Falls back to "none" if the library fails or is unavailable.
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


// Gets the color of the tone for given pinyin
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


// Attempts to detect the media title from the browser tab.
// If the default Plex title ("Plex") is still set, retries a few times with a delay.
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

// Normalizes a media title into a consistent, file-safe format.
// Cleans leading symbols, removes special characters, and replaces spaces with underscores.
function normalizeTitle(title) {
  return title
    .trim()                                 // Remove leading/trailing whitespace
    .replace(/^▶\s*/, "")                 // Remove leading ▶ character
    .replace(/^Plex.*$/i, "")              // Remove fallback Plex titles
    .replace(/[:]/g, " -")                 // Replace colons with hyphens
    .replace(/[^a-zA-Z0-9\s\-]/g, "")    // Remove unwanted special chars
    .replace(/\s+/g, "_");                // Convert spaces to underscores
}

// Checks whether an enriched JSON subtitle file exists for the given normalized title.
// Used to determine whether to run in preprocessed mode or live subtitle mode.
async function checkEnrichedJSONExists(normalizedTitle) {
  const url = chrome.runtime.getURL(`enriched_subtitles/${normalizedTitle}.enriched.json`);
  try {
    const res = await fetch(url);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Looks for the active Plex video element based on known CSS class
function findPlexVideoElement() {
  return [...document.querySelectorAll("video")].find(el =>
    el.classList.contains("HTMLMedia-mediaElement-u17S9P")
  );
}
