// === homepage_badge.js ===
// Logic for injecting 'Enriched Subtitles Available' badges on the Plex homepage.
// Chunk 14: Badge styling with icons and short text

console.log('[homepage_badge] Script loaded');

const cellSelector = 'div[data-testid="cellItem"]';
const titleSelector = 'a[data-testid="metadataTitleLink"], a.MetadataPosterCardTitle-title-ImAmGu';
const yearSelector = 'div.MetadataPosterCardTitle-title-ImAmGu:not(a)';

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

  // Try to find the year element for indent alignment
  const yearEl = cell.querySelector(yearSelector);
  let leftPadding = '';
  if (yearEl) {
    const style = window.getComputedStyle(yearEl);
    leftPadding = style.paddingLeft || style.marginLeft || '';
  }

  // Extract the title from the cell
  const titleEl = cell.querySelector(titleSelector);
  let badgeText = 'No Enriched Subs';
  let badgeColor = '#888';
  let badgeIcon = '';

  // If cell has a title and the checkEnrichedJSONExists & normalizeTitle functions are available, run through the logic
  if (titleEl && titleEl.textContent && window.normalizeTitle && window.checkEnrichedJSONExists) {
    const rawTitle = titleEl.textContent.trim();
    
    // Check if this is a TV show by looking for season/episode format
    const seasonEpisodeEl = cell.querySelector('span a[title*="Season"], span a[title*="Episode"]');
    
    // Let's also check what elements are actually in the cell
    const allLinks = cell.querySelectorAll('a');

    let normalized = '';
    
    if (seasonEpisodeEl) {
      // CASE 1: This is a TV show - construct filename as [Show Title] [S1·E1]
      // For TV shows, we have: show title, episode title, then season/episode span
      const showTitleEl = cell.querySelector('a[title]:not([title*="Season"]):not([title*="Welcome"])');
      const seasonEl = cell.querySelector('span a[title*="Season"]');
      // The episode element is the second link in the season/episode span
      const seasonEpisodeSpan = cell.querySelector('span a[title*="Season"]')?.parentElement;
      const episodeEl = seasonEpisodeSpan ? seasonEpisodeSpan.querySelectorAll('a')[1] : null;
      
      // If we have all the elements, we can normalize the title
      if (showTitleEl && seasonEl && episodeEl) {
        const showTitle = showTitleEl.textContent.trim();
        const season = seasonEl.textContent.trim();
        const episode = episodeEl.textContent.trim();
        // Format: ShowTitle_-_S1_·_E1
        // Apply the same normalization as normalizeTitle function
        const normalizedShowTitle = showTitle
          .replace(/[:]/g, " -")
          .replace(/\s+/g, "_")
          .replace(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g, ".")
          .replace(/[#]/g, "")
          .replace(/[—'&,'']/g, "_");
        normalized = `${normalizedShowTitle}_-_${season}_·_${episode}`;
      } else {
        normalized = window.normalizeTitle(rawTitle);
      }
    } else {
      // CASE 2: This is a movie - use normal title normalization
      normalized = window.normalizeTitle(rawTitle);
    }
    
    // Show loading while checking
    badgeText = 'Checking...';
    let badge = document.createElement('div');
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
    
    // Async check
    const exists = await window.checkEnrichedJSONExists(normalized);
    if (exists) { // If the enriched JSON exists, show the badge
      badgeIcon = '✅';
      badgeText = 'Enriched Subs';
      badgeColor = '#2e8b57';
      badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
    } else { // If the enriched JSON does not exist, show the badge
      badgeIcon = '❌';
      badgeText = 'No Enriched Subs';
      badgeColor = '#c0392b';
      badge.innerHTML = `<span style="color:${badgeColor};font-weight:bold;">${badgeIcon}</span> <span style="color:${badgeColor};font-weight:bold;">${badgeText}</span>`;
    }
  } else { // Else, fallback if title or checkEnrichedJSONExists & normalizeTitle functions are missing
    let badge = document.createElement('div');
    badge.className = 'homepage-enriched-badge';
    badge.textContent = '[Error: No title or utililty functions available]';
    badge.style.fontSize = '0.9em';
    badge.style.color = '#888';
    badge.style.margin = '0';
    badge.style.padding = '0';
    badge.style.borderRadius = '0';
    if (leftPadding) {
      badge.style.paddingLeft = leftPadding;
    }
    cell.appendChild(badge);
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