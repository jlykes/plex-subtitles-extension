// word_popup.js
// Handles LingQ word click popup UI and event logic
// Phase 1: Scaffold structure for popup rendering and event handling
// Phase 2 Step 1: Highlight current status/tags from local storage

//////////////////////////////
// 1. POPUP DATA MANAGEMENT
//////////////////////////////

/**
 * Retrieves current LingQ data for a given word from local storage.
 * @param {string} wordText - The Chinese word to look up in LingQ data
 * @returns {Promise<Object>} Object containing LingQ status and tag information
 * @returns {boolean} returns.found - Whether the word was found in LingQ data
 * @returns {number|null} returns.status - LingQ status (0-3) or null if not found
 * @returns {number|null} returns.extended_status - Extended status or null
 * @returns {Array<string>} returns.tags - Array of tags associated with the word
 */
async function getCurrentLingQData(wordText) {
    try {
        // Load LingQ terms from local storage
        const lingqTerms = await window.lingqData.loadLingQTerms();
        
        // Look up the word
        const wordData = lingqTerms[wordText];
        
        if (wordData) {
            console.log(`[word_popup] Found LingQ data for '${wordText}':`, wordData);
            return {
                found: true,
                status: wordData.status,
                extended_status: wordData.extended_status,
                tags: wordData.tags || []
            };
        } else {
            console.log(`[word_popup] No LingQ data found for '${wordText}'`);
            return {
                found: false,
                status: null, // Use null to indicate "not in LingQ data" vs status 0
                extended_status: null,
                tags: []
            };
        }
    } catch (error) {
        console.error('[word_popup] Error loading LingQ data:', error);
        return {
            found: false,
            status: 0,
            extended_status: null,
            tags: []
        };
    }
}

/**
 * Highlights the correct status and tag buttons in the popup based on current LingQ data.
 * Maps LingQ status values to control panel display numbers and highlights appropriate buttons.
 * @param {HTMLElement} popup - The popup DOM element containing status and tag buttons
 * @param {Object} wordData - LingQ data for the word
 * @param {number|null} wordData.status - LingQ status (0-3) or null if not in LingQ data
 * @param {number|null} wordData.extended_status - Extended status or null
 * @param {Array<string>} wordData.tags - Array of tags associated with the word
 * @returns {void}
 */
function highlightCurrentStatusAndTags(popup, wordData) {
    console.log('[word_popup] Highlighting status and tags:', wordData);
    
    // Highlight status buttons
    const statusButtons = popup.querySelectorAll('.status-btn');
    statusButtons.forEach((btn, index) => {
        const buttonText = btn.textContent.trim();
        let shouldHighlight = false;
        
        if (buttonText === '✓') {
            // Checkmark button - highlight if status is 3 and extended_status is 3 (Known)
            shouldHighlight = (wordData.status === 3 && wordData.extended_status === 3);
        } else {
            // Number buttons (0-4) - map to correct LingQ status values
            const buttonStatus = parseInt(buttonText);
            if (buttonStatus === 0) {
                // Button 0 = Unseen (not in LingQ data)
                shouldHighlight = (wordData.status === null);
            } else if (buttonStatus === 1) {
                // Button 1 = New (status=0 in LingQ data)
                shouldHighlight = (wordData.status === 0);
            } else if (buttonStatus === 2) {
                // Button 2 = Recognized (status=1 in LingQ data)
                shouldHighlight = (wordData.status === 1);
            } else if (buttonStatus === 3) {
                // Button 3 = Familiar (status=2 in LingQ data)
                shouldHighlight = (wordData.status === 2);
            } else if (buttonStatus === 4) {
                // Button 4 = Learned (status=3, extended_status=0 in LingQ data)
                shouldHighlight = (wordData.status === 3 && (wordData.extended_status === 0 || wordData.extended_status === null));
            }
        }
        
        if (shouldHighlight) {
            btn.style.background = '#FFEB3B'; // Light yellow for current status
            btn.style.borderColor = '#FFEB3B';
            btn.style.color = '#333'; // Dark text for better contrast
            btn.classList.add('current-status'); // Add class for tracking
        } else {
            btn.style.background = '#222';
            btn.style.borderColor = '#888';
            btn.style.color = '#fff';
            btn.classList.remove('current-status');
        }
    });
    
    // Highlight tag buttons
    const tagButtons = popup.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        const buttonText = btn.textContent.trim();
        let shouldHighlight = false;
        
        if (buttonText === 'no characters known') {
            // Highlight if no tags or empty tags array
            shouldHighlight = (!wordData.tags || wordData.tags.length === 0);
        } else {
            // Check if this tag exists in the word's tags
            shouldHighlight = wordData.tags && wordData.tags.includes(buttonText);
        }
        
        if (shouldHighlight) {
            btn.style.background = '#FFEB3B'; // Light yellow for current tag
            btn.style.borderColor = '#FFEB3B';
            btn.style.color = '#333'; // Dark text for better contrast
            btn.classList.add('current-tag'); // Add class for tracking
        } else {
            btn.style.background = '#222';
            btn.style.borderColor = '#888';
            btn.style.color = '#fff';
            btn.classList.remove('current-tag');
        }
    });
}

//////////////////////////////
// 2. POPUP RENDERING
//////////////////////////////

/**
 * Creates and displays a popup for a clicked word element.
 * Orchestrates the entire popup creation process including data gathering, HTML generation,
 * styling, positioning, and event handling.
 * @param {HTMLElement} wordElement - The subtitle word element that was clicked
 * @returns {Promise<void>}
 */
async function showWordPopup(wordElement) {
    hideWordPopup();
    lastPopupWordElement = wordElement;
    console.log('[word_popup] showWordPopup called for:', wordElement.innerText);

    // === Get word text for display ===
    // Only keep Chinese characters for wordText
    const rawText = wordElement.innerText.trim();
    const wordText = (rawText.match(/[\u4e00-\u9fff]+/g) || []).join('');
    
    // Get pinyin using getPinyin from utils.js if available
    let pinyin = 'N/A';
    if (typeof window.getPinyin === 'function') {
        pinyin = window.getPinyin(wordText);
    }
    
    // Get count using extractAllWordsFromSubtitles and window.subtitleList if available
    let count = 'N/A';
    if (window.subtitleList && typeof window.extractAllWordsFromSubtitles === 'function') {
        const allWords = window.extractAllWordsFromSubtitles(window.subtitleList);
        const num = allWords.filter(w => w === wordText).length;
        count = `${num.toLocaleString()}x this video`;
    }

    // Try to extract the definition from the tooltip (if present)
    let definition = '';
    const tooltip = wordElement.querySelector('div');
    if (tooltip && tooltip.textContent) {
        definition = tooltip.textContent.trim();
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'word-popup';
    
    // Generate and set HTML content
    popup.innerHTML = generatePopupHTML(wordText, pinyin, definition, count);
    
    // Apply styling
    applyPopupStyling(popup);

    // Prevent popup from closing when clicking inside it
    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // === Get current LingQ data and highlight buttons ===
    const wordData = await getCurrentLingQData(wordText);
    highlightCurrentStatusAndTags(popup, wordData);

    // Position the popup
    positionPopup(popup, wordElement);
    
    setTimeout(() => { popup.style.opacity = '1'; }, 10);

    // Remove any existing handler before adding a new one
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClickToClosePopup, true);
    }, 0);

    // Add click outside to close
    document.addEventListener('click', handleDocumentClickToClosePopup);
}

/**
 * Hides and removes the current word popup from the DOM.
 * Also cleans up event listeners and resets the last popup word element reference.
 * @returns {void}
 */
function hideWordPopup() {
    const existing = document.querySelector('.word-popup');
    if (existing) existing.remove();
    
    // Remove highlight from the previously active word
    if (lastPopupWordElement) {
        lastPopupWordElement.style.backgroundColor = '';
        lastPopupWordElement.style.borderRadius = '';
    }
    
    lastPopupWordElement = null;
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
}

//////////////////////////////
// 3. POPUP SYLING AND POSITIONING
//////////////////////////////

let lastPopupWordElement = null;

/**
 * Generates the HTML content for the word popup.
 * Creates the popup structure with word information, status buttons, and tag buttons.
 * @param {string} wordText - The Chinese word text to display
 * @param {string} pinyin - The pinyin pronunciation
 * @param {string} definition - The English definition (optional)
 * @param {string} count - The word frequency count in the video
 * @returns {string} HTML string for the popup content
 */
function generatePopupHTML(wordText, pinyin, definition, count) {
    let definitionHTML = '';
    if (definition) {
        definitionHTML = `<span class="popup-definition" style="color:#fff;font-size:0.97em;margin:0;padding:0;">${definition}</span>`;
    }

    return `
      <div class="popup-header" style="
        width:100%;
        text-align:center;
        font-size:1.05em;
        font-weight:500;
        margin-bottom:2px;
        line-height:1.05;
        padding-top:0;
        padding-bottom:0;
        display:flex;
        justify-content:center;
        align-items:center;
        gap:8px;">
        <span class="popup-chinese" style="margin:0;padding:0;font-size:1.13em;font-weight:600;letter-spacing:1px;">${wordText}</span>
        <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
        <span class="popup-pinyin" style="margin:0;padding:0;">${pinyin}</span>
        <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
        <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">${definitionHTML}</span>
        <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
        <span class="popup-count" style="color:#fff;font-size:0.97em;margin:0;padding:0;">${count}</span>
      </div>
      <div class="status-row" style="display:flex;gap:16px;justify-content:center;margin-bottom:6px;">
        <button class="status-btn">0</button>
        <button class="status-btn">1</button>
        <button class="status-btn">2</button>
        <button class="status-btn">3</button>
        <button class="status-btn">4</button>
        <button class="status-btn">✓</button>
      </div>
      <div class="tag-row" style="display:flex;flex-direction:column;gap:7px;justify-content:center;align-items:center;">
        <button class="tag-btn">characters known</button>
        <button class="tag-btn">partial characters known</button>
        <button class="tag-btn">no characters known</button>
      </div>
    `;
}

/**
 * Applies CSS styling to the popup and all its child elements.
 * Sets up the visual appearance including colors, layout, and button styles.
 * @param {HTMLElement} popup - The popup DOM element to style
 * @returns {void}
 */
function applyPopupStyling(popup) {
    // Apply main popup styles
    popup.style.position = 'absolute';
    popup.style.zIndex = 10001;
    popup.style.background = '#333';
    popup.style.color = '#fff';
    popup.style.borderRadius = '16px';
    popup.style.padding = '14px 16px';
    popup.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
    popup.style.display = 'flex';
    popup.style.flexDirection = 'column';
    popup.style.alignItems = 'center';
    popup.style.minWidth = '200px';
    popup.style.gap = '10px';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.18s cubic-bezier(.4,0,.2,1)';

    // Style status buttons
    popup.querySelectorAll('.status-btn').forEach(btn => {
        btn.style.width = '38px';
        btn.style.height = '38px';
        btn.style.borderRadius = '50%';
        btn.style.border = '1px solid #888';
        btn.style.background = '#222';
        btn.style.color = '#fff';
        btn.style.fontSize = '1.2em';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background 0.15s, border 0.15s, color 0.15s';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.textAlign = 'center';
        btn.style.lineHeight = '1';
    });

    // Style tag buttons
    popup.querySelectorAll('.tag-btn').forEach(btn => {
        btn.style.borderRadius = '18px';
        btn.style.border = '1px solid #888';
        btn.style.background = '#222';
        btn.style.color = '#fff';
        btn.style.fontSize = '0.98em';
        btn.style.padding = '7px 18px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background 0.15s, border 0.15s, color 0.15s';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
    });
}

/**
 * Positions the popup relative to the clicked word element.
 * Handles different subtitle positions (bottom/center/top) and adjusts for pinyin display.
 * @param {HTMLElement} popup - The popup DOM element to position
 * @param {HTMLElement} wordElement - The word element that was clicked
 * @returns {void}
 */
function positionPopup(popup, wordElement) {
    const rect = wordElement.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    let borderBottom = 0;
    const computed = window.getComputedStyle(wordElement);
    if (computed && computed.borderBottomWidth) {
        borderBottom = parseFloat(computed.borderBottomWidth) || 0;
    }
    const hasUnderline = borderBottom > 0 && computed.borderBottomStyle !== 'none';

    // Determine if popup should appear above or below
    const position = window.subtitleConfig?.position || 'bottom';
    let popupTop;
    if (position === 'bottom') {
        // For bottom subtitles, ignore underline/border. Only adjust for pinyin (ruby/rt) height.
        let popupOffset = 8; // px
        let popupHeight = popup.offsetHeight;
        let extraPinyinOffset = 0;
        const ruby = wordElement.querySelector('ruby');
        if (ruby) {
            const rt = ruby.querySelector('rt');
            if (rt) {
                extraPinyinOffset = rt.offsetHeight || 0;
            }
        }
        popup.style.top = `${rect.top + scrollY - popupHeight - popupOffset + extraPinyinOffset}px`;
    } else {
        // For center/top, include underline/border if present
        let popupOffset = 8;
        popupTop = rect.bottom + popupOffset + scrollY;
        if (hasUnderline) {
            // Subtract the border width so the popup is always offset from the text baseline
            popupTop = rect.bottom - borderBottom + popupOffset + scrollY - 2;
        }
    }
    popup.style.left = `${rect.left + rect.width / 2 + scrollX}px`;
    // Temporarily set top to 0 to measure height
    popup.style.top = '0px';
    popup.style.transform = 'translateX(-50%)';
    document.body.appendChild(popup);

    // Now position the popup correctly
    if (position === 'bottom') {
        let popupOffset = 8;
        let popupHeight = popup.offsetHeight;
        let extraPinyinOffset = 0;
        const ruby = wordElement.querySelector('ruby');
        if (ruby) {
            const rt = ruby.querySelector('rt');
            if (rt) {
                extraPinyinOffset = rt.offsetHeight - 4 || 0;
            }
        }
        popup.style.top = `${rect.top + scrollY - popupHeight - popupOffset + extraPinyinOffset}px`;
    } else {
        // Already handled above for center/top
        popup.style.top = `${popupTop}px`;
    }
}

//////////////////////////////
// 4. POPUP EVENT HANDLING
//////////////////////////////

/**
 * Initializes the word popup functionality by adding click listeners to all subtitle words.
 * This function should be called when subtitles are loaded or when the page is ready.
 * @returns {void}
 */
function initWordPopup() {
    addWordClickListeners();
}

/**
 * Adds click event listeners to all subtitle word elements.
 * Removes any existing listeners first to prevent duplicates.
 * @returns {void}
 */
function addWordClickListeners() {
    hideWordPopup();
    const wordSpans = document.querySelectorAll('.subtitle-word');
    wordSpans.forEach(span => {
        span.removeEventListener('click', handleWordClick);
        span.addEventListener('click', handleWordClick);
        
        // Add hover effects
        span.removeEventListener('mouseenter', handleWordHover);
        span.removeEventListener('mouseleave', handleWordHoverEnd);
        span.addEventListener('mouseenter', handleWordHover);
        span.addEventListener('mouseleave', handleWordHoverEnd);
    });
}

/**
 * Adds fullscreen change event listeners to handle popup repositioning.
 * Ensures the popup stays properly positioned when entering/exiting fullscreen mode.
 * @returns {void}
 */
function addFullscreenListeners() {
    const handler = () => {
        console.log('[word_popup] fullscreenchange event fired');
        if (lastPopupWordElement && document.querySelector('.word-popup')) {
            console.log('[word_popup] Repositioning popup for:', lastPopupWordElement.innerText);
            // Use a timeout for more reliable repositioning
            setTimeout(() => {
                showWordPopup(lastPopupWordElement);
            }, 50);
        } else {
            console.log('[word_popup] No popup to reposition');
        }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('mozfullscreenchange', handler);
    document.addEventListener('MSFullscreenChange', handler);
}
if (!window._wordPopupFullscreenListenerAdded) {
    addFullscreenListeners();
    window._wordPopupFullscreenListenerAdded = true;
} 

/**
 * Handles click events on subtitle word elements.
 * Closes any existing popup and shows a new popup for the clicked word.
 * @param {Event} event - The click event object
 * @returns {void}
 */
function handleWordClick(event) {
    event.stopPropagation();
    const wordElement = event.currentTarget;
    hideWordPopup(); // Always close any existing popup
    showWordPopup(wordElement);
}

/**
 * Handles mouse enter events on subtitle word elements.
 * Adds a transparent gray background highlight to the word.
 * @param {Event} event - The mouseenter event object
 * @returns {void}
 */
function handleWordHover(event) {
    const wordElement = event.currentTarget;
    wordElement.style.backgroundColor = 'rgba(128, 128, 128, 0.3)'; // Transparent gray
    wordElement.style.borderRadius = '3px';
    wordElement.style.transition = 'background-color 0.15s ease';
}

/**
 * Handles mouse leave events on subtitle word elements.
 * Removes the background highlight unless the word has an active popup.
 * @param {Event} event - The mouseleave event object
 * @returns {void}
 */
function handleWordHoverEnd(event) {
    const wordElement = event.currentTarget;
    // Only remove highlight if this word doesn't have an active popup
    if (lastPopupWordElement !== wordElement) {
        wordElement.style.backgroundColor = '';
        wordElement.style.borderRadius = '';
    }
}

/**
 * Handles document click events to close the popup when clicking outside.
 * Prevents event propagation when clicking outside the popup to avoid conflicts.
 * @param {Event} event - The click event object
 * @returns {void}
 */
function handleDocumentClickToClosePopup(event) {
    const popup = document.querySelector('.word-popup');
    // If clicking a subtitle word, let its click handler run after closing the popup
    if (popup && !popup.contains(event.target)) {
        if (!event.target.closest('.subtitle-word')) {
            event.preventDefault();
            event.stopPropagation();
        }
        hideWordPopup();
    }
}

//////////////////////////////
// 5. POPUP EXPORT/INIT
//////////////////////////////

window.initWordPopup = initWordPopup;