// === homepage_badge.js ===
// Logic for injecting 'Enriched Subtitles Available' badges on the Plex homepage.

// Constants
const cellSelector = 'div[data-testid="cellItem"]';
const titleSelector = 'a[data-testid="metadataTitleLink"], a.MetadataPosterCardTitle-title-ImAmGu';
const yearSelector = 'div.MetadataPosterCardTitle-title-ImAmGu:not(a)';


/**
 * Removes any existing badges from a cell.
 * @param {HTMLElement} cell - The cell element.
 */
function removeExistingBadges(cell) {
    cell.querySelectorAll('.homepage-enriched-badge').forEach(badge => badge.remove());
}

/**
 * Adjusts the height of the row container to ensure badge visibility.
 * Particularly on Home page.
 * @param {HTMLElement} cell - The cell element.
 * @param {number} minHeight - The minimum height in pixels.
 */
function adjustRowContainerHeight(cell, minHeight = 420) {
    const scroller = cell.closest('.VirtualHubScroller-hubScroller-gv2_Qy');
    if (scroller && scroller.firstElementChild) {
      const rowContainer = scroller.firstElementChild;
      const currentHeight = parseInt(rowContainer.style.height || '0', 10);
      if (isNaN(currentHeight) || currentHeight < minHeight) {
        rowContainer.style.height = `${minHeight}px`;
      }
    }
}

/**
 * Finds the year element, left padding, SXEX element, title element, and raw title.
 * Used for determining where to inject the badge.
 * @param {HTMLElement} cell - The cell element.
 * @returns {Object} An object containing the year element, left padding, SXEX element, title element, and raw title.
 */
function findBadgePlacementElements(cell) {
  
    // YEAR: Try to find the year element for indent alignment
    const yearEl = cell.querySelector(yearSelector);
    let leftPadding = '';
    if (yearEl) {
      const style = window.getComputedStyle(yearEl);
      leftPadding = style.paddingLeft || style.marginLeft || '';
    }
  
    // SXEX: Try to find the SXEX element
    let sxexEl = null;
    const possibleSXEX = cell.querySelectorAll('span, a');
    for (const el of possibleSXEX) {
      if (/S\d+\s*[·.]\s*E\d+/i.test(el.textContent)) {
        sxexEl = el;
        break;
      }
    }
  
    // TITLE: Extract the title from the cell
    const titleEl = cell.querySelector(titleSelector);
    const rawTitle = titleEl?.textContent?.trim() || '';
  
    // Return the elements
    return { yearEl, leftPadding, sxexEl, titleEl, rawTitle };
  } 

/**
 * Determines the media type and returns normalized title
 * @param {HTMLElement} cell - The cell element
 * @param {string} rawTitle - The raw title text
 * @returns {Object|null} Media info with normalized title and type, in structure: { normalizedTitle: normalizedTitle, mediaType: 'tv_season' | 'tv_show' | 'movie' }
 */
function determineMediaType(cell, rawTitle) {
  
  // ---1. TV SEASON? Check if this is a season-level entry
  const seasonLink = cell.querySelector('a[data-testid="metadataTitleLink"][title*="Season"], a.MetadataPosterCardTitle-title-ImAmGu[title*="Season"]');
  const seasonSpan = cell.querySelector('span.MetadataPosterCardTitle-title-ImAmGu');
  
  const isSeasonLevel = (seasonLink && 
                        (seasonLink.textContent.trim().toLowerCase().includes('season') ||
                         seasonLink.textContent.trim().toLowerCase().includes('seasons'))) ||
                       (seasonSpan && 
                        (seasonSpan.textContent.trim().toLowerCase().includes('season') ||
                         seasonSpan.textContent.trim().toLowerCase().includes('seasons')));
  
  if (isSeasonLevel) {
    // Return the media type
    return { normalizedTitle: window.normalizeTitle(rawTitle), mediaType: 'tv_season' };
  }
  
  // ---2. TV SHOW? Check if this is a TV show by looking for season/episode format
  const seasonEpisodeEl = cell.querySelector('span a[title*="Season"], span a[title*="Episode"]');
  
  if (seasonEpisodeEl) {
    // Try to find the show title, season, and episode
    const showTitleEl = cell.querySelector('a[title]:not([title*="Season"]):not([title*="Welcome"])');
    const seasonEl = cell.querySelector('span a[title*="Season"]');
    const seasonEpisodeSpan = cell.querySelector('span a[title*="Season"]')?.parentElement;
    const episodeEl = seasonEpisodeSpan ? seasonEpisodeSpan.querySelectorAll('a')[1] : null;
    
    // If we found the show title, season, and episode, construct the normalized title
    if (showTitleEl && seasonEl && episodeEl) {
      const showTitle = showTitleEl.textContent.trim();
      const season = seasonEl.textContent.trim();
      const episode = episodeEl.textContent.trim();
      
      // Apply the same normalization as normalizeTitle function
      const normalizedShowTitle = showTitle
        .replace(/[:]/g, " -")
        .replace(/\s+/g, "_")
        .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ".")
        .replace(/[#]/g, "")
        .replace(/[—'&,'']/g, "_");
      
      const normalizedTitle = `${normalizedShowTitle}_-_${season}_·_${episode}`;

      // Return the normalized title and media type
      return { normalizedTitle: normalizedTitle, mediaType: 'tv_show' };
    }
  }
  
  // ---3. AUDIO? Check if this is an audio entry
  const normalizedTitle = window.normalizeTitle(rawTitle);
  if (rawTitle.toLowerCase().includes('audio') || rawTitle.toLowerCase().includes('audiobook')) {
    return { normalizedTitle: rawTitle, mediaType: 'audio' };
  }

  // ---4. MOVIE? Otherwise, assume it's a movie, return the normalized title and media type
  return { normalizedTitle: normalizedTitle, mediaType: 'movie' };
}

/**
 * Injects an error badge
 * @param {HTMLElement} cell - The cell element
 * @param {string} message - Error message to display
 */
function injectErrorBadge(cell, message) {
  const badge = document.createElement('div');
  badge.className = 'homepage-enriched-badge';
  badge.textContent = message;
  badge.style.fontSize = '0.9em';
  badge.style.color = '#888';
  badge.style.margin = '0';
  badge.style.padding = '0';
  badge.style.borderRadius = '0';
  cell.appendChild(badge);
}

/**
 * Creates a checking badge
 * @param {string} leftPadding - The left padding
 * @returns {HTMLElement} The created badge
 */
function createInitialBadge(leftPadding = '') {
  const badge = document.createElement('div');
  badge.className = 'homepage-enriched-badge';
  badge.textContent = 'Checking...';
  badge.style.fontSize = '0.9em';
  badge.style.color = '#888';
  badge.style.margin = '0';
  badge.style.padding = '0';
  badge.style.borderRadius = '0';
  if (leftPadding) {
    badge.style.paddingLeft = leftPadding;
  }
  return badge;
}

/**
 * Places the badge inline with year or SXEX, or as a new line if neither is found.
 * @param {HTMLElement} cell - The cell element.
 * @param {HTMLElement} badge - The badge element to inject.
 * @param {HTMLElement|null} yearEl - The year element.
 * @param {HTMLElement|null} sxexEl - The SXEX element.
 */
function placeInitialBadge(cell, badge, yearEl, sxexEl) {
  let injectedInline = false;
  if (yearEl) {
    yearEl.style.display = 'flex';
    yearEl.style.alignItems = 'center';
    badge.style.marginLeft = '8px';
    yearEl.appendChild(badge);
    injectedInline = true;
  } else if (sxexEl) {
    sxexEl.style.display = 'flex';
    sxexEl.style.alignItems = 'center';
    badge.style.marginLeft = '8px';
    sxexEl.appendChild(badge);
    injectedInline = true;
  }
  if (!injectedInline) {
    badge.style.display = '';
    badge.style.marginLeft = '';
    cell.appendChild(badge);
  }
}

/**
 * Fetches the enriched JSON and calculates the percentage of known words (known + learned + ignored).
 * @param {string} normalizedTitle - The normalized title for the JSON file.
 * @returns {Promise<number|null>} The percentage of known words, or null if not available.
 */
async function getPercentKnownForTitle(normalizedTitle) {
  try {
    const url = chrome.runtime.getURL(`enriched_subtitles/${normalizedTitle}.enriched.json`);
    const res = await fetch(url);
    if (!res.ok) return null;
    const subtitleData = await res.json();
    let lingqTerms = window.lingqTerms;
    if (!lingqTerms) {
      lingqTerms = await window.lingqData.loadLingQTerms();
      window.lingqTerms = lingqTerms;
    }
    const percentages = window.calculateLingQStatusPercentages(subtitleData, lingqTerms);
    if (percentages && percentages.status3_known && percentages.status3_learned && percentages.ignored) {
      const knownCount = percentages.status3_known.count + percentages.status3_learned.count + percentages.ignored.count;
      const totalWords = percentages.totalWords || 0;
      return totalWords > 0 ? Math.round((knownCount / totalWords) * 100) : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Handles the badge injection logic
 * @param {HTMLElement} cell - The cell element
 * @param {string} normalizedTitle - The normalized title
 * @param {string} mediaType - The media type
 * @param {string} leftPadding - The left padding
 * @param {HTMLElement} yearEl - The year element
 * @param {HTMLElement} sxexEl - The SXEX element
 */
async function injectFinalBadge(cell, normalizedTitle, leftPadding, yearEl, sxexEl) {
  // Initialize initial badge & place it
  let badge = createInitialBadge(leftPadding);
  placeInitialBadge(cell, badge, yearEl, sxexEl);

  // Check if enriched JSON exists before trying to pull
  const enrichedJSONExists = await window.checkEnrichedJSONExists(normalizedTitle);

  // Calculate percentage of known words
  let percentKnown = null;
  if (enrichedJSONExists) {
    percentKnown = await getPercentKnownForTitle(normalizedTitle);
  }

  // Inject the badge based on the enriched JSON result
  if (enrichedJSONExists) { // If enriched JSON exists, inject the badge including confirmation icon and percentage
    badgeIcon = '✅';
    badgeText = 'Enriched' + (percentKnown !== null ? ` · ${percentKnown}%` : '');
    badgeColor = '#2e8b57';
    badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
  } else { // If enriched JSON does not exist, inject the badge including error icon
    badgeIcon = '❌';
    badgeText = 'Not Enriched';
    badgeColor = '#c0392b';
    badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
  }
} 

/**
 * Injects the real badge as the last child of the cell, showing subtitle availability.
 * Always removes any existing badge before injecting a new one.
 * Also increases spacing between rows of cells.
 * Adjusts row container height for badge visibility.
 * Aligns badge indent with year.
 * Uses icons and short text for badge.
 * 
 * @param {HTMLElement} cell - The cell to inject the badge into
 * @returns {void}
 */
async function handleBadgeInjectionForCell(cell) {
    // Remove any existing badge(s) in this cell before injecting a new one
    removeExistingBadges(cell);
  
    // Adjust row container height (particularly on Home page)
    adjustRowContainerHeight(cell);
  
    // Find key DOM elements
    const { yearEl, leftPadding, sxexEl, titleEl, rawTitle } = findBadgePlacementElements(cell);
  
    // Determine media type and get normalized title
    // Used for determining whether to inject badge
    // Returns data in structure: { normalizedTitle: normalizedTitle, mediaType: 'tv_season' | 'tv_show' | 'movie' }
    const mediaInfo = determineMediaType(cell, rawTitle);
  
    // Decide whether to inject badge, depending on media type
    switch (true) {
      // CASE 1: Missing title, or key functions (normalizeTitle, checkEnrichedJSONExists)
      case (!titleEl?.textContent || !window.normalizeTitle || !window.checkEnrichedJSONExists):
        injectErrorBadge(cell, '[Error: No title or utility functions available]');
        return;
      
      // CASE 2: TV Season entry - skip entirely
      case (mediaInfo.mediaType === 'tv_season'):
        return;
      
      // CASE 3: Audio content - skip entirely
      case (mediaInfo.mediaType === 'audio'):
        return;
      
      // DEFAULT CASE: Valid media content - inject badge based on enriched JSON result
      default:
        await injectFinalBadge(cell, mediaInfo.normalizedTitle, leftPadding, yearEl, sxexEl);
        break;
    }
}

/**
 * Observes new cells and injects the badge
 * @returns {void}
 */
function observeNewCells() {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches(cellSelector)) {
              handleBadgeInjectionForCell(node);
            }
            const newCells = node.querySelectorAll ? node.querySelectorAll(cellSelector) : [];
            newCells.forEach(cell => handleBadgeInjectionForCell(cell));
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

window.observeNewCells = observeNewCells; 