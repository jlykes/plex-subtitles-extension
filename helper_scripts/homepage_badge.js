// === homepage_badge.js ===
// Logic for injecting 'Enriched Subtitles Available' badges on the Plex homepage.
// Chunk 14: Badge styling with icons and short text

// Constants
const cellSelector = 'div[data-testid="cellItem"]';
const titleSelector = 'a[data-testid="metadataTitleLink"], a.MetadataPosterCardTitle-title-ImAmGu';
const yearSelector = 'div.MetadataPosterCardTitle-title-ImAmGu:not(a)';

/**
 * Determines the media type and returns normalized title
 * @param {HTMLElement} cell - The cell element
 * @param {string} rawTitle - The raw title text
 * @returns {Object|null} Media info with normalized title and type, or null for season-level entries
 */
function determineMediaType(cell, rawTitle) {
  // Check if this is a season-level entry (should be skipped)
  const seasonLink = cell.querySelector('a[data-testid="metadataTitleLink"][title*="Season"], a.MetadataPosterCardTitle-title-ImAmGu[title*="Season"]');
  const seasonSpan = cell.querySelector('span.MetadataPosterCardTitle-title-ImAmGu');
  
  const isSeasonLevel = (seasonLink && 
                        (seasonLink.textContent.trim().toLowerCase().includes('season') ||
                         seasonLink.textContent.trim().toLowerCase().includes('seasons'))) ||
                       (seasonSpan && 
                        (seasonSpan.textContent.trim().toLowerCase().includes('season') ||
                         seasonSpan.textContent.trim().toLowerCase().includes('seasons')));
  
  if (isSeasonLevel) {
    return null; // Season-level entry - skip
  }
  
  // Check if this is a TV show by looking for season/episode format
  const seasonEpisodeEl = cell.querySelector('span a[title*="Season"], span a[title*="Episode"]');
  
  if (seasonEpisodeEl) {
    // TV Show - construct filename as [Show Title] [S1·E1]
    const showTitleEl = cell.querySelector('a[title]:not([title*="Season"]):not([title*="Welcome"])');
    const seasonEl = cell.querySelector('span a[title*="Season"]');
    const seasonEpisodeSpan = cell.querySelector('span a[title*="Season"]')?.parentElement;
    const episodeEl = seasonEpisodeSpan ? seasonEpisodeSpan.querySelectorAll('a')[1] : null;
    
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
      
      const normalized = `${normalizedShowTitle}_-_${season}_·_${episode}`;
      return { normalized, mediaType: 'tv_show' };
    }
  }
  
  // Movie - use normal title normalization
  const normalized = window.normalizeTitle(rawTitle);
  return { normalized, mediaType: 'movie' };
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
async function injectBadgeForCell(cell) {
  // Remove any existing badge(s) in this cell before injecting a new one
  cell.querySelectorAll('.homepage-enriched-badge').forEach(badge => badge.remove());
  // Ensure enough vertical space for badge and row separation
  cell.style.height = '400px';
  cell.style.marginBottom = '40px';

  // --- Adjust row container height ---
  const scroller = cell.closest('.VirtualHubScroller-hubScroller-gv2_Qy');
  if (scroller && scroller.firstElementChild) {
    const rowContainer = scroller.firstElementChild;
    const currentHeight = parseInt(rowContainer.style.height || '0', 10);
    if (isNaN(currentHeight) || currentHeight < 420) {
      rowContainer.style.height = '420px';
    }
  }

  // --- Find key DOM elements ---
  
  // YEAR: Try to find the year element for indent alignment
  const yearEl = cell.querySelector(yearSelector);
  let leftPadding = '';
  if (yearEl) {
    const style = window.getComputedStyle(yearEl);
    leftPadding = style.paddingLeft || style.marginLeft || '';
  }

  // TITLE: Extract the title from the cell
  const titleEl = cell.querySelector(titleSelector);
  const rawTitle = titleEl.textContent.trim();

  // MEDIA TYPE: Determine media type and get normalized title
  // Used for determining whether to inject badge
  const mediaInfo = determineMediaType(cell, rawTitle);

  // --- Decide whether to inject badge, depending on media type ---

  switch (true) {
    // CASE 1: Missing title, or key functions (normalizeTitle, checkEnrichedJSONExists)
    case (!titleEl?.textContent || !window.normalizeTitle || !window.checkEnrichedJSONExists):
      injectErrorBadge(cell, '[Error: No title or utility functions available]');
      return;
    
    // CASE 2: Season-level entry - skip entirely
    case (!mediaInfo):
      return;
    
    // CASE 3: Audio content - skip entirely
    case (rawTitle.toLowerCase().includes('audio') || rawTitle.toLowerCase().includes('audiobook')):
      return;
    
    // DEFAULT CASE: Valid media content - inject badge based on enriched JSON result
    default:
      // Only destructure after confirming mediaInfo is not null
      const { normalized, mediaType } = mediaInfo;
      // Initialize badge
      let badgeText = 'Checking...';
      let badge = document.createElement('div');
      let badgeColor = '#888';
      let badgeIcon = '';

      // Badge styling
      badge.className = 'homepage-enriched-badge';
      badge.textContent = badgeText;
      badge.style.fontSize = '0.9em';
      badge.style.color = badgeColor;
      badge.style.margin = '0';
      badge.style.padding = '0';
      badge.style.borderRadius = '0';
      if (leftPadding) {
        badge.style.paddingLeft = leftPadding;
      }

      // --- Badge injection location logic ---
      // Try to inject inline with year or SXEX, else as new line
      let injectedInline = false;
      const yearEl = cell.querySelector(yearSelector);
      // Try to find SXEX (season/episode) element: look for S1·E1, S1.E1, etc.
      let sxexEl = null;
      const possibleSXEX = cell.querySelectorAll('span, a');
      for (const el of possibleSXEX) {
        if (/S\d+\s*[·.]\s*E\d+/i.test(el.textContent)) {
          sxexEl = el;
          break;
        }
      }
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

      // Ensure 'exists' is defined before use
      const exists = await window.checkEnrichedJSONExists(normalized);

      // Check for enriched JSON and populate text based on result
      let percentKnown = null;
      if (exists) {
        // Fetch the enriched JSON
        try {
          const url = chrome.runtime.getURL(`enriched_subtitles/${normalized}.enriched.json`);
          const res = await fetch(url);
          if (res.ok) {
            const subtitleData = await res.json();
            // Get LingQ terms (prefer global window.lingqTerms)
            let lingqTerms = window.lingqTerms;
            if (!lingqTerms) {
              lingqTerms = await window.lingqData.loadLingQTerms();
              window.lingqTerms = lingqTerms;
            }
            // Calculate percentage (known + learned)
            const percentages = window.calculateLingQStatusPercentages(subtitleData, lingqTerms);
            if (percentages && percentages.status3_known && percentages.status3_learned && percentages.ignored) {
              const knownCount = percentages.status3_known.count + percentages.status3_learned.count + percentages.ignored.count;
              const totalWords = percentages.totalWords || 0;
              percentKnown = totalWords > 0 ? Math.round((knownCount / totalWords) * 100) : null;
            }
          }
        } catch (e) {
          percentKnown = null;
        }
      }
      if (exists) {
        badgeIcon = '✅';
        badgeText = 'Enriched' + (percentKnown !== null ? ` · ${percentKnown}%` : '');
        badgeColor = '#2e8b57';
        badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
      } else {
        badgeIcon = '❌';
        badgeText = 'Not Enriched';
        badgeColor = '#c0392b';
        badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
      }
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
            injectBadgeForCell(node);
          }
          const newCells = node.querySelectorAll ? node.querySelectorAll(cellSelector) : [];
          newCells.forEach(cell => injectBadgeForCell(cell));
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

window.observeNewCells = observeNewCells; 