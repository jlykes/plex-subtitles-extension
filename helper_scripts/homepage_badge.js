// === homepage_badge.js ===
// Logic for injecting 'Enriched Subtitles Available' badges on the Plex homepage.
// Chunk 10: Remove extra margin, align badge indent with year

console.log('[homepage_badge] Script loaded');

const cellSelector = 'div[data-testid="cellItem"]';
const titleSelector = 'a[data-testid="metadataTitleLink"], a.MetadataPosterCardTitle-title-ImAmGu';
const yearSelector = 'div.MetadataPosterCardTitle-title-ImAmGu:not(a)';

/**
 * Injects the dummy badge as the last child of the cell.
 * Always removes any existing badge before injecting a new one.
 * Also increases spacing between rows of cells.
 * Adjusts row container height for badge visibility.
 * Aligns badge indent with year.
 */
function injectBadgeForCell(cell) {
  // Add extra bottom margin for row spacing
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

  // Remove any existing badge(s) in this cell
  cell.querySelectorAll('.homepage-enriched-badge').forEach(badge => badge.remove());

  // Try to find the year element for indent alignment
  const yearEl = cell.querySelector(yearSelector);
  let leftPadding = '';
  if (yearEl) {
    // Try to get computed left padding or margin-left
    const style = window.getComputedStyle(yearEl);
    leftPadding = style.paddingLeft || style.marginLeft || '';
  }

  // Inject dummy badge as the last child of the cell
  let badge = document.createElement('div');
  badge.className = 'homepage-enriched-badge';
  badge.textContent = '[To-do: Enriched?]';
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

/**
 * Finds all movie/poster cells on the Plex homepage, logs their titles, and injects a dummy badge after the year.
 * Also increases spacing between rows of cells.
 * Retries every 500ms for up to 5 seconds if none are found initially.
 */
function logAllPlexHomepageCells() {
  const maxRetries = 10; // 10 * 500ms = 5 seconds
  let attempts = 0;

  function tryFindCells() {
    const cells = document.querySelectorAll(cellSelector);
    if (cells.length > 0) {
      console.log(`[homepage_badge] Found ${cells.length} movie/poster cells on homepage.`);
      const titles = [];
      cells.forEach(cell => {
        injectBadgeForCell(cell);
        const titleEl = cell.querySelector(titleSelector);
        if (titleEl && titleEl.textContent) {
          titles.push(titleEl.textContent.trim());
        } else {
          titles.push('[No title found]');
        }
      });
      console.log('[homepage_badge] Titles found:', titles);
    } else if (attempts < maxRetries) {
      attempts++;
      setTimeout(tryFindCells, 500);
    } else {
      console.warn('[homepage_badge] No movie/poster cells found after waiting 5 seconds.');
    }
  }

  tryFindCells();
}

// MutationObserver to handle dynamically loaded cells
function observeNewCells() {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          // If a new cell is added directly
          if (node.matches && node.matches(cellSelector)) {
            injectBadgeForCell(node);
          }
          // Or if new cells are added deeper in the tree
          const newCells = node.querySelectorAll ? node.querySelectorAll(cellSelector) : [];
          newCells.forEach(cell => injectBadgeForCell(cell));
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Periodic scan fallback for virtualized/infinite-scroll UIs
function periodicBadgeScan() {
  setInterval(() => {
    const cells = document.querySelectorAll(cellSelector);
    cells.forEach(cell => injectBadgeForCell(cell));
  }, 1000); // Every 1 second
}

// Ensure global assignment for manual testing
window.logAllPlexHomepageCells = logAllPlexHomepageCells;

// TEMP: Automatically call on page load for this step
logAllPlexHomepageCells();
observeNewCells();
periodicBadgeScan(); 