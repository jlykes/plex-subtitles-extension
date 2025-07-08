// word_popup.js
// Handles LingQ word click popup UI and event logic
// Phase 1: Scaffold structure for popup rendering and event handling

// === Initialization ===
function initWordPopup() {
    addWordClickListeners();
}

let lastPopupWordElement = null;

// === Add click listeners to words ===
function addWordClickListeners() {
    hideWordPopup();
    const wordSpans = document.querySelectorAll('.subtitle-word');
    wordSpans.forEach(span => {
        span.removeEventListener('click', handleWordClick);
        span.addEventListener('click', handleWordClick);
    });
}

function handleWordClick(event) {
    event.stopPropagation();
    const wordElement = event.currentTarget;
    hideWordPopup(); // Always close any existing popup
    showWordPopup(wordElement);
}

// === Render popup below clicked word ===
function showWordPopup(wordElement) {
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
    // Add to popup header, separated by another |
    let definitionHTML = '';
    if (definition) {
        definitionHTML = `<span class=\"popup-definition\" style=\"color:#fff;font-size:0.97em;margin:0;padding:0;\">${definition}</span>`;
    }

    const popup = document.createElement('div');
    popup.className = 'word-popup';
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

    popup.innerHTML = `
      <div class=\"popup-header\" style=\"
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
        gap:8px;\">
        <span class=\"popup-chinese\" style=\"margin:0;padding:0;font-size:1.13em;font-weight:600;letter-spacing:1px;\">${wordText}</span>
        <span style=\"color:#888;font-size:1.1em;margin:0 6px;padding:0;\">|</span>
        <span class=\"popup-pinyin\" style=\"margin:0;padding:0;\">${pinyin}</span>
        <span style=\"color:#888;font-size:1.1em;margin:0 6px;padding:0;\">|</span>
        <span style=\\"color:#888;font-size:1.1em;margin:0 6px;padding:0;\">${definitionHTML}</span>
        <span style=\"color:#888;font-size:1.1em;margin:0 6px;padding:0;\">|</span>
        <span class=\"popup-count\" style=\"color:#fff;font-size:0.97em;margin:0;padding:0;\">${count}</span>
      </div>
      <div class=\"status-row\" style=\"display:flex;gap:16px;justify-content:center;margin-bottom:6px;\">\n        <button class=\"status-btn\">0</button>\n        <button class=\"status-btn\">1</button>\n        <button class=\"status-btn\">2</button>\n        <button class=\"status-btn\">3</button>\n        <button class=\"status-btn\">4</button>\n        <button class=\"status-btn\">✓</button>\n      </div>\n      <div class=\"tag-row\" style=\"display:flex;flex-direction:column;gap:7px;justify-content:center;align-items:center;\">\n        <button class=\"tag-btn\">characters known</button>\n        <button class=\"tag-btn\">partial characters known</button>\n        <button class=\"tag-btn\">no characters known</button>\n      </div>\n    `;

    // Prevent popup from closing when clicking inside it
    popup.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Style status buttons (center content, thinner border)
    popup.querySelectorAll('.status-btn').forEach(btn => {
        btn.style.width = '38px';
        btn.style.height = '38px';
        btn.style.borderRadius = '50%';
        btn.style.border = '1px solid #888'; // thinner border
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
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#444';
            btn.style.borderColor = '#fff';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#222';
            btn.style.borderColor = '#888';
        });
        btn.addEventListener('mousedown', () => {
            btn.style.background = '#666';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.background = '#444';
        });
    });

    // Style tag buttons
    popup.querySelectorAll('.tag-btn').forEach(btn => {
        btn.style.borderRadius = '18px';
        btn.style.border = '1px solid #888'; // thinner border
        btn.style.background = '#222';
        btn.style.color = '#fff';
        btn.style.fontSize = '0.98em';
        btn.style.padding = '7px 18px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'background 0.15s, border 0.15s, color 0.15s';
        btn.style.outline = 'none';
        btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.10)';
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#444';
            btn.style.borderColor = '#fff';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#222';
            btn.style.borderColor = '#888';
        });
        btn.addEventListener('mousedown', () => {
            btn.style.background = '#666';
        });
        btn.addEventListener('mouseup', () => {
            btn.style.background = '#444';
        });
    });

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
    setTimeout(() => { popup.style.opacity = '1'; }, 10);

    // Remove any existing handler before adding a new one
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClickToClosePopup, true);
    }, 0);

    // TODO: Add event listeners for status/tag buttons
    // TODO: Highlight current status/tag
    // TODO: Animate popup appearance
}

// === Hide/close popup ===
function hideWordPopup() {
    const existing = document.querySelector('.word-popup');
    if (existing) existing.remove();
    lastPopupWordElement = null;
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
}

// === Export/init ===
// Call initWordPopup() on page load or when subtitles are loaded
// (Integration point to be added in main app logic)
window.initWordPopup = initWordPopup;

// Named handler for outside click
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