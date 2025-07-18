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
 * Utility to detect the current Plex page type based on DOM structure.
 * Returns one of: 'tv_overview', 'home_or_movie_overview', or 'unknown'.
 */
function detectPlexPageType() {
  // Individual media (movie) page: has a Cast & Crew hub, no episode cards or folder rows
  const castCrewHub = Array.from(document.querySelectorAll('[data-testid="hubTitle"]')).find(el => /Cast\s*&\s*Crew/i.test(el.textContent));
  if (
    castCrewHub
  ) {
    return 'individual_media';
  }

  // TV Overview: has title, subtitle, and episode cards
  if (
    document.querySelector('[data-testid="metadata-title"]') &&
    document.querySelector('[data-testid="metadata-subtitle"]') &&
    document.querySelector('[data-testid="cellItem"]')
  ) {
    return 'tv_overview';
  }

  // Folders page
  if (document.querySelector('.ListRow-row-oh5MTV')) {
    return 'folders';
  }

  // Home or movie overview: has episode cards but not the above
  if (document.querySelector('[data-testid="cellItem"]')) {
    return 'home_or_movie_overview';
  }

  // Unknown page type
  return 'unknown';
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
 * Places the badge inline with year, SXEX, or episode info, or as a new line if none is found.
 * @param {HTMLElement} cell - The cell element.
 * @param {HTMLElement} badge - The badge element to inject.
 * @param {HTMLElement|null} yearEl - The year element.
 * @param {HTMLElement|null} sxexEl - The SXEX element.
 * @param {HTMLElement|null} episodeInfoEl - The episode info element (for TV overview pages).
 */
function placeInitialBadgeForCell(cell, badge, yearEl, sxexEl, episodeInfoEl) {
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
  } else if (episodeInfoEl) {
    episodeInfoEl.style.display = 'flex';
    episodeInfoEl.style.alignItems = 'center';
    badge.style.marginLeft = '8px';
    episodeInfoEl.appendChild(badge);
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
async function injectFinalBadgeForCell(cell, normalizedTitle, leftPadding, yearEl, sxexEl, episodeInfoEl) {
  // Initialize initial badge & place it
  let badge = createInitialBadge(leftPadding);
  placeInitialBadgeForCell(cell, badge, yearEl, sxexEl, episodeInfoEl);

  // Check if enriched JSON exists before trying to pull
  const enrichedJSONExists = await window.checkEnrichedJSONExists(normalizedTitle);

  // Calculate percentage of known words
  let percentKnown = null;
  if (enrichedJSONExists) {
    percentKnown = await getPercentKnownForTitle(normalizedTitle);
  }

  // Inject the badge based on the enriched JSON result
  let badgeIcon, badgeText, badgeColor;
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
 * Extracts the enriched subtitle filename for a TV episode card on the TV overview page.
 * The filename format is: ShowTitle_-_S1_·_E1.enriched.json
 * @param {HTMLElement} episodeCard - The DOM element for the episode card
 * @returns {string|null} The constructed filename, or null if info is missing
 */
function getEnrichedSubtitleFilenameForEpisodeCard(episodeCard) {
  // 1. Get show title (from page header, not card)
  const showTitleEl = document.querySelector('[data-testid="metadata-title"]');
  const showTitle = showTitleEl ? window.normalizeTitle(showTitleEl.textContent.trim()) : null;

  // 2. Get season number (from page header)
  const seasonSubtitleEl = document.querySelector('[data-testid="metadata-subtitle"]');
  let seasonNum = null;
  if (seasonSubtitleEl) {
    const seasonMatch = seasonSubtitleEl.textContent.match(/Season\s*(\d+)/i);
    if (seasonMatch) seasonNum = seasonMatch[1];
  }

  // 3. Get episode number (from card)
  let epNum = null;
  // Try to find the episode number in the 'Episode X' link or span
  const epNumEl = episodeCard.querySelector('.MetadataPosterCardTitle-title-ImAmGu a, span.MetadataPosterCardTitle-title-ImAmGu a');
  if (epNumEl) {
    const epMatch = epNumEl.textContent.match(/Episode\s*(\d+)/i);
    if (epMatch) epNum = epMatch[1];
  } else {
    // Fallback: try to find a span with just 'Episode X'
    const altEpNumEl = episodeCard.querySelector('span.MetadataPosterCardTitle-title-ImAmGu');
    if (altEpNumEl) {
      const epMatch = altEpNumEl.textContent.match(/Episode\s*(\d+)/i);
      if (epMatch) epNum = epMatch[1];
    }
  }

  // 4. Build filename if all info is present
  if (showTitle && seasonNum && epNum) {
    return `${showTitle}_-_S${seasonNum}_·_E${epNum}`;
  }
  return null;
}
 
/**
 * Handles badge injection for Home or Movie Overview pages.
 * @param {HTMLElement} cell - The cell to inject the badge into
 */
function handleHomeOrMovieOverviewBadge(cell) {
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
      injectFinalBadgeForCell(cell, mediaInfo.normalizedTitle, leftPadding, yearEl, sxexEl);
      break;
  }
}

/**
 * Handles badge injection for TV Overview pages (episode cards).
 * @param {HTMLElement} cell - The cell to inject the badge into
 */
async function handleTVOverviewBadge(cell) {
  const enrichedFilename = getEnrichedSubtitleFilenameForEpisodeCard(cell);
  if (enrichedFilename) {
    const normalizedTitle = enrichedFilename.replace(/\.enriched\.json$/, '');

    // Find the element that contains the episode number (e.g., "Episode 1")
    let episodeInfoEl = null;
    const candidates = cell.querySelectorAll('.MetadataPosterCardTitle-title-ImAmGu, .MetadataPosterCardTitle-title-ImAmGu a');
    for (const el of candidates) {
      if (/Episode\s*\d+/i.test(el.textContent)) {
        episodeInfoEl = el;
        break;
      }
    }

    // Pass episodeInfoEl to injectFinalBadge for inline placement
    await injectFinalBadgeForCell(cell, normalizedTitle, '', null, null, episodeInfoEl);
    return;
  }
}

/**
 * Handles badge injection for Plex Folders pages.
 * @param {HTMLElement} cell - The cell to inject the badge into
 */
function handleFoldersPageBadge(cell) {
  // Skip badge injection if this is a TV folders page
  const tvHeader = document.querySelector('.PageHeaderTitle-title-W0yjas');
  if (tvHeader && /TV/i.test(tvHeader.textContent)) {
    return;
  }

  // Find the title element
  const titleEl = cell.querySelector('.MetadataDetailsRow-title-QFytpJ');

  // Find the year/subtitle element
  const yearEl = cell.querySelector('.MetadataDetailsRow-subtitle-rx7YZP');
  
  // Normalize the title (reuse your normalization logic)
  const rawTitle = titleEl ? titleEl.textContent.trim() : '';
  const normalizedTitle = window.normalizeTitle ? window.normalizeTitle(rawTitle) : rawTitle;

  // Inject the badge inline with the year/subtitle
  injectFinalBadgeForCell(cell, normalizedTitle, '', yearEl, null, null);
}

// Store the observer globally so it can be disconnected/reconnected
let enrichedBadgeObserver = null;

/**
 * Handles badge injection for individual media (movie) pages.
 * @param {HTMLElement} cell - The cell to inject the badge into (not used, but for API consistency)
 */
async function handleIndividualMediaPageBadge() {
  // Disconnect the observer at the very start to prevent multiple triggers
  if (enrichedBadgeObserver) enrichedBadgeObserver.disconnect();

  // Debug: log when this function is called
  console.log('[BADGE DEBUG]', new Date().toISOString(), 'handleIndividualMediaPageBadge called');
  // Find the main title element
  const titleEl = document.querySelector('[data-testid="metadata-title"]');
  // Normalize the title (reuse your normalization logic)
  const rawTitle = titleEl ? titleEl.textContent.trim() : '';
  const normalizedTitle = window.normalizeTitle ? window.normalizeTitle(rawTitle) : rawTitle;
  // Find the table container
  const tableContainer = document.querySelector('.StreamDetailPropertiesTable-container-vnpzQ6');

  // Remove any existing badge rows to prevent duplicates
  if (tableContainer) {
    tableContainer.querySelectorAll('.enriched-badge-row').forEach(row => row.remove());
  }

  // If the table container exists and the badge row doesn't, create a new row
  if (tableContainer && !tableContainer.querySelector('.enriched-badge-row')) {
    // Create a new row div with the same classes as the other rows
    const rowDiv = document.createElement('div');
    rowDiv.className = '_1h4p3k00 _1v25wbq8 _1v25wbq1s _1v25wbqg _1v25wbq1g _1v25wbq1c _1v25wbq14 _1v25wbq34 _1v25wbq28 enriched-badge-row';
    rowDiv.style.marginTop = '9px'; // Add extra margin for spacing
    rowDiv.style.marginLeft = '-2px';
    rowDiv.style.paddingLeft = '-2px';
    // Create a single span for the label and value
    const labelSpan = document.createElement('span');
    labelSpan.className = 'ineka90 ineka9k ineka9b ineka9n _1v25wbq1g _1v25wbq1c _1v25wbqlk';
    labelSpan.style.marginLeft = '-2px';
    labelSpan.style.paddingLeft = '-2px';
    // --- Badge content logic (same as injectFinalBadgeForCell) ---
    let badgeIcon, badgeText, badgeColor;
    let percentKnown = null;
    const enrichedJSONExists = await window.checkEnrichedJSONExists(normalizedTitle);
    if (enrichedJSONExists) {
      percentKnown = await getPercentKnownForTitle(normalizedTitle);
    }
    if (enrichedJSONExists) {
      badgeIcon = '✅';
      badgeText = 'Enriched' + (percentKnown !== null ? ` · ${percentKnown}%` : '');
      badgeColor = '#2e8b57';
      labelSpan.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
    } else {
      badgeIcon = '❌';
      badgeText = 'Not Enriched';
      badgeColor = '#c0392b';
      labelSpan.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
    }
    rowDiv.appendChild(labelSpan);
    // Append the new row to the table container
    tableContainer.appendChild(rowDiv);
  }
  // Reconnect the observer at the very end
  if (enrichedBadgeObserver) enrichedBadgeObserver.observe(document.body, { childList: true, subtree: true });
}

// Debounce utility
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Debounced version of handleIndividualMediaPageBadge
const debouncedHandleIndividualMediaPageBadge = debounce(handleIndividualMediaPageBadge, 200);

/**
 * Handles the badge injection logic for a given cell (episode card or movie card),
 * dispatching based on the detected page type.
 * @param {HTMLElement} cell - The cell to inject the badge into
 */
async function handleBadgeInjectionForCell(cell) {
  // Remove any existing badge(s) in this cell before injecting a new one
  removeExistingBadges(cell);

  // Detect the current page type
  const pageType = detectPlexPageType();

  // Inject the badge based on the page type
  switch (pageType) {
    case 'home_or_movie_overview': {
        handleHomeOrMovieOverviewBadge(cell);
        break;
    }
    case 'tv_overview': {
      await handleTVOverviewBadge(cell);
      break;
    }
    case 'folders': {
      handleFoldersPageBadge(cell);
      break;
    }
    case 'individual_media': {
      await debouncedHandleIndividualMediaPageBadge();
      break;
    }
    default: {
      // Unknown or unsupported page type
      // Optionally, do nothing or inject a generic badge
      break;
    }
  }
}

/**
 * Observes new cells and injects enriched subtitle badges.
 * @returns {void}
 */
function observeAndInjectEnrichedBadges() {
  const foldersCellSelector = '.MetadataDetailsRow-overlay-OPOaNZ';
  const defaultCellSelector = 'div[data-testid="cellItem"]';

  // Observe for dynamically added cells
  enrichedBadgeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const pageType = detectPlexPageType();
          console.log('[BADGE DEBUG]', 'Page type detected:', pageType);
          if (pageType === 'individual_media') {
            // For individual media pages, inject once (no cells to loop over)
            debouncedHandleIndividualMediaPageBadge();
          } else if (pageType === 'folders') {
            if (node.matches && node.matches(foldersCellSelector)) {
              handleBadgeInjectionForCell(node);
            }
            const newCells = node.querySelectorAll ? node.querySelectorAll(foldersCellSelector) : [];
            newCells.forEach(cell => handleBadgeInjectionForCell(cell));
          } else {
            if (node.matches && node.matches(defaultCellSelector)) {
              handleBadgeInjectionForCell(node);
            }
            const newCells = node.querySelectorAll ? node.querySelectorAll(defaultCellSelector) : [];
            newCells.forEach(cell => handleBadgeInjectionForCell(cell));
          }
        }
      });
    });
  });
  enrichedBadgeObserver.observe(document.body, { childList: true, subtree: true });
}

window.observeAndInjectEnrichedBadges = observeAndInjectEnrichedBadges; 