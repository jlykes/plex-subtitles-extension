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

/**
 * Creates a fully styled and annotated word span for a subtitle line.
 * Includes optional pinyin ruby, tone coloring, underlining by LingQ status,
 * and a hoverable tooltip showing word meaning.
 *
 * @param {Object} opts
 * @param {string} opts.word - The raw Chinese word or character
 * @param {string} opts.pinyin - The pinyin with tone marks (space-separated for multi-char words)
 * @param {number} opts.status - The LingQ status (0=new, 1=learning, 2=known, 3=ignored)
 * @param {string} opts.meaning - Definition or explanation for tooltip display
 * @returns {HTMLElement} A styled span or ruby wrapper element
 */
function createWordWrapper({ word, pinyin, status, meaning }) {
  const config = window.subtitleConfig || {};
  const isPunct = isPunctuationDigitOrSpace(word);

  // === Determine settings from global subtitle config ===
  const underlineColor =
    config.lingqStatus === "on" && !isPunct ? getUnderlineColor(status) : null;

  const shouldColor =
    config.toneColor === "all" ||
    (config.toneColor === "unknown-only" && status !== 3);

  const shouldShowPinyin =
    config.pinyin === "all" ||
    (config.pinyin === "unknown-only" && status !== 3);

  
  // === Split characters and corresponding pinyin ===
  const charList = [...word]; // Split Chinese word into characters
  const pinyinList = (pinyin || "").split(" "); // One pinyin per char

  // === Create wrapper for the full word ===
  const wrapper = document.createElement("span");
  wrapper.style.position = "relative";
  wrapper.style.display = "inline-block";

  // === Add underline if applicable ===
  if (underlineColor) {
    wrapper.style.borderBottom = `0.1em solid ${underlineColor}`;
    wrapper.style.paddingBottom = "2px";
    wrapper.style.borderRadius = "0.05em";
  }

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

    const toneColor = shouldColor && pinyinList[i] ? getToneColor(pinyinList[i]) : "white";
    span.style.color = toneColor;

    if (!isPunct && shouldShowPinyin) {
      const ruby = document.createElement("ruby");
      const rt = document.createElement("rt");
      rt.textContent = pinyinList[i] || "";
      rt.style.color = toneColor;

      ruby.appendChild(span);
      ruby.appendChild(rt);
      wrapper.appendChild(ruby);
    } else {
      wrapper.appendChild(span);
    }
  });

  return wrapper;
}
