// word_popup.js
// Handles LingQ word click popup UI and event logic
// Phase 1: Scaffold structure for popup rendering and event handling
// Phase 2 Step 1: Highlight current status/tags from local storage


//////////////////////////////
// 1. UPDATING CURRENT DATA
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
        // Strip out all non-Chinese characters to match LingQ's normalization
        const normalizedWordText = (wordText.match(/[\u4e00-\u9fff]+/g) || []).join('');
        console.log(`[word_popup] getCurrentLingQData called for '${wordText}' (normalized: '${normalizedWordText}')`);
        
        // Try to use global window.lingqTerms first (most up-to-date)
        if (window.lingqTerms) {
            console.log(`[word_popup] Using global window.lingqTerms (${Object.keys(window.lingqTerms).length} terms)`);
            const wordData = window.lingqTerms[normalizedWordText];
            
            if (wordData) {
                console.log(`[word_popup] Found LingQ data in global for '${normalizedWordText}':`, wordData);
                return {
                    found: true,
                    status: wordData.status,
                    extended_status: wordData.extended_status,
                    tags: wordData.tags || []
                };
            } else {
                console.log(`[word_popup] No LingQ data found in global for '${normalizedWordText}'`);
                return {
                    found: false,
                    status: null,
                    extended_status: null,
                    tags: []
                };
            }
        }
        
        // Fallback to loading from storage
        console.log(`[word_popup] Global window.lingqTerms not available, loading from storage...`);
        const lingqTerms = await window.lingqData.loadLingQTerms();
        
        // Look up the word
        const wordData = lingqTerms[normalizedWordText];
        
        if (wordData) {
            console.log(`[word_popup] Found LingQ data in storage for '${normalizedWordText}':`, wordData);
            return {
                found: true,
                status: wordData.status,
                extended_status: wordData.extended_status,
                tags: wordData.tags || []
            };
        } else {
            console.log(`[word_popup] No LingQ data found in storage for '${normalizedWordText}'`);
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
 * Gets the appropriate highlight colors based on button type and text.
 * @param {string} buttonText - The text content of the button
 * @param {boolean} isStatusButton - Whether this is a status button (true) or tag button (false)
 * @returns {Object} Object with background and text color properties
 */
function getHighlightColors(buttonText, isStatusButton = true) {
    if (isStatusButton) {
        // Button '1' = status 0 (New)
        if (buttonText === '1') {
            return { background: '#ffe600', text: '#333' };
        } else if (buttonText === '2') {
            // Button '2' = status 1 (Learning)
            return { background: 'rgba(255,230,0,0.5)', text: 'black' };
        } else if (buttonText === '3') {
            // Button '3' = status 2 (Familiar)
            return { background: 'rgba(255,230,0,0.2)', text: 'white' };
        } else if (buttonText === '0') {
            // Button '0' = blue (not in LingQ data)
            return { background: 'blue', text: '#fff' };
        } else if (buttonText === '✓') {
            return { background: '#4CAF50', text: '#fff' };
        } else if (buttonText === '4') {
            // Button '4' = Learned (gray, matches underline)
            return { background: 'rgba(128,128,128,0.3)', text: 'white' };
        } else {
            return { background: 'blue', text: '#fff' };
        }
    } else {
        return { background: '#E0E0E0', text: '#333' };
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
            // Get colors from the reusable function
            const colors = getHighlightColors(buttonText, true);
            btn.style.background = colors.background;
            btn.style.borderColor = colors.background;
            btn.style.color = colors.text;
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
        
        console.log(`[word_popup] Checking tag button: '${buttonText}'`);
        console.log(`[word_popup] Word tags:`, wordData.tags);
        
        if (buttonText === 'no characters known') {
            // Don't highlight "no characters known" by default - only if explicitly set
            shouldHighlight = false;
            console.log(`[word_popup] 'no characters known' should highlight:`, shouldHighlight);
        } else {
            // Check if this tag exists in the word's tags
            shouldHighlight = wordData.tags && wordData.tags.includes(buttonText);
            console.log(`[word_popup] '${buttonText}' should highlight:`, shouldHighlight);
        }
        
        if (shouldHighlight) {
            // Get colors from the reusable function
            const colors = getHighlightColors(buttonText, false);
            btn.style.background = colors.background;
            btn.style.borderColor = colors.background;
            btn.style.color = colors.text;
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
    console.log('[word_popup] showWordPopup called for:', wordElement.innerText);
    console.log('[word_popup] Stack trace:', new Error().stack);
    hideWordPopup();
    lastPopupWordElement = wordElement;
    
    // Add highlighting to the word element
    wordElement.style.backgroundColor = 'rgba(128, 128, 128, 0.3)'; // Transparent gray
    wordElement.style.borderRadius = '3px';
    wordElement.style.transition = 'background-color 0.15s ease';
    
    console.log('[word_popup] showWordPopup called for:', wordElement.innerText);

    // === Get word text for display ===
    // Only keep Chinese characters for wordText
    const rawText = wordElement.innerText.trim();
    const wordText = (rawText.match(/[\u4e00-\u9fff]+/g) || []).join('');
    console.log(`[word_popup] Raw text: '${rawText}', extracted wordText: '${wordText}'`);
    
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

    // === Get frequency info from global data ===
    let frequencyInfo = null;
    if (window.frequencyData) {
        frequencyInfo = getWordFrequencyInfo(wordText, window.frequencyData);
        console.log('[word_popup] Frequency info:', frequencyInfo);
    }

    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'word-popup';
    
    // Generate and set HTML content
    popup.innerHTML = generatePopupHTML(wordText, pinyin, definition, count, frequencyInfo);
    
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
    
    // Add button click handlers for status and tag updates
    addButtonClickHandlers(popup, wordText);
}

/**
 * Hides and removes the current word popup from the DOM.
 * Also cleans up event listeners and resets the last popup word element reference.
 * @returns {void}
 */
function hideWordPopup() {
    console.log('[word_popup] hideWordPopup called');
    console.log('[word_popup] lastPopupWordElement before nulling:', lastPopupWordElement);
    const existing = document.querySelector('.word-popup');
    if (existing) existing.remove();
    
    // Remove highlight from the previously active word
    if (lastPopupWordElement) {
        lastPopupWordElement.style.backgroundColor = '';
        lastPopupWordElement.style.borderRadius = '';
    }
    
    lastPopupWordElement = null;
    console.log('[word_popup] lastPopupWordElement set to null');
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
 * @param {Object|null} frequencyInfo - Frequency information for the word
 * @returns {string} HTML string for the popup content
 */
function generatePopupHTML(wordText, pinyin, definition, count, frequencyInfo) {
    let definitionHTML = '';
    if (definition) {
        definitionHTML = `<span class="popup-definition" style="color:#fff;font-size:0.97em;margin:0;padding:0;">${definition}</span>`;
    }

    // Generate frequency score display
    let frequencyHTML = '';
    if (frequencyInfo && frequencyInfo.score) {
        const scoreColors = {
            5: '#4CAF50', // Green for very common
            4: '#8BC34A', // Light green for common
            3: '#FFC107', // Yellow for moderate
            2: '#FF9800', // Orange for uncommon
            1: '#F44336'  // Red for rare
        };
        const scoreColor = scoreColors[frequencyInfo.score] || '#888';
        const formattedCount = typeof formatFrequencyCount === 'function' ? 
            formatFrequencyCount(frequencyInfo.count) : frequencyInfo.count;
        
        // Get corpus size from frequency data (total word occurrences)
        const corpusSize = window.frequencyData ? 
            Object.values(window.frequencyData.frequency).reduce((sum, count) => sum + count, 0) : 0;
        const corpusSizeFormatted = typeof formatFrequencyCount === 'function' ? 
            formatFrequencyCount(corpusSize) : corpusSize;
        
        frequencyHTML = `
          <div class="popup-frequency" style="
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
            <span class="frequency-score" style="
              color: ${scoreColor};
              font-weight: bold;
              font-size: 1.1em;">${frequencyInfo.score}</span>
            <span style="color: ${scoreColor}; font-size: 1.1em;">⭐</span>
            <span style="color: #888; font-size: 0.95em;">(${frequencyInfo.scoreDescription})</span>
            <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
            <span style="color:#fff;font-size:0.97em;margin:0;padding:0;">${formattedCount} in ${corpusSizeFormatted} corpus</span>
            <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
            <span class="popup-count" style="color:#fff;font-size:0.97em;margin:0;padding:0;">${count}</span>
          </div>
        `;
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
      </div>
      ${frequencyHTML}
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
    popup.style.background = 'rgba(51, 51, 51, 0.85)';
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
        btn.style.border = '1px solid rgba(136, 136, 136, 0.85)';
        btn.style.background = 'rgba(34, 34, 34, 0.85)';
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
        btn.style.border = '1px solid rgba(136, 136, 136, 0.85)';
        btn.style.background = 'rgba(34, 34, 34, 0.85)';
        btn.style.color = '#fff';
        btn.style.fontSize = '0.98em';
        btn.style.padding = '7px 18px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background 0.15s, border 0.15s, color 0.15s';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.textAlign = 'center';
        btn.style.lineHeight = '1';
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
 * Also re-adds word click listeners since the overlay might be recreated.
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

// Initialize fullscreen listeners when script loads
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
    console.log('[word_popup] handleWordClick called for word:', event.currentTarget.innerText);
    console.log('[word_popup] lastPopupWordElement before check:', lastPopupWordElement);
    event.stopPropagation();
    const wordElement = event.currentTarget;
    
    // Store the current popup word element before potentially hiding it
    const currentPopupWordElement = lastPopupWordElement;
    
    // Check if there's already a popup open for this word
    const existingPopup = document.querySelector('.word-popup');
    if (existingPopup && currentPopupWordElement === wordElement) {
        // Popup is open for this word, so close it and return early
        console.log('[word_popup] Same word clicked, closing popup');
        hideWordPopup();
        return;
    }

    // Popup is not open for this word, so open it
    console.log('[word_popup] System thinks popup is not open for this word, so opening it');
    hideWordPopup();
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
    // If clicking a subtitle word, let its click handler manage the popup
    if (popup && !popup.contains(event.target)) {
        if (!event.target.closest('.subtitle-word')) {
            event.preventDefault();
            event.stopPropagation();
            hideWordPopup();
        }
        // If it's a subtitle word, do nothing here
    }
}

/**
 * Adds click event handlers to status and tag buttons in the popup.
 * Handles status updates and tag toggles when buttons are clicked.
 * @param {HTMLElement} popup - The popup DOM element containing buttons
 * @param {string} wordText - The Chinese word text being updated
 * @returns {void}
 */
function addButtonClickHandlers(popup, wordText) {
    // Add status button click handlers
    const statusButtons = popup.querySelectorAll('.status-btn');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const buttonText = btn.textContent.trim();
            console.log(`[word_popup] Status button clicked: ${buttonText} for word: ${wordText}`);
            
            await updateWordStatus(wordText, buttonText);
        });
    });
    
    // Add tag button click handlers
    const tagButtons = popup.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const buttonText = btn.textContent.trim();
            console.log(`[word_popup] Tag button clicked: ${buttonText} for word: ${wordText}`);
            
            await toggleWordTag(wordText, buttonText);
        });
    });
}

//////////////////////////////
// 5. POPUP DATA UPDATES
//////////////////////////////

/**
 * Updates the LingQ status for a word based on button click.
 * Maps button text to LingQ status values and updates both local storage and server.
 * @param {string} wordText - The Chinese word to update
 * @param {string} buttonText - The button text (0, 1, 2, 3, 4, or ✓)
 * @returns {Promise<void>}
 */
async function updateWordStatus(wordText, buttonText) {
    try {
        // Map button text to LingQ status values
        let newStatus, newExtendedStatus;
        
        if (buttonText === '✓') {
            // Checkmark = Known (status=3, extended_status=3)
            newStatus = 3;
            newExtendedStatus = 3;
        } else if (buttonText === '0') {
            // Button 0 = Unseen (remove from LingQ data)
            newStatus = null;
            newExtendedStatus = null;
        } else if (buttonText === '1') {
            // Button 1 = New (status=0)
            newStatus = 0;
            newExtendedStatus = null;
        } else if (buttonText === '2') {
            // Button 2 = Recognized (status=1)
            newStatus = 1;
            newExtendedStatus = null;
        } else if (buttonText === '3') {
            // Button 3 = Familiar (status=2)
            newStatus = 2;
            newExtendedStatus = null;
        } else if (buttonText === '4') {
            // Button 4 = Learned (status=3, extended_status=0)
            newStatus = 3;
            newExtendedStatus = 0;
        } else {
            console.error(`[word_popup] Unknown status button: ${buttonText}`);
            return;
        }
        
        console.log(`[word_popup] Updating status for '${wordText}' to:`, { status: newStatus, extended_status: newExtendedStatus });
        
        // Get current data to preserve existing tags
        const currentData = await getCurrentLingQData(wordText);
        const currentTags = currentData.tags || [];
        
        // Update local storage (preserve existing tags)
        console.log(`[word_popup] About to update local storage for '${wordText}' with status:`, newStatus, 'extended_status:', newExtendedStatus, 'preserving tags:', currentTags);
        await updateLocalLingQData(wordText, newStatus, newExtendedStatus, currentTags);
        console.log(`[word_popup] Finished updating local storage for '${wordText}'`);
        
        // Update UI immediately for better responsiveness
        const popup = document.querySelector('.word-popup');
        if (popup) {
            // Create word data object for immediate highlighting
            const immediateWordData = {
                found: true,
                status: newStatus,
                extended_status: newExtendedStatus,
                tags: currentTags
            };
            highlightCurrentStatusAndTags(popup, immediateWordData);
        }
        
        // Update just the clicked word's underline without re-rendering entire subtitle
        updateWordUnderline(wordText, newStatus, newExtendedStatus);
        
        // Update server in the background (don't await)
        if (newStatus !== null) {
            updateServerLingQData(wordText, newStatus, newExtendedStatus, currentTags).catch(error => {
                console.error('[word_popup] Background server update failed:', error);
            });
        } else {
            // Mark as deleted using status: -1
            updateServerLingQData(wordText, -1, 0, currentTags).catch(error => {
                console.error('[word_popup] Background server update failed:', error);
            });
        }
        
        // Add Notion entry when word is marked as learned (status 4)
        if (buttonText === '4') {
            addNotionWordTrackerEntry(wordText).catch(error => {
                console.error('[word_popup] Notion API update failed:', error);
            });
        }
        
    } catch (error) {
        console.error('[word_popup] Error updating word status:', error);
    }
}

/**
 * Toggles a tag for a word based on button click.
 * Adds or removes the tag from both local storage and server.
 * @param {string} wordText - The Chinese word to update
 * @param {string} tagText - The tag text to toggle
 * @returns {Promise<void>}
 */
async function toggleWordTag(wordText, tagText) {
    try {
        console.log(`[word_popup] Toggling tag '${tagText}' for word '${wordText}'`);
        
        // Get current LingQ data
        const currentData = await getCurrentLingQData(wordText);
        const currentTags = currentData.tags || [];
        
        // Toggle the tag
        let newTags;
        if (currentTags.includes(tagText)) {
            // Remove tag
            newTags = currentTags.filter(tag => tag !== tagText);
            console.log(`[word_popup] Removing tag '${tagText}' from '${wordText}'`);
        } else {
            // Add tag
            newTags = [...currentTags, tagText];
            console.log(`[word_popup] Adding tag '${tagText}' to '${wordText}'`);
        }
        
        // Update local storage
        await updateLocalLingQData(wordText, currentData.status, currentData.extended_status, newTags);
        
        // Update UI immediately for better responsiveness
        const popup = document.querySelector('.word-popup');
        if (popup) {
            // Create word data object for immediate highlighting
            const immediateWordData = {
                found: true,
                status: currentData.status,
                extended_status: currentData.extended_status,
                tags: newTags
            };
            highlightCurrentStatusAndTags(popup, immediateWordData);
        }
        
        // Update server in the background (don't await)
        updateServerLingQData(wordText, currentData.status, currentData.extended_status, newTags).catch(error => {
            console.error('[word_popup] Background server update failed:', error);
        });
        
    } catch (error) {
        console.error('[word_popup] Error toggling word tag:', error);
    }
}

/**
 * Updates LingQ data in local storage for a word.
 * @param {string} wordText - The Chinese word to update
 * @param {number|null} status - The new status value
 * @param {number|null} extendedStatus - The new extended status value
 * @param {Array<string>} tags - The new tags array
 * @returns {Promise<void>}
 */
async function updateLocalLingQData(wordText, status, extendedStatus, tags) {
    try {
        console.log(`[word_popup] Loading current LingQ terms from storage...`);
        const lingqTerms = await window.lingqData.loadLingQTerms();
        console.log(`[word_popup] Current LingQ terms loaded:`, Object.keys(lingqTerms).length, 'terms');
        
        if (status === null) {
            // Remove word from LingQ data
            delete lingqTerms[wordText];
            console.log(`[word_popup] Removed '${wordText}' from local LingQ data`);
        } else {
            // Update or add word to LingQ data
            lingqTerms[wordText] = {
                status: status,
                extended_status: extendedStatus,
                tags: tags || []
            };
            console.log(`[word_popup] Updated local LingQ data for '${wordText}':`, lingqTerms[wordText]);
        }
        
        // Save updated data back to local storage
        console.log(`[word_popup] Saving updated LingQ terms to storage...`);
        await window.lingqData.saveLingQTerms(lingqTerms);
        console.log(`[word_popup] Successfully saved LingQ terms to storage`);
        
        // Also update the global window.lingqTerms to keep it in sync
        window.lingqTerms = lingqTerms;
        console.log(`[word_popup] Updated global window.lingqTerms`);
        
        // Recalculate and update LingQ status percentages in the control panel
        if (window.subtitleList && window.updateStatusPercentagesDisplay && typeof calculateLingQStatusPercentages === "function") {
            const percentages = calculateLingQStatusPercentages(window.subtitleList, window.lingqTerms);
            window.updateStatusPercentagesDisplay(percentages);
        }
        
    } catch (error) {
        console.error('[word_popup] Error updating local LingQ data:', error);
        throw error;
    }
}

/**
 * Updates the underline color for a specific word without re-rendering the entire subtitle.
 * Finds all instances of the word in the current subtitle and updates their styling.
 * @param {string} wordText - The Chinese word to update
 * @param {number|null} status - The new status value
 * @param {number|null} extendedStatus - The new extended status value
 * @returns {void}
 */
function updateWordUnderline(wordText, status, extendedStatus) {
    console.log(`[word_popup] updateWordUnderline called for '${wordText}' with status:`, status, 'extended_status:', extendedStatus);
    
    // Strip non-Chinese characters for consistent matching
    const chineseOnly = (wordText.match(/[\u4e00-\u9fff]+/g) || []).join('');
    
    // Find all word elements with this text
    const wordElements = document.querySelectorAll('.subtitle-word');
    console.log(`[word_popup] Found ${wordElements.length} subtitle word elements`);
    
    let foundAndUpdated = false;
    wordElements.forEach(element => {
        // Check if this element contains the target word
        const elementText = element.textContent.trim();
        console.log(`[word_popup] Checking element with text: '${elementText}' against target: '${wordText}'`);
        
        // More robust matching - check if the element contains the target word
        // This handles cases where there might be extra whitespace or the text is nested
        // Also extract just the Chinese characters from the element text for comparison
        const elementChineseOnly = (elementText.match(/[\u4e00-\u9fff]+/g) || []).join('');
        console.log(`[word_popup] Element Chinese only: '${elementChineseOnly}'`);
        
        if (elementText === wordText || elementText.includes(wordText) || elementChineseOnly === chineseOnly) {
            // Update the underline color based on new status
            const config = window.subtitleConfig || {};
            if (config.lingqStatus === "on") {
                let underlineColor = null;
                
                if (status !== null) {
                    // Word is in LingQ data, use its status
                    if (/[\u4e00-\u9fff]/.test(wordText)) { // Check if word is Chinese
                        switch (status) {
                            case 3:
                                if (extendedStatus === 0 || extendedStatus === null) {
                                    underlineColor = "rgba(128, 128, 128, 0.3)";
                                } else {
                                    underlineColor = null;
                                }
                                break;
                            case 2: underlineColor = "rgba(255,230,0,0.2)"; break;    // Familiar — very light yellow
                            case 1: underlineColor = "rgba(255,230,0,0.5)"; break;    // Learning — lighter yellow
                            case 0: underlineColor = "#ffe600"; break;                // New — bright yellow
                            default: underlineColor = "blue"; break;
                        }
                    }
                } else {
                    // Word is not in LingQ data, underline in blue
                    underlineColor = "blue";
                }
                
                // Update the underline
                if (underlineColor) {
                    element.style.borderBottom = `0.1em solid ${underlineColor}`;
                    element.style.paddingBottom = "2px";
                    element.style.borderRadius = "0.05em";
                } else {
                    // Remove underline if no color should be applied
                    element.style.borderBottom = "";
                    element.style.paddingBottom = "";
                    element.style.borderRadius = "";
                }
                foundAndUpdated = true;
                console.log(`[word_popup] Successfully updated underline for '${wordText}' to color:`, underlineColor);
            }
        }
    });
    
    if (!foundAndUpdated) {
        console.log(`[word_popup] WARNING: No word elements found matching '${wordText}'`);
    }
}

/**
 * Updates LingQ data on the server via background script to avoid CORS issues.
 * @param {string} wordText - The Chinese word to update
 * @param {number} status - The new status value
 * @param {number|null} extendedStatus - The new extended status value
 * @param {Array<string>} tags - The new tags array
 * @returns {Promise<void>}
 */
async function updateServerLingQData(wordText, status, extendedStatus, tags) {
    try {
        // Prepare the update data
        const updateData = {
            status: status,
            extended_status: extendedStatus,
            tags: tags || []
        };
        
        console.log(`[word_popup] Updating server LingQ data for '${wordText}':`, updateData);
        
        // Send message to background script to search/import/update
        const response = await chrome.runtime.sendMessage({
            action: 'updateLingQTerm',
            wordText: wordText,
            updateData: updateData
        });
        
        if (response.success) {
            console.log(`[word_popup] Successfully updated server LingQ data for '${wordText}'`);
        } else {
            throw new Error(`Server update failed: ${response.error}`);
        }
        
    } catch (error) {
        console.error('[word_popup] Error updating server LingQ data:', error);
        throw error;
    }
}

/**
 * Adds or updates a word entry in the Notion word tracker database.
 * @param {string} wordText - The Chinese word to add to Notion
 * @returns {Promise<void>}
 */
async function addNotionWordTrackerEntry(wordText) {
    try {
        console.log(`[word_popup] Adding word '${wordText}' to Notion tracker`);
        
        // Get current date in local timezone
        const today = new Date();
        const localDate = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        // Send message to background script to create/update Notion entry
        const response = await chrome.runtime.sendMessage({
            action: 'addNotionWordTrackerEntry',
            wordText: wordText,
            status: '4',
            date: localDate
        });
        
        if (response.success) {
            console.log(`[word_popup] Successfully added word '${wordText}' to Notion tracker`);
            console.log(`[word_popup] Action: ${response.action}`); // 'created' or 'updated'
        } else {
            throw new Error(`Notion update failed: ${response.error}`);
        }
        
    } catch (error) {
        console.error('[word_popup] Error adding word to Notion tracker:', error);
        throw error;
    }
}



//////////////////////////////
// 6. POPUP EXPORT/INIT
//////////////////////////////

window.initWordPopup = initWordPopup;