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
 * cell: the cell to inject the badge into
 * return: void
 */
async function injectBadgeForCell(cell) {
  cell.style.marginBottom = '18px';

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
  const { normalized, mediaType } = mediaInfo;


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
      cell.appendChild(badge);

      // Check for enriched JSON and populate text based on result
      const exists = await window.checkEnrichedJSONExists(normalized);
      if (exists) {
        badgeIcon = '✅';
        badgeText = 'Enriched Subs';
        badgeColor = '#2e8b57';
        badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
      } else {
        badgeIcon = '❌';
        badgeText = 'No Enriched Subs';
        badgeColor = '#c0392b';
        badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
      }
      break;
  }
}

/**
 * Observes new cells and injects the badge
 * return: void
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

observeNewCells(); 