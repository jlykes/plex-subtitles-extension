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
        } else if (buttonText === '🗑️') {
            // Trashcan button = Ignored (red)
            return { background: '#f44336', text: 'white' };
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
        const buttonText = (btn.getAttribute('data-status-key') || btn.textContent || '').trim();
        let shouldHighlight = false;
        
        if (buttonText === '✓') {
            // Checkmark button - highlight if status is 3 and extended_status is 3 (Known)
            shouldHighlight = (wordData.status === 3 && wordData.extended_status === 3);
        } else if (buttonText === '🗑️') {
            // Trashcan button - highlight if status is -1 (Ignored)
            shouldHighlight = (wordData.status === -1);
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
    
    // Highlight tag buttons (labels may be localized; LingQ stores English tag strings)
    const tagButtons = popup.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        const tagValue = (btn.getAttribute('data-tag-value') || btn.textContent || '').trim();
        let shouldHighlight = false;
        
        console.log(`[word_popup] Checking tag button value: '${tagValue}'`);
        console.log(`[word_popup] Word tags:`, wordData.tags);
        
        shouldHighlight = Boolean(tagValue && wordData.tags && wordData.tags.includes(tagValue));
        console.log(`[word_popup] '${tagValue}' should highlight:`, shouldHighlight);
        
        if (shouldHighlight) {
            // Get colors from the reusable function
            const colors = getHighlightColors(tagValue, false);
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
    if (isAnyMiningDrawerOpen()) return;
    console.log('[word_popup] showWordPopup called for:', wordElement.innerText);
    console.log('[word_popup] Stack trace:', new Error().stack);
    // Always skip re-render: replacing the subtitle DOM would detach `wordElement`
    // (e.g. second word click, fullscreen reposition).
    hideWordPopup(true);
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
    let count = '本视频 N/A 次';
    if (window.subtitleList && typeof window.extractAllWordsFromSubtitles === 'function') {
        const allWords = window.extractAllWordsFromSubtitles(window.subtitleList);
        const num = allWords.filter(w => w === wordText).length;
        count = `本视频 ${num.toLocaleString()} 次`;
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

    // Remove any existing handler before adding a new one (try both capture and bubble phases)
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
    document.removeEventListener('click', handleDocumentClickToClosePopup, false);
    
    // Add click outside to close (use capture phase to catch clicks early)
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClickToClosePopup, true);
    }, 0);

    // Add button click handlers for status and tag updates
    addButtonClickHandlers(popup, wordText, wordElement);
}

/**
 * Hides and removes the current word popup from the DOM.
 * Also cleans up event listeners and resets the last popup word element reference.
 * @param {boolean} skipReRender - If true, skip re-rendering the subtitle (used when called from addWordClickListeners to prevent loops)
 * @returns {void}
 */
function hideWordPopup(skipReRender = false) {
    console.log('[word_popup] hideWordPopup called', skipReRender ? '(skipReRender=true)' : '');
    console.log('[word_popup] lastPopupWordElement before nulling:', lastPopupWordElement);
    const existing = document.querySelector('.word-popup');
    const wasOpen = existing !== null;
    
    if (existing) existing.remove();
    
    // Remove highlight from the previously active word
    if (lastPopupWordElement) {
        lastPopupWordElement.style.backgroundColor = '';
        lastPopupWordElement.style.borderRadius = '';
    }
    
    lastPopupWordElement = null;
    console.log('[word_popup] lastPopupWordElement set to null');
    // Remove both capture and bubble phase listeners
    document.removeEventListener('click', handleDocumentClickToClosePopup, true);
    document.removeEventListener('click', handleDocumentClickToClosePopup, false);
    
    // Re-render subtitle when popup closes to reflect any tag/status changes
    // Skip re-render if called from addWordClickListeners to prevent infinite loop
    if (!skipReRender && wasOpen && window.reRenderCurrentSubtitle) {
        window.reRenderCurrentSubtitle();
    }
}

//////////////////////////////
// 3. POPUP SYLING AND POSITIONING
//////////////////////////////

let lastPopupWordElement = null;
let currentCharacterMiningDrawer = null;
let currentCharacterMiningEscHandler = null;
let currentCharacterMiningImageModal = null;
let isCharacterMiningDrawerOpen = false;
let currentSentenceMiningDrawer = null;
let currentSentenceMiningEscHandler = null;
let isSentenceMiningDrawerOpen = false;

/** Capture phase so Escape closes the image modal before the browser exits video fullscreen (Plex). */
const MINING_ESCAPE_KEYDOWN_CAPTURE = true;

function isAnyMiningDrawerOpen() {
    return (
        isCharacterMiningDrawerOpen ||
        Boolean(window._characterMiningDrawerOpen) ||
        isSentenceMiningDrawerOpen ||
        Boolean(window._sentenceMiningDrawerOpen)
    );
}

/** Status button keys and Chinese tooltips (aligned with chinese_ereader StatusRow labels). */
const STATUS_BUTTON_META = [
    { key: '🗑️', title: '忽略' },
    { key: '0', title: '未见' },
    { key: '1', title: '新词' },
    { key: '2', title: '学习中' },
    { key: '3', title: '较熟' },
    { key: '4', title: '已学' },
    { key: '✓', title: '已掌握' }
];

/**
 * Builds the current subtitle line as plain Chinese by walking sibling `.subtitle-word` nodes.
 * @param {HTMLElement} wordElement - A `.subtitle-word` span from the subtitle main line
 * @returns {string}
 */
function getSubtitleLinePlainFromWordElement(wordElement) {
    const mainLine = wordElement && wordElement.parentElement;
    if (!mainLine) return '';
    const wordSpans = mainLine.querySelectorAll(':scope > .subtitle-word');
    if (!wordSpans || wordSpans.length === 0) return '';
    const segments = [];
    wordSpans.forEach((w) => {
        const raw = w.innerText || '';
        const hanzi = (raw.match(/[\u4e00-\u9fff]+/g) || []).join('');
        segments.push(hanzi);
    });
    return segments.join('');
}

/**
 * Copies the full subtitle line to the clipboard; optional label element shows brief feedback.
 * @param {HTMLElement} wordElement
 * @param {HTMLButtonElement|HTMLElement|null} labelEl
 * @returns {Promise<void>}
 */
async function copySubtitleSentenceFromWordElement(wordElement, labelEl) {
    const text = getSubtitleLinePlainFromWordElement(wordElement);
    if (!text) return;
    const original = labelEl && labelEl.textContent;
    const done = () => {
        if (labelEl) {
            labelEl.textContent = '已复制';
            window.setTimeout(() => {
                if (labelEl) labelEl.textContent = original || '复制句子';
            }, 2000);
        }
    };
    try {
        await navigator.clipboard.writeText(text);
        done();
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            done();
        } catch {
            /* ignore */
        }
    }
}

function getCharacterPinyinMapFromWord(wordText, pinyinText) {
    const map = {};
    const chars = Array.from(wordText || '').filter((char) => /[\u4e00-\u9fff]/.test(char));
    const syllables = String(pinyinText || '').split(/\s+/).map((s) => s.trim()).filter(Boolean);
    const count = Math.min(chars.length, syllables.length);
    for (let i = 0; i < count; i += 1) {
        if (!map[chars[i]]) map[chars[i]] = syllables[i];
    }
    return map;
}

function getLocalLingqDisplayScore(term) {
    if (!term || !window.lingqTerms || typeof window.lingqTerms !== 'object') return 0;
    const normalized = (String(term).match(/[\u4e00-\u9fff]+/g) || []).join('');
    if (!normalized) return 0;
    const word = window.lingqTerms[normalized];
    if (!word) return 0;
    if (word.status === 3 && word.extended_status === 3) return 5;
    if (word.status === 3) return 4;
    if (word.status === 2) return 3;
    if (word.status === 1) return 2;
    if (word.status === 0) return 1;
    return 0;
}

async function generateCharacterCardViaBackground(payload) {
    const apiBaseUrl = (window.characterMiningApiBaseUrl || 'http://localhost:3001/api');
    const response = await chrome.runtime.sendMessage({
        action: 'generateCharacterCard',
        apiBaseUrl,
        ...payload
    });
    if (!response || !response.success) {
        throw new Error(response?.error || 'Character generation failed');
    }
    return response.payload;
}

async function generateSentenceCardViaBackground(payload) {
    const apiBaseUrl = window.characterMiningApiBaseUrl || 'http://localhost:3001/api';
    const response = await chrome.runtime.sendMessage({
        action: 'generateSentenceCard',
        apiBaseUrl,
        ...payload
    });
    if (!response || !response.success) {
        throw new Error(response?.error || 'Sentence generation failed');
    }
    return response.payload;
}

/** Map proxy sentence payload into the same card shape used by the character mining UI. */
function normalizeSentenceMiningCardData(data, fallbackSentence) {
    const d = data && typeof data === 'object' ? data : {};
    const rawSentence = String(
        d.sentence ?? d.sentence_zh ?? d.hanzi ?? d.full_sentence ?? d.text ?? fallbackSentence ?? ''
    ).trim();
    const zhPlain = stripHtmlToPlainTextMining(rawSentence) || String(fallbackSentence ?? '').trim();
    const sentenceHtmlStored = String(d.sentence_html ?? d.sentenceHtml ?? d.html_sentence ?? '').trim();
    const sentenceHtml =
        sentenceHtmlStored ||
        (rawSentence.includes('<') && /\btarget-word\b/.test(rawSentence) ? rawSentence : '');
    const targetWord = String(
        d.target_word ?? d.targetWord ?? d.focus_word ?? d.focusWord ?? d.word ?? ''
    ).trim();
    const wordPinyin = String(
        d.word_pinyin ?? d.wordPinyin ?? d.target_pinyin ?? d.focus_pinyin ?? d.pinyin_word ?? ''
    ).trim();
    let sentencePinyin = String(
        d.sentence_pinyin ?? d.pinyin_sentence ?? d.full_sentence_pinyin ?? d.sentencePinyin ?? ''
    ).trim();
    const genericPinyin = String(d.pinyin ?? '').trim();
    if (!sentencePinyin) sentencePinyin = genericPinyin;
    const wordPinyinOut = wordPinyin || genericPinyin;
    const sentenceTranslation = String(
        d.translation ?? d.sentence_translation ?? d.sentenceTranslation ?? d.english_sentence ?? d.meaning ?? ''
    ).trim();
    const wordDef = String(
        d.word_definition ?? d.wordDefinition ?? d.word_meaning ?? d.gloss ?? d.dict_definition ?? ''
    ).trim();
    const defGeneric = String(d.definition ?? '').trim();
    const definition = sentenceTranslation || (wordDef ? '' : defGeneric);
    const word_definition = wordDef || (sentenceTranslation ? defGeneric : '');
    const toneRaw = Number(d.tone);
    const tone = Number.isFinite(toneRaw) && toneRaw >= 1 && toneRaw <= 5 ? toneRaw : 0;
    return {
        hanzi: zhPlain,
        sentence_html: sentenceHtml || null,
        target_word: targetWord,
        word_pinyin: wordPinyinOut,
        word_definition,
        pinyin: sentencePinyin,
        tone,
        definition,
        notes: String(d.notes ?? d.note ?? '').trim(),
        cloze: String(d.cloze ?? d.cloze_sentence ?? d.clozeSentence ?? '').trim(),
        components: String(d.components ?? d.grammar ?? d.structure ?? d.breakdown ?? ''),
        related: String(d.related ?? d.synonyms ?? '').trim(),
        common_words: String(d.common_words ?? d.vocabulary ?? d.vocab ?? ''),
        image_prompt: '',
        memory_blurb: String(d.memory_blurb ?? ''),
        anki_story_html: '',
        source: String(d.source ?? '')
    };
}

/** Best-effort current media label from the Plex web tab (document.title). */
function getPlexMediaTitleForSourceSync() {
    const t = document.title?.trim() || '';
    if (!t || /^plex$/i.test(t)) return '';
    const stripped = t.replace(/\s*[-\u2013\u2014|:]\s*Plex(?:\s+Web)?\s*$/i, '').trim();
    return stripped || t;
}

const COMMON_COMPONENT_GLOSSES = {
    '一': 'one',
    '丨': 'line',
    '丶': 'dot',
    '丿': 'slash',
    '乙': 'second',
    '亅': 'hook',
    '二': 'two',
    '亠': 'lid',
    '人': 'person',
    '亻': 'person',
    '儿': 'legs',
    '入': 'enter',
    '八': 'eight',
    '冂': 'down box',
    '冖': 'cover',
    '冫': 'ice',
    '几': 'table',
    '凵': 'open box',
    '刀': 'knife',
    '刂': 'knife',
    '力': 'power',
    '勹': 'wrap',
    '匕': 'spoon',
    '匚': 'box',
    '十': 'ten',
    '卜': 'divination',
    '卩': 'seal',
    '厂': 'cliff',
    '厶': 'private',
    '又': 'again',
    '口': 'mouth',
    '囗': 'enclosure',
    '土': 'earth',
    '士': 'scholar',
    '夂': 'go',
    '夕': 'evening',
    '大': 'big',
    '女': 'woman',
    '子': 'child',
    '宀': 'roof',
    '寸': 'inch',
    '小': 'small',
    '尢': 'lame',
    '尸': 'corpse',
    '山': 'mountain',
    '巾': 'cloth',
    '干': 'dry',
    '幺': 'tiny',
    '广': 'shelter',
    '廴': 'stride',
    '廾': 'hands',
    '弋': 'shoot',
    '弓': 'bow',
    '彐': 'snout',
    '彡': 'bristle',
    '彳': 'step',
    '心': 'heart',
    '忄': 'heart',
    '戈': 'spear',
    '戶': 'door',
    '户': 'door',
    '手': 'hand',
    '扌': 'hand',
    '攴': 'tap',
    '攵': 'tap',
    '文': 'writing',
    '斗': 'dipper',
    '斤': 'axe',
    '方': 'direction',
    '日': 'sun',
    '曰': 'say',
    '月': 'moon',
    '木': 'wood',
    '欠': 'lack',
    '止': 'stop',
    '歹': 'death',
    '殳': 'weapon',
    '母': 'mother',
    '比': 'compare',
    '毛': 'fur',
    '氏': 'clan',
    '气': 'air',
    '水': 'water',
    '氵': 'water',
    '火': 'fire',
    '灬': 'fire',
    '爪': 'claw',
    '爫': 'claw',
    '父': 'father',
    '爻': 'lines',
    '片': 'slice',
    '牙': 'tooth',
    '牛': 'cow',
    '牜': 'cow',
    '犬': 'dog',
    '犭': 'dog',
    '玉': 'jade',
    '王': 'jade',
    '田': 'field',
    '疒': 'sickness',
    '癶': 'footsteps',
    '白': 'white',
    '皮': 'skin',
    '皿': 'dish',
    '目': 'eye',
    '矛': 'spear',
    '矢': 'arrow',
    '石': 'stone',
    '示': 'spirit',
    '礻': 'spirit',
    '禾': 'grain',
    '穴': 'cave',
    '立': 'stand',
    '竹': 'bamboo',
    '米': 'rice',
    '糸': 'silk',
    '纟': 'silk',
    '缶': 'jar',
    '网': 'net',
    '罒': 'net',
    '羊': 'sheep',
    '羽': 'feather',
    '老': 'old',
    '而': 'and',
    '耒': 'plow',
    '耳': 'ear',
    '聿': 'brush',
    '肉': 'meat',
    '月肉': 'meat',
    '臣': 'minister',
    '自': 'self',
    '至': 'arrive',
    '臼': 'mortar',
    '舌': 'tongue',
    '舛': 'oppose',
    '舟': 'boat',
    '艮': 'stopping',
    '色': 'color',
    '艸': 'grass',
    '艹': 'grass',
    '虍': 'tiger',
    '虫': 'insect',
    '血': 'blood',
    '行': 'walk',
    '衣': 'clothing',
    '衤': 'clothing',
    '西': 'west',
    '見': 'see',
    '见': 'see',
    '角': 'horn',
    '言': 'speech',
    '讠': 'speech',
    '谷': 'valley',
    '豆': 'bean',
    '豕': 'pig',
    '貝': 'shell',
    '贝': 'shell',
    '赤': 'red',
    '走': 'walk',
    '足': 'foot',
    '車': 'cart',
    '车': 'cart',
    '辛': 'bitter',
    '辶': 'walk',
    '邑': 'city',
    '阝': 'mound',
    '酉': 'wine',
    '釆': 'distinguish',
    '里': 'village',
    '金': 'metal',
    '钅': 'metal',
    '門': 'gate',
    '门': 'gate',
    '隹': 'bird',
    '雨': 'rain',
    '青': 'blue-green',
    '非': 'wrong',
    '面': 'face',
    '革': 'leather',
    '韋': 'leather',
    '韦': 'leather',
    '音': 'sound',
    '頁': 'page',
    '页': 'page',
    '風': 'wind',
    '风': 'wind',
    '飛': 'fly',
    '飞': 'fly',
    '食': 'food',
    '饣': 'food',
    '首': 'head',
    '香': 'fragrance',
    '馬': 'horse',
    '马': 'horse',
    '骨': 'bone',
    '高': 'tall',
    '髟': 'hair',
    '鬥': 'fight',
    '斗鬥': 'fight',
    '鬯': 'sacrificial wine',
    '鬲': 'cauldron',
    '鬼': 'ghost',
    '魚': 'fish',
    '鱼': 'fish',
    '鳥': 'bird',
    '鸟': 'bird',
    '鹵': 'salt',
    '鹿': 'deer',
    '麥': 'wheat',
    '麦': 'wheat',
    '麻': 'hemp',
    '黃': 'yellow',
    '黄': 'yellow',
    '黍': 'millet',
    '黑': 'black',
    '黹': 'embroidery',
    '黽': 'frog',
    '黾': 'frog',
    '鼎': 'tripod',
    '鼓': 'drum',
    '鼠': 'rat',
    '鼻': 'nose',
    '齊': 'even',
    '齐': 'even',
    '齒': 'tooth',
    '齿': 'tooth',
    '龍': 'dragon',
    '龙': 'dragon',
    '龜': 'turtle',
    '龟': 'turtle'
};

function extractComponentEntries(text) {
    const entries = [];
    const seen = new Set();
    const source = String(text || '');
    const re = /([\u3400-\u9fff])\s*(?:\(([^)]+)\))?/g;
    let match;
    while ((match = re.exec(source))) {
        const char = match[1];
        const gloss = String(match[2] || '').trim();
        if (seen.has(char)) continue;
        seen.add(char);
        entries.push({ char, gloss });
    }
    return entries;
}

function getImagePromptGlossForComponent(char, imagePrompt) {
    if (!char || !imagePrompt) return '';
    const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`${escaped}\\s+is\\s+(?:the\\s+|a\\s+|an\\s+|her\\s+|his\\s+)?([^,.;]+)`, 'i'),
        new RegExp(`${escaped}\\s+represents\\s+(?:the\\s+|a\\s+|an\\s+)?([^,.;]+)`, 'i'),
        new RegExp(`${escaped}\\s+as\\s+(?:the\\s+|a\\s+|an\\s+)?([^,.;]+)`, 'i')
    ];
    for (const pattern of patterns) {
        const match = String(imagePrompt).match(pattern);
        if (match && match[1]) {
            return match[1].trim().replace(/\s+/g, ' ');
        }
    }
    return '';
}

function formatComponentEntry(char, gloss) {
    const cleanGloss = String(gloss || '').trim();
    return cleanGloss ? `${char} (${cleanGloss})` : char;
}

function buildComponentBreakdown(submittedSubcomponents, generatedComponents, imagePrompt) {
    const generated = String(generatedComponents || '').trim();
    const submittedEntries = extractComponentEntries(submittedSubcomponents);
    if (!submittedEntries.length) return generated;

    const generatedEntries = extractComponentEntries(generated);
    const generatedMap = new Map(generatedEntries.map((entry) => [entry.char, entry.gloss]));
    const submittedChars = submittedEntries.map((entry) => entry.char);
    const generatedHasAllSubmitted = submittedChars.every((char) => generatedMap.has(char));
    const generatedHasGlosses = generatedEntries.some((entry) => entry.gloss);
    if (generatedHasAllSubmitted && generatedHasGlosses) return generated;

    return submittedChars
        .map((char) => {
            const gloss =
                generatedMap.get(char) ||
                COMMON_COMPONENT_GLOSSES[char] ||
                getImagePromptGlossForComponent(char, imagePrompt) ||
                '';
            return formatComponentEntry(char, gloss);
        })
        .join(' + ');
}

function mergeSentenceMiningSourceIntoCard(host) {
    if (!host._sentenceMining || !host._miningState || !host._miningState.card) return;
    const inp = host.querySelector('.char-mining-source-input');
    if (!inp) return;
    const v = String(inp.value || '').trim();
    if (v) host._miningState.card.source = v;
}

function closeCharacterMiningDrawer() {
    closeCharacterMiningImageModal();
    if (currentCharacterMiningEscHandler) {
        window.removeEventListener('keydown', currentCharacterMiningEscHandler, MINING_ESCAPE_KEYDOWN_CAPTURE);
        currentCharacterMiningEscHandler = null;
    }
    if (currentCharacterMiningDrawer) {
        currentCharacterMiningDrawer.remove();
        currentCharacterMiningDrawer = null;
    }
    isCharacterMiningDrawerOpen = false;
    window._characterMiningDrawerOpen = false;
    if (!isSentenceMiningDrawerOpen && !window._sentenceMiningDrawerOpen) {
        setSubtitleControlPanelInteractivity(false);
    }
}

function closeSentenceMiningDrawer() {
    closeCharacterMiningImageModal();
    if (currentSentenceMiningEscHandler) {
        window.removeEventListener('keydown', currentSentenceMiningEscHandler, MINING_ESCAPE_KEYDOWN_CAPTURE);
        currentSentenceMiningEscHandler = null;
    }
    if (currentSentenceMiningDrawer) {
        currentSentenceMiningDrawer.remove();
        currentSentenceMiningDrawer = null;
    }
    isSentenceMiningDrawerOpen = false;
    window._sentenceMiningDrawerOpen = false;
    if (!isCharacterMiningDrawerOpen && !window._characterMiningDrawerOpen) {
        setSubtitleControlPanelInteractivity(false);
    }
}

function closeCharacterMiningImageModal() {
    if (!currentCharacterMiningImageModal) return false;
    currentCharacterMiningImageModal.remove();
    currentCharacterMiningImageModal = null;
    return true;
}

function isMiningImageModalKeyboardTargetEditable(event) {
    const t = event.target;
    if (!t || !(t instanceof Element)) return false;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(t.closest('[contenteditable="true"]'));
}

/**
 * Escape closes the preview when possible; Chrome often uses Esc for fullscreen first.
 * E always closes from this overlay unless focus is in a form field (rare while preview is up).
 * @returns {boolean} true if the key event was consumed.
 */
function tryCloseMiningImageModalFromKeyboard(event) {
    if (!currentCharacterMiningImageModal) return false;
    if (event.key === 'Escape') {
        closeCharacterMiningImageModal();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
    }
    if (event.key === 'e' || event.key === 'E') {
        if (isMiningImageModalKeyboardTargetEditable(event)) return false;
        closeCharacterMiningImageModal();
        event.preventDefault();
        event.stopPropagation();
        return true;
    }
    return false;
}

function openCharacterMiningImageModal(imageUrl) {
    if (!imageUrl) return;
    closeCharacterMiningImageModal();
    const modal = document.createElement('div');
    modal.className = 'char-mining-img-modal';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="char-mining-img-modal__backdrop" data-action="close-img-modal"></div>
      <div class="char-mining-img-modal__panel" role="dialog" aria-modal="true" aria-label="Image preview">
        <button type="button" class="char-mining-img-modal__close" data-action="close-img-modal" aria-label="Close image preview">×</button>
        <img class="char-mining-img-modal__image" src="${escapeHtmlMining(String(imageUrl))}" alt="Generated option preview" />
      </div>
      <p class="char-mining-img-modal__hint">Press <kbd>E</kbd> to close · <span class="char-mining-img-modal__hint-sub">Esc often exits Chrome fullscreen instead</span></p>
    `;
    modal.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.closest && target.closest('[data-action="close-img-modal"]')) {
            event.preventDefault();
            event.stopPropagation();
            closeCharacterMiningImageModal();
        }
    });
    modal.addEventListener('keydown', (e) => {
        e.stopPropagation();
    });
    modal.addEventListener('keyup', (e) => {
        e.stopPropagation();
    });
    document.body.appendChild(modal);
    currentCharacterMiningImageModal = modal;
    requestAnimationFrame(() => {
        try {
            modal.focus({ preventScroll: true });
        } catch {
            /* ignore */
        }
    });
}

/** Collapses the subtitle Key Info / control panel (same geometry as control.js hide). */
function hideSubtitleControlPanelForOverlay() {
    const panel = document.getElementById('subtitle-control-panel');
    if (!panel) return;
    panel.style.opacity = '0';
    panel.style.right = '-330px';
    panel.style.pointerEvents = 'none';
}

/**
 * While character mining is open, disable the right-edge hover trigger that can
 * still capture pointer/wheel input even when the panel itself is hidden.
 */
function setSubtitleControlPanelInteractivity(disabled) {
    const panel = document.getElementById('subtitle-control-panel');
    const trigger = document.getElementById('subtitle-panel-hover-trigger');
    if (disabled) {
        if (panel) {
            panel.style.opacity = '0';
            panel.style.right = '-330px';
            panel.style.pointerEvents = 'none';
        }
        if (trigger) {
            trigger.style.pointerEvents = 'none';
        }
    } else if (trigger) {
        trigger.style.pointerEvents = 'auto';
    }
}

/** Notion “Latest” options (same set as chinese_ereader SentenceMiningDrawer). */
const CHARACTER_MINING_NOTION_OPTIONS = ['→4', '4 →SRS', '3 →SRS', '2 →SRS', '1 →SRS', '0 →SRS', '🔄'];

function getCharacterMiningApiBase() {
    return String(window.characterMiningApiBaseUrl || 'http://localhost:3001/api').replace(/\/+$/, '');
}

async function characterMiningApiPost(path, body) {
    const rel = typeof path === 'string' && path.startsWith('/') ? path : `/${path || ''}`;
    const response = await chrome.runtime.sendMessage({
        action: 'characterMiningApiPost',
        apiBaseUrl: getCharacterMiningApiBase(),
        path: rel,
        body: body && typeof body === 'object' ? body : {}
    });
    if (!response || !response.success) {
        throw new Error(response?.error || 'Request failed');
    }
    return response.payload;
}

function escapeHtmlMining(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Strip tags for plain-text fields (LingQ, exports). */
function stripHtmlToPlainTextMining(html) {
    const s = String(html ?? '').trim();
    if (!s) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = s;
    return String(tmp.textContent || tmp.innerText || '').trim();
}

/**
 * Allow only text nodes and <span class="target-word">…</span> (eReader sentence HTML).
 * Returns a safe HTML string for innerHTML.
 */
function sanitizeSentenceCardHtml(html) {
    const raw = String(html ?? '').trim();
    if (!raw) return '';
    const doc = new DOMParser().parseFromString(`<div id="__sroot">${raw}</div>`, 'text/html');
    const root = doc.getElementById('__sroot');
    if (!root) return escapeHtmlMining(stripHtmlToPlainTextMining(raw));

    function process(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const t = node.textContent;
            return t ? [document.createTextNode(t)] : [];
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return [];
        const tag = node.tagName.toUpperCase();
        if (tag === 'SPAN' && /\btarget-word\b/.test(node.getAttribute('class') || '')) {
            const sp = document.createElement('span');
            sp.className = 'target-word';
            node.childNodes.forEach((ch) => {
                process(ch).forEach((n) => sp.appendChild(n));
            });
            return [sp];
        }
        const parts = [];
        node.childNodes.forEach((ch) => {
            parts.push(...process(ch));
        });
        return parts;
    }

    const holder = document.createElement('div');
    root.childNodes.forEach((ch) => {
        process(ch).forEach((n) => holder.appendChild(n));
    });
    return holder.innerHTML;
}

/** If API did not return HTML, wrap first occurrence of target in <span class="target-word">. */
function buildSentenceHtmlWithTargetWord(plainSentence, targetWord) {
    const plain = String(plainSentence ?? '');
    const tw = String(targetWord ?? '').trim();
    if (!tw) return escapeHtmlMining(plain);
    const idx = plain.indexOf(tw);
    if (idx < 0) return escapeHtmlMining(plain);
    return (
        escapeHtmlMining(plain.slice(0, idx)) +
        `<span class="target-word">${escapeHtmlMining(tw)}</span>` +
        escapeHtmlMining(plain.slice(idx + tw.length))
    );
}

function getSentenceCardPreviewHtml(c) {
    const stored = String(c.sentence_html ?? '').trim();
    if (stored && stored.includes('<')) {
        return sanitizeSentenceCardHtml(stored);
    }
    return buildSentenceHtmlWithTargetWord(c.hanzi || '', c.target_word || '');
}

function toneClassNameMining(tone) {
    const t = Number(tone);
    if (t >= 1 && t <= 5) return `tone-${t}`;
    return '';
}

function toneHexColorMining(tone) {
    const t = Number(tone);
    if (t === 1) return '#e53935';
    if (t === 2) return '#fdd835';
    if (t === 3) return '#43a047';
    if (t === 4) return '#1e88e5';
    return '#e4e4e7';
}

function colorizeStoryHtmlForToneMining(storyHtml, tone) {
    const html = String(storyHtml ?? '').trim();
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const toneColor = toneHexColorMining(tone);
    tmp.querySelectorAll('strong, b, span[data-keyword], span.story-keyword').forEach((el) => {
        el.style.color = toneColor;
        if (!el.style.fontWeight) el.style.fontWeight = '700';
    });
    return tmp.innerHTML;
}

function definitionTextToHtmlMining(definition) {
    return String(definition ?? '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((rawLine) => {
            const line = rawLine.trim();
            if (!line) return '';
            const match = line.match(
                /^(\((?:n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|num\.|measure word|particle|phrase|idiom|interj\.|onom\.|name)\))\s+(.+)$/i
            );
            if (!match) return escapeHtmlMining(line);
            const [, pos, meaning] = match;
            return `<span class="definition-pos">${escapeHtmlMining(pos)}</span> ${escapeHtmlMining(meaning)}`;
        })
        .filter(Boolean)
        .join('<br>');
}

function toCharacterCardPayloadMining(card) {
    const tone = Number.isFinite(Number(card.tone)) ? Number(card.tone) : 0;
    const storyHtml = colorizeStoryHtmlForToneMining(card.anki_story_html, tone);
    return {
        hanzi: String(card.hanzi ?? ''),
        pinyin: String(card.pinyin ?? ''),
        tone,
        definition: String(card.definition ?? ''),
        components: String(card.components ?? ''),
        related: String(card.related ?? ''),
        common_words: String(card.common_words ?? ''),
        image_prompt: String(card.image_prompt ?? ''),
        memory_blurb: String(card.memory_blurb ?? ''),
        anki_story_html: storyHtml
    };
}

/**
 * Body.card for sentence routes — must match character_anki_card_generator `sentenceMiningCardSchema`
 * (same object SentenceMiningDrawer sends as `card`).
 */
function toSentenceMiningCardPayloadForExport(card) {
    const stored = String(card.sentence_html ?? '').trim();
    let sentence =
        stored && stored.includes('<')
            ? sanitizeSentenceCardHtml(stored)
            : buildSentenceHtmlWithTargetWord(String(card.hanzi || ''), String(card.target_word || ''));
    sentence = String(sentence || '').trim();
    if (!sentence) sentence = String(card.hanzi || '').trim();
    return {
        sentence,
        target_word: String(card.target_word || '').trim(),
        pinyin: String(card.word_pinyin || card.pinyin || ''),
        definition: String(card.word_definition || ''),
        translation: String(card.definition || ''),
        related: String(card.related || '')
    };
}

function snapshotLingqScoreForAnkiTagsMining(st, displayScore) {
    const n = typeof displayScore === 'number' ? displayScore : 0;
    st.lingqDisplayScoreAtLookup = n;
}

function extraTagsForAnkiFromLingqSnapshotMining(st) {
    const s = st.lingqDisplayScoreAtLookup;
    const n = typeof s === 'number' ? s : 0;
    return n === 5 ? ['AltMeaning'] : [];
}

function normalizedImageDataUrlForSubmitMining(value) {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed.startsWith('data:image/')) return null;
    const maxBytes = 12 * 1024 * 1024;
    const match = /^data:[^;]+;base64,([\s\S]+)$/.exec(trimmed);
    if (!match) return trimmed;
    const b64 = match[1].replace(/\s/g, '');
    const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
    const bytes = Math.floor((b64.length * 3) / 4) - padding;
    if (bytes > maxBytes) return null;
    return trimmed;
}

function createDefaultCharacterMiningState() {
    return {
        card: null,
        imageDataUrl: null,
        imageGenOptions: [],
        imageGenModel: 'gemini-3.1-flash-image-preview',
        imageGenLoading: false,
        imageGenError: '',
        imageGenPartial: '',
        lingqBlock: null,
        /** LingQ `displayScore` right after lookup when the card was built; used for Anki `AltMeaning`, unchanged by Mark Known. */
        lingqDisplayScoreAtLookup: null,
        lingqLoading: false,
        lingqMarkLoading: false,
        lingqMarkError: '',
        notionLatest: '→4',
        notionLoading: false,
        notionAdded: false,
        notionError: '',
        ankiLoading: false,
        ankiAdded: false,
        ankiError: ''
    };
}

function ensureCharacterMiningEreaderCss() {
    if (document.getElementById('plex-character-mining-ereader-css')) return;
    const style = document.createElement('style');
    style.id = 'plex-character-mining-ereader-css';
    style.textContent = `
.char-mining-aux-box{border:1px solid #262626;border-radius:6px;background:rgba(38,38,38,0.6);padding:12px;font-size:12px;color:#d4d4d8}
.char-mining-aux-title{font-weight:600;color:#e5e7eb;margin-bottom:6px}
.char-mining-aux-body{margin-top:4px;font-size:14px;color:#d1d5db;white-space:pre-wrap;word-break:break-word}
.char-mining-gen-images-btn{width:100%;min-height:40px;border-radius:6px;border:1px solid #404040;background:#262626;color:#fff;padding:8px 12px;font-size:0.875rem;font-weight:500;cursor:pointer;margin-top:4px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.2}
.char-mining-gen-images-btn:disabled{opacity:0.4;cursor:not-allowed}
.char-mining-err{color:#fca5a5;font-size:12px;margin:6px 0 0}
.char-mining-warn{color:#fcd34d;font-size:12px;margin:6px 0 0}
.char-mining-img-grid-wrap{border:1px solid #262626;border-radius:6px;background:rgba(38,38,38,0.6);padding:12px;margin-top:8px}
.char-mining-lingq-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;border:1px solid #262626;border-radius:6px;background:rgba(38,38,38,0.6);padding:8px;min-height:0;font-size:12px;color:#d1d5db}
.char-mining-lingq-row button,.char-mining-lingq-row select{border:1px solid #404040;border-radius:4px;background:#262626;color:#fff;padding:4px 8px;min-height:28px;font-size:12px;cursor:pointer}
.char-mining-lingq-row button:disabled,.char-mining-lingq-row select:disabled{opacity:0.4;cursor:not-allowed}
.char-mining-editable-wrap{border:1px solid #262626;border-radius:6px;background:rgba(38,38,38,0.6);padding:12px;margin-top:8px}
.char-mining-editable-title{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:8px}
.char-mining-editable-wrap label{display:block;width:100%;margin-top:10px}
.char-mining-editable-wrap label:first-of-type{margin-top:0}
.char-mining-field-label{font-size:12px;color:#d1d5db;margin-bottom:4px;display:block}
.char-mining-textarea{width:100%;box-sizing:border-box;border:1px solid #525252;border-radius:6px;background:rgba(64,64,64,0.7);color:#fff;padding:8px 10px;font-size:13px;resize:vertical}
.character-mining-preview{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Kaiti SC","STKaiti","KaiTi","SimKai",serif;text-align:center}
.character-mining-preview .hanzi{font-size:42px;font-weight:700;margin-top:10px;font-family:"Kaiti SC","STKaiti","KaiTi","SimKai","Songti SC",serif;color:#fafafa}
.character-mining-preview .hanzi.tone-1,.character-mining-preview .pinyin.tone-1{color:#e53935}
.character-mining-preview .hanzi.tone-2,.character-mining-preview .pinyin.tone-2{color:#fdd835}
.character-mining-preview .hanzi.tone-3,.character-mining-preview .pinyin.tone-3{color:#43a047}
.character-mining-preview .hanzi.tone-4,.character-mining-preview .pinyin.tone-4{color:#1e88e5}
.character-mining-preview .hanzi.tone-5,.character-mining-preview .pinyin.tone-5{color:#e4e4e7}
.character-mining-preview .components{font-size:15px;margin-top:10px;margin-bottom:20px;color:#a1a1aa}
.character-mining-preview .pinyin{font-size:26px;margin-top:12px;color:#e4e4e7}
.character-mining-preview .definition{margin-top:5px;font-size:19px;margin-bottom:16px;color:#d4d4d8;line-height:1.45;white-space:pre-line}
.character-mining-preview .definition-pos{color:#8b8b95;font-size:0.62em;font-weight:600;letter-spacing:0.02em}
.character-mining-preview .related-header,.character-mining-preview .common-header{font-size:12px;color:#a1a1aa;margin-bottom:6px;letter-spacing:1px;text-transform:uppercase}
.character-mining-preview .common-header{margin-top:18px}
.character-mining-preview .related-content,.character-mining-preview .common-content{font-size:14px;color:#c4c4cc;line-height:1.6;white-space:pre-wrap}
.character-mining-preview .related-content br,.character-mining-preview .common-content br{display:block;content:"";margin-top:0.42rem}
.character-mining-preview .image-slot{margin-top:20px}
.character-mining-preview .image-placeholder{display:inline-block;margin-top:12px;padding:24px 28px;max-width:300px;width:100%;box-sizing:border-box;border:1px dashed rgba(255,255,255,0.18);border-radius:8px;font-size:12px;line-height:1.45;color:#a1a1aa;background:rgba(0,0,0,0.22)}
.character-mining-preview .image-slot__paste-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:10px}
.character-mining-preview .image-slot__btn{font-size:12px;padding:0 12px;height:44px;min-height:44px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.22);color:#e4e4e7;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;box-sizing:border-box;margin:0;vertical-align:middle}
.character-mining-preview .image-slot__btn--primary{border-color:rgba(196,181,253,0.35);color:#ddd6fe}
.character-mining-preview .image-slot__file-input{display:none}
.character-mining-preview .image-slot__img{max-width:280px;width:100%;height:auto;display:block;margin:10px auto;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.35)}
.character-mining-preview .image-slot__filled{text-align:center}
.character-mining-preview .image-slot__actions{margin-top:10px;display:flex;justify-content:center}
.character-mining-preview .image-slot__btn{font-size:12px;padding:6px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.22);color:#e4e4e7;cursor:pointer}
.character-mining-preview .story{margin-top:12px;font-size:15px;line-height:1.5;text-align:center;max-width:450px;margin-left:auto;margin-right:auto;color:#a1a1aa}
.image-options-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.5rem;padding-top:4px}
.image-option-button{border:1px solid #525252;border-radius:0.5rem;overflow:hidden;padding:0;background:rgba(23,23,23,0.85);display:flex;flex-direction:column}
.image-option-button--selected{border-color:#d6c78f;box-shadow:0 0 0 1px rgba(214,199,143,0.35)}
.image-option-preview-btn{border:0;padding:0;margin:0;width:100%;display:block;cursor:zoom-in;background:transparent;line-height:0;overflow:hidden;flex-shrink:0}
.image-option-apply-btn{width:100%;border:0;border-top:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.45);color:#f3f4f6;padding:10px 8px 8px;font-size:10px;font-weight:500;text-align:center;cursor:pointer;line-height:1.35;flex-shrink:0;box-sizing:border-box}
.image-option-thumb{width:100%;height:5.5rem;object-fit:cover;display:block}
.character-mining-preview-shell{border:1px solid #262626;border-radius:6px;background:rgba(38,38,38,0.6);padding:12px;margin-top:8px}
.character-mining-preview .sentence-card-hanzi{font-size:20px;line-height:1.45;white-space:pre-wrap;word-break:break-word;max-width:100%;font-weight:600}
/* Sentence mining: Anki card *back* preview (eReader-style, centered) */
.sent-anki-back-preview{text-align:center;max-width:36rem;margin:0 auto;padding:16px 16px 24px;box-sizing:border-box}
.sent-anki-back-preview .sent-back-word-block{margin:0 0 4px;padding:0 6px}
.sent-anki-back-preview .sent-back-target{font-size:clamp(2rem,5vw,2.75rem);font-weight:700;font-family:"Inter","KaiTi-Web","Noto Serif SC","STKaiti","KaiTi","SimSun",serif;color:#f9fafb;line-height:1.2}
.sent-anki-back-preview .sent-back-word-pinyin{font-size:1.35rem;color:#d1d5db;margin-top:1rem;font-weight:400;letter-spacing:0}
.sent-anki-back-preview .sent-back-word-gloss{font-size:1.05rem;color:#f9fafb;margin-top:0.35rem;margin-bottom:1rem;line-height:1.5;white-space:pre-wrap}
.sent-anki-back-preview .sent-back-example-block{margin-top:0;padding-top:0}
.sent-anki-back-preview .sent-back-sentence{font-size:clamp(1.15rem,3vw,1.45rem);line-height:1.75;font-family:"Inter","KaiTi-Web","Noto Serif SC","STKaiti","KaiTi","SimSun",serif;color:#f9fafb;font-weight:500;word-break:break-word;max-width:36rem;margin:0 auto 0.75rem;padding:0 0.75rem}
.sent-anki-back-preview .sent-back-sentence .target-word{background:rgba(255,214,102,0.22);color:#fff;border-radius:5px;padding:1px 4px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.sent-anki-back-preview .sent-back-translation{font-size:0.9rem;color:#9ca3af;line-height:1.5;margin:0 auto;max-width:32rem;white-space:pre-wrap;font-weight:400}
.sent-anki-back-preview .sent-back-meta{margin-top:1.25rem}
.sent-anki-back-preview .sent-back-sec-label{font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;color:#9ca3af;font-weight:400;margin-bottom:0.35rem}
.sent-anki-back-preview .sent-back-sec-body{font-size:0.85rem;color:#d1d5db;line-height:1.45;white-space:pre-line}
.char-mining-img-modal{position:fixed;inset:0;z-index:10040}
.char-mining-img-modal__backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.72)}
.char-mining-img-modal__panel{position:absolute;inset:24px;display:flex;align-items:center;justify-content:center}
.char-mining-img-modal__image{max-width:min(94vw,1200px);max-height:calc(100vh - 72px);width:auto;height:auto;border-radius:12px;border:1px solid rgba(255,255,255,0.16);box-shadow:0 14px 46px rgba(0,0,0,0.52);background:#111}
.char-mining-img-modal__close{position:absolute;top:6px;right:6px;width:36px;height:36px;border-radius:999px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.66);color:#fff;font-size:23px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer}
.char-mining-img-modal__hint{position:absolute;left:12px;right:12px;bottom:10px;margin:0;text-align:center;font-size:12px;line-height:1.45;color:rgba(255,255,255,0.72);pointer-events:none;z-index:2}
.char-mining-img-modal__hint kbd{font:inherit;font-size:11px;padding:2px 7px;border-radius:4px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.22);box-shadow:none}
.char-mining-img-modal__hint-sub{opacity:0.88}
`;
    document.head.appendChild(style);
}

function readCharacterCardEditablesFromDom(host) {
    const out = host.querySelector('.char-mining-card-output');
    const st = host._miningState;
    if (!out || !st || !st.card) return;
    const c = st.card;
    const v = (sel) => {
        const el = out.querySelector(sel);
        return el ? el.value : undefined;
    };
    const co = v('.js-char-edit-components');
    const def = v('.js-char-edit-definition');
    const rel = v('.js-char-edit-related');
    const com = v('.js-char-edit-common');
    if (typeof co === 'string') c.components = co;
    if (typeof def === 'string') c.definition = def;
    if (typeof rel === 'string') c.related = rel;
    if (typeof com === 'string') c.common_words = com;
}

function readSentenceMiningCardEditablesFromDom(host) {
    const out = host.querySelector('.char-mining-card-output');
    const st = host._miningState;
    if (!out || !st || !st.card) return;
    const c = st.card;
    const v = (sel) => {
        const el = out.querySelector(sel);
        return el ? el.value : undefined;
    };
    const wdef = v('.js-sent-edit-definition');
    const tr = v('.js-sent-edit-translation');
    const rel = v('.js-sent-edit-related');
    if (typeof wdef === 'string') c.word_definition = wdef;
    if (typeof tr === 'string') c.definition = tr;
    if (typeof rel === 'string') c.related = rel;
}

function readMiningCardEditablesFromDom(host) {
    if (host._sentenceMining) readSentenceMiningCardEditablesFromDom(host);
    else readCharacterCardEditablesFromDom(host);
}

function syncCharacterMiningPreviewFromState(host) {
    const out = host.querySelector('.char-mining-card-output');
    const st = host._miningState;
    if (!out || !st || !st.card) return;
    const c = st.card;
    const root = out.querySelector('.character-mining-preview');
    if (!root) return;
    if (host._sentenceMining && root.classList.contains('sent-anki-back-preview')) {
        const setText = (sel, text) => {
            const el = root.querySelector(sel);
            if (el) el.textContent = text ?? '';
        };
        const setDefinition = (sel, text) => {
            const el = root.querySelector(sel);
            if (el) el.innerHTML = definitionTextToHtmlMining(text);
        };
        const sentEl = root.querySelector('.js-prev-sentence-html');
        if (sentEl) {
            sentEl.innerHTML = getSentenceCardPreviewHtml(c);
            sentEl.className = 'sent-back-sentence js-prev-sentence-html';
        }
        const twEl = root.querySelector('.js-prev-target-word');
        if (twEl) {
            twEl.textContent = c.target_word || '';
            twEl.className = 'sent-back-target js-prev-target-word';
        }
        setText('.js-prev-word-pinyin', c.word_pinyin || '');
        setDefinition('.js-prev-word-definition', c.word_definition || '');
        const fb = root.querySelector('.js-prev-focus-block');
        if (fb) {
            const showFocus = String(c.target_word || c.word_pinyin || c.word_definition || '').trim();
            fb.style.display = showFocus ? 'block' : 'none';
        }
        setText('.js-prev-definition', c.definition || '');
        const clozeW = root.querySelector('.js-prev-cloze-wrap');
        if (clozeW) {
            const has = String(c.cloze || '').trim();
            clozeW.style.display = has ? 'block' : 'none';
            setText('.js-prev-cloze', c.cloze || '');
        }
        const notesW = root.querySelector('.js-prev-notes-wrap');
        if (notesW) {
            const has = String(c.notes || '').trim();
            notesW.style.display = has ? 'block' : 'none';
            setText('.js-prev-notes', c.notes || '');
        }
        const relW = root.querySelector('.js-prev-related-wrap');
        if (relW) {
            const has = String(c.related || '').trim();
            relW.style.display = has ? 'block' : 'none';
            setText('.js-prev-related', c.related || '');
        }
        const srcW = root.querySelector('.js-prev-source-wrap');
        if (srcW) {
            const has = String(c.source || '').trim();
            srcW.style.display = has ? 'block' : 'none';
            setText('.js-prev-source', c.source || '');
        }
        return;
    }
    const tone = toneClassNameMining(c.tone);
    const setText = (sel, text) => {
        const el = root.querySelector(sel);
        if (el) el.textContent = text ?? '';
    };
    const hanzi = root.querySelector('.js-prev-hanzi');
    if (hanzi) {
        hanzi.textContent = c.hanzi || '';
        const sentCls = host._sentenceMining ? ' sentence-card-hanzi' : '';
        hanzi.className = `hanzi js-prev-hanzi ${tone}${sentCls}`.trim();
    }
    const compEl = root.querySelector('.js-prev-components');
    if (compEl) {
        compEl.textContent = c.components || '';
    }
    const py = root.querySelector('.js-prev-pinyin');
    if (py) {
        py.textContent = c.pinyin || '';
        py.className = `pinyin js-prev-pinyin ${tone}`.trim();
    }
    const defEl = root.querySelector('.js-prev-definition');
    if (defEl) defEl.innerHTML = definitionTextToHtmlMining(c.definition || '');
    const relW = root.querySelector('.js-prev-related-wrap');
    if (relW) {
        relW.style.display = String(c.related || '').trim() ? 'block' : 'none';
        setText('.js-prev-related', c.related || '');
    }
    const comW = root.querySelector('.js-prev-common-wrap');
    if (comW) {
        comW.style.display = String(c.common_words || '').trim() ? 'block' : 'none';
        setText('.js-prev-common', c.common_words || '');
    }
    const story = root.querySelector('.js-char-story');
    if (story) {
        if (String(c.anki_story_html || '').trim()) {
            const coloredStory = colorizeStoryHtmlForToneMining(c.anki_story_html, c.tone);
            c.anki_story_html = coloredStory;
            story.innerHTML = coloredStory;
            story.setAttribute('data-tone', String(c.tone));
            story.className = 'story js-char-story';
        } else {
            story.innerHTML = '';
            story.textContent = 'No story generated.';
            story.className = 'story js-char-story';
            story.style.color = '#9ca3af';
        }
    }
}

function refreshCharacterMiningCardDOM(host) {
    ensureCharacterMiningEreaderCss();
    const out = host.querySelector('.char-mining-card-output');
    const st = host._miningState;
    if (!out) return;
    if (!st || !st.card) {
        out.style.display = 'none';
        out.innerHTML = '';
        return;
    }

    const lingqScoreText = st.lingqLoading
        ? 'LingQ ...'
        : st.lingqBlock
          ? `LingQ ${typeof st.lingqBlock.displayScore === 'number' ? st.lingqBlock.displayScore : '-'}`
          : 'LingQ -';

    const esc = escapeHtmlMining;
    const notionOpts = CHARACTER_MINING_NOTION_OPTIONS.map(
        (opt) => `<option value="${esc(opt)}"${st.notionLatest === opt ? ' selected' : ''}>${esc(opt)}</option>`
    ).join('');

    const lingqRowHtml = `
  <div class="char-mining-lingq-row">
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">
      <span title="${esc(st.lingqBlock?.error || 'LingQ score')}">${esc(lingqScoreText)}</span>
      ${
          st.lingqBlock?.configured && !st.lingqBlock.error
              ? `<button type="button" data-action="mark-known" ${st.lingqMarkLoading || (typeof st.lingqBlock.displayScore === 'number' && st.lingqBlock.displayScore >= 5) ? 'disabled' : ''}>${
                    st.lingqMarkLoading
                        ? 'Updating...'
                        : typeof st.lingqBlock.displayScore === 'number' && st.lingqBlock.displayScore >= 5
                          ? 'Known'
                          : 'Mark Known'
                }</button>`
              : ''
      }
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
      <select class="js-char-notion-latest" data-action="notion-latest">${notionOpts}</select>
      <button type="button" data-action="add-notion" ${st.notionLoading ? 'disabled' : ''}>${st.notionLoading ? 'Adding...' : st.notionAdded ? 'Notion added' : 'Add to Notion'}</button>
      <button type="button" data-action="add-anki" ${st.ankiLoading ? 'disabled' : ''}>${st.ankiLoading ? 'Adding...' : st.ankiAdded ? 'Anki added' : 'Add to Anki'}</button>
    </div>
  </div>
  ${st.lingqMarkError ? `<p class="char-mining-err">${esc(st.lingqMarkError)}</p>` : ''}
  ${st.notionError ? `<p class="char-mining-err">${esc(st.notionError)}</p>` : ''}
  ${st.ankiError ? `<p class="char-mining-err">${esc(st.ankiError)}</p>` : ''}`;

    if (host._sentenceMining) {
        readSentenceMiningCardEditablesFromDom(host);
        const c = st.card;
        out.style.display = 'block';
        out.innerHTML = `
<div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
  ${lingqRowHtml}
  <div class="character-mining-preview character-mining-preview-shell sent-anki-back-preview">
    <div class="sent-back-word-block js-prev-focus-block">
      <div class="sent-back-target js-prev-target-word"></div>
      <div class="sent-back-word-pinyin js-prev-word-pinyin"></div>
      <div class="sent-back-word-gloss js-prev-word-definition"></div>
    </div>
    <div class="sent-back-example-block">
      <div class="sent-back-sentence js-prev-sentence-html"></div>
      <div class="sent-back-translation js-prev-definition"></div>
    </div>
    <div class="sent-back-meta js-prev-related-wrap" style="display:none">
      <div class="sent-back-sec-label">Related</div>
      <div class="sent-back-sec-body related-content js-prev-related"></div>
    </div>
    <div class="sent-back-meta js-prev-source-wrap" style="display:none">
      <div class="sent-back-sec-label">Source</div>
      <div class="sent-back-sec-body js-prev-source"></div>
    </div>
    <div class="sent-back-meta js-prev-cloze-wrap" style="display:none">
      <div class="sent-back-sec-label">Cloze</div>
      <div class="sent-back-sec-body js-prev-cloze"></div>
    </div>
    <div class="sent-back-meta js-prev-notes-wrap" style="display:none">
      <div class="sent-back-sec-label">Notes</div>
      <div class="sent-back-sec-body js-prev-notes"></div>
    </div>
  </div>
  <div class="char-mining-editable-wrap">
    <div class="char-mining-editable-title">Editable fields</div>
    <label><span class="char-mining-field-label">Definition</span>
      <textarea class="char-mining-textarea js-sent-edit-definition" rows="2">${esc(c.word_definition || '')}</textarea></label>
    <label><span class="char-mining-field-label">Translation</span>
      <textarea class="char-mining-textarea js-sent-edit-translation" rows="3">${esc(c.definition || '')}</textarea></label>
    <label><span class="char-mining-field-label">Related</span>
      <textarea class="char-mining-textarea js-sent-edit-related" rows="3">${esc(c.related || '')}</textarea></label>
  </div>
</div>`;
        syncCharacterMiningPreviewFromState(host);
        return;
    }

    readCharacterCardEditablesFromDom(host);
    const c = st.card;
    const tone = toneClassNameMining(c.tone);
    const fid = host._charMiningFileInputId || (host._charMiningFileInputId = `char-mining-img-${Date.now().toString(36)}`);

    const imgBtnLabel = st.imageGenLoading
        ? 'Generating Images...'
        : `Generate Images (${esc(st.imageGenModel)})`;

    const imgGrid = (st.imageGenOptions || []).length
        ? `<div class="image-options-grid">${st.imageGenOptions
              .map(
                  (url, idx) => `
            <div class="image-option-button${st.imageDataUrl === url ? ' image-option-button--selected' : ''}">
              <button type="button" class="image-option-preview-btn" data-action="img-open" data-idx="${idx}">
                <img class="image-option-thumb" src="${esc(url)}" alt="" />
              </button>
              <button type="button" class="image-option-apply-btn" data-action="img-apply" data-idx="${idx}">
                ${st.imageDataUrl === url ? 'Selected for card' : `Option ${idx + 1} - use on card`}
              </button>
            </div>`
              )
              .join('')}</div>`
        : '<div style="font-size:12px;color:#737373">Generated images will appear here.</div>';

    const auxComponentsTitle = 'Components used for image/story';

    const imageSlotHtml = st.imageDataUrl
        ? `<div class="image-slot__filled">
             <img class="image-slot__img" src="${esc(st.imageDataUrl)}" alt="" />
             <div class="image-slot__actions"><button type="button" class="image-slot__btn" data-action="remove-image">Remove image</button></div>
           </div>`
        : `<div class="image-placeholder image-slot__paste" tabindex="0" data-paste-zone="1">
             <p class="image-slot__paste-title" style="margin:0 0 8px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa">Image (Anki field)</p>
             <p style="margin:0 0 12px;font-size:13px;color:#d4d4d8">Click here, then paste <kbd style="display:inline-block;padding:0.1em 0.4em;border-radius:4px;font-size:11px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12)">⌘V</kbd> / <kbd style="display:inline-block;padding:0.1em 0.4em;border-radius:4px;font-size:11px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12)">Ctrl+V</kbd></p>
             <div class="image-slot__paste-row">
               <button type="button" class="image-slot__btn image-slot__btn--primary" data-action="read-clip">Read clipboard</button>
               <label class="image-slot__btn image-slot__btn--primary" for="${fid}" style="cursor:pointer">Choose file</label>
               <input id="${fid}" class="image-slot__file-input" type="file" accept="image/*" data-action="file-input" />
             </div>
           </div>`;

    out.style.display = 'block';
    out.innerHTML = `
<div style="display:flex;flex-direction:column;gap:12px;margin-top:12px">
  <div class="char-mining-aux-box">
    <div class="char-mining-aux-title">${esc(auxComponentsTitle)}</div>
    <div class="char-mining-aux-body">${esc(c.components || '—')}</div>
  </div>
  <div class="char-mining-aux-box">
    <div class="char-mining-aux-title">Image Prompt</div>
    <div class="char-mining-aux-body">${esc(c.image_prompt || 'No prompt')}</div>
  </div>
  <button type="button" class="char-mining-gen-images-btn" data-action="gen-images" ${st.imageGenLoading || !String(c.image_prompt || '').trim() ? 'disabled' : ''}>${imgBtnLabel}</button>
  ${st.imageGenError ? `<p class="char-mining-err">${esc(st.imageGenError)}</p>` : ''}
  ${st.imageGenPartial ? `<p class="char-mining-warn">${esc(st.imageGenPartial)}</p>` : ''}
  <div class="char-mining-img-grid-wrap">${imgGrid}</div>
  ${lingqRowHtml}

  <div class="character-mining-preview character-mining-preview-shell">
    <div class="hanzi js-prev-hanzi ${tone}">${esc(c.hanzi || '')}</div>
    <div class="components js-prev-components">${esc(c.components || '')}</div>
    <div class="pinyin js-prev-pinyin ${tone}">${esc(c.pinyin || '')}</div>
    <div class="definition js-prev-definition">${definitionTextToHtmlMining(c.definition || '')}</div>
    <div class="js-prev-related-wrap" style="display:${String(c.related || '').trim() ? 'block' : 'none'}">
      <div class="related-header">Related:</div>
      <div class="related-content js-prev-related">${esc(c.related || '')}</div>
    </div>
    <div class="js-prev-common-wrap" style="display:${String(c.common_words || '').trim() ? 'block' : 'none'}">
      <div class="common-header">Common Words:</div>
      <div class="common-content js-prev-common">${esc(c.common_words || '')}</div>
    </div>
    <div class="image-slot">${imageSlotHtml}</div>
    <div class="story js-char-story" data-tone="${esc(String(c.tone || 0))}"></div>
  </div>

  <div class="char-mining-editable-wrap">
    <div class="char-mining-editable-title">Editable Fields</div>
    <label><span class="char-mining-field-label">Components</span>
      <textarea class="char-mining-textarea js-char-edit-components" data-field="components" rows="2">${esc(c.components || '')}</textarea></label>
    <label><span class="char-mining-field-label">Definition</span>
      <textarea class="char-mining-textarea js-char-edit-definition" data-field="definition" rows="2">${esc(c.definition || '')}</textarea></label>
    <label><span class="char-mining-field-label">Related</span>
      <textarea class="char-mining-textarea js-char-edit-related" data-field="related" rows="3">${esc(c.related || '')}</textarea></label>
    <label><span class="char-mining-field-label">Common Words</span>
      <textarea class="char-mining-textarea js-char-edit-common" data-field="common_words" rows="3">${esc(c.common_words || '')}</textarea></label>
  </div>
</div>`;

    const story = out.querySelector('.js-char-story');
    if (story) {
        if (String(c.anki_story_html || '').trim()) {
            const coloredStory = colorizeStoryHtmlForToneMining(c.anki_story_html, c.tone);
            c.anki_story_html = coloredStory;
            story.innerHTML = coloredStory;
            story.style.color = '';
        } else {
            story.textContent = 'No story generated.';
            story.style.color = '#9ca3af';
        }
    }
}

function bindCharacterMiningHostEvents(host) {
    if (host._charMiningHostEventsBound) return;
    host._charMiningHostEventsBound = true;

    // Plex listens on document/window for Space/K/… to control playback. Bubble this
    // drawer’s key events so they never reach the player, without preventDefault (so
    // spaces and typing in inputs/textareas still work).
    const stopKeysReachingPlayer = (e) => {
        const target = e.target;
        if (!target || !(target instanceof Node)) return;
        if (!host.contains(target)) return;
        e.stopPropagation();
    };
    host.addEventListener('keydown', stopKeysReachingPlayer, false);
    host.addEventListener('keyup', stopKeysReachingPlayer, false);

    host.addEventListener('input', (e) => {
        const t = e.target;
        if (!t || !t.classList) return;
        if (!host._miningState || !host._miningState.card) return;
        if (t.classList.contains('js-char-edit-components')) host._miningState.card.components = t.value;
        if (t.classList.contains('js-char-edit-definition')) host._miningState.card.definition = t.value;
        if (t.classList.contains('js-char-edit-related')) host._miningState.card.related = t.value;
        if (t.classList.contains('js-char-edit-common')) host._miningState.card.common_words = t.value;
        if (t.classList.contains('js-sent-edit-definition')) host._miningState.card.word_definition = t.value;
        if (t.classList.contains('js-sent-edit-translation')) host._miningState.card.definition = t.value;
        if (t.classList.contains('js-sent-edit-related')) host._miningState.card.related = t.value;
        if (
            t.classList.contains('char-mining-source-input') &&
            host._sentenceMining &&
            host._miningState &&
            host._miningState.card
        ) {
            host._miningState.card.source = t.value;
        }
        if (
            t.matches(
                '.js-char-edit-components, .js-char-edit-definition, .js-char-edit-related, .js-char-edit-common, .js-sent-edit-definition, .js-sent-edit-translation, .js-sent-edit-related'
            )
        ) {
            syncCharacterMiningPreviewFromState(host);
        }
    });

    host.addEventListener('change', (e) => {
        const t = e.target;
        if (t && t.classList && t.classList.contains('js-char-notion-latest')) {
            if (host._miningState) host._miningState.notionLatest = t.value;
        }
        if (t && t.matches('input[data-action="file-input"]')) {
            const file = t.files && t.files[0];
            if (!file || !file.type.startsWith('image/') || !host._miningState) return;
            const reader = new FileReader();
            reader.onload = () => {
                host._miningState.imageDataUrl = typeof reader.result === 'string' ? reader.result : null;
                refreshCharacterMiningCardDOM(host);
            };
            reader.readAsDataURL(file);
        }
    });

    host.addEventListener(
        'paste',
        (e) => {
            if (host._sentenceMining) return;
            const zone = e.target && e.target.closest && e.target.closest('[data-paste-zone]');
            if (!zone || !host._miningState) return;
            const items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (let i = 0; i < items.length; i += 1) {
                if (items[i].type && items[i].type.indexOf('image') === 0) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    if (!blob) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        host._miningState.imageDataUrl = typeof reader.result === 'string' ? reader.result : null;
                        refreshCharacterMiningCardDOM(host);
                    };
                    reader.readAsDataURL(blob);
                    return;
                }
            }
        },
        true
    );

    host.addEventListener('click', async (e) => {
        const btn = e.target && e.target.closest && e.target.closest('[data-action]');
        if (!btn || !host._miningState || !host._miningState.card) return;
        const action = btn.getAttribute('data-action');
        const st = host._miningState;
        const c = st.card;
        const isSentence = Boolean(host._sentenceMining);
        const imgGenPath = isSentence ? '/anki/sentence/generate-images' : '/anki/character/generate-images';
        const notionPath = isSentence ? '/anki/sentence/notion-entry' : '/anki/character/notion-entry';
        const ankiPath = isSentence ? '/anki/sentence/add' : '/anki/character/add';

        if (action === 'gen-images') {
            e.preventDefault();
            if (isSentence) return;
            if (!c.image_prompt || !String(c.image_prompt).trim()) return;
            st.imageGenLoading = true;
            st.imageGenError = '';
            st.imageGenPartial = '';
            st.imageGenOptions = [];
            refreshCharacterMiningCardDOM(host);
            try {
                const payload = await characterMiningApiPost(imgGenPath, {
                    prompt: String(c.image_prompt).trim(),
                    count: 3
                });
                const images = Array.isArray(payload?.images)
                    ? payload.images.filter((x) => typeof x === 'string')
                    : [];
                if (images.length === 0) st.imageGenError = 'No generated images returned.';
                else st.imageGenOptions = images;
                if (typeof payload?.model === 'string' && payload.model.trim()) st.imageGenModel = payload.model.trim();
                const partialErrors = Array.isArray(payload?.partialErrors)
                    ? payload.partialErrors.filter((x) => typeof x === 'string')
                    : [];
                if (partialErrors.length) st.imageGenPartial = partialErrors.join('; ');
            } catch (err) {
                st.imageGenError = err instanceof Error ? err.message : String(err);
            } finally {
                st.imageGenLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
            return;
        }

        if (action === 'img-apply') {
            e.preventDefault();
            const idx = Number(btn.getAttribute('data-idx'));
            if (!Number.isFinite(idx) || !st.imageGenOptions[idx]) return;
            st.imageDataUrl = st.imageGenOptions[idx];
            refreshCharacterMiningCardDOM(host);
            return;
        }

        if (action === 'img-open') {
            e.preventDefault();
            const idx = Number(btn.getAttribute('data-idx'));
            if (!Number.isFinite(idx) || !st.imageGenOptions[idx]) return;
            openCharacterMiningImageModal(st.imageGenOptions[idx]);
            return;
        }

        if (action === 'remove-image') {
            e.preventDefault();
            st.imageDataUrl = null;
            refreshCharacterMiningCardDOM(host);
            return;
        }

        if (action === 'read-clip') {
            e.preventDefault();
            try {
                const clipItems = await navigator.clipboard.read();
                for (const item of clipItems) {
                    for (const type of item.types || []) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            const reader = new FileReader();
                            reader.onload = () => {
                                st.imageDataUrl = typeof reader.result === 'string' ? reader.result : null;
                                refreshCharacterMiningCardDOM(host);
                            };
                            reader.readAsDataURL(blob);
                            return;
                        }
                    }
                }
            } catch {
                /* ignore */
            }
            return;
        }

        if (action === 'mark-known') {
            e.preventDefault();
            st.lingqMarkError = '';
            st.lingqMarkLoading = true;
            refreshCharacterMiningCardDOM(host);
            try {
                const fwEl = host.querySelector('.char-mining-focus-word-input');
                const termSource =
                    fwEl && String(fwEl.value || '').trim()
                        ? String(fwEl.value).trim()
                        : host._lingqTerm != null
                          ? host._lingqTerm
                          : c.hanzi;
                const body = { term: String(termSource || '').trim() };
                if (typeof st.lingqBlock?.cardPk === 'number') body.cardPk = st.lingqBlock.cardPk;
                const j = await characterMiningApiPost('/anki/sentence/lingq-mark-known', body);
                if (j && st.lingqBlock) {
                    st.lingqBlock.displayScore = 5;
                    st.lingqBlock.found = true;
                    st.lingqBlock.error = undefined;
                }
            } catch (err) {
                st.lingqMarkError = err instanceof Error ? err.message : String(err);
            } finally {
                st.lingqMarkLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
            return;
        }

        if (action === 'add-notion') {
            e.preventDefault();
            readMiningCardEditablesFromDom(host);
            mergeSentenceMiningSourceIntoCard(host);
            st.notionError = '';
            st.notionLoading = true;
            refreshCharacterMiningCardDOM(host);
            try {
                if (isSentence) {
                    const cardPayload = toSentenceMiningCardPayloadForExport(c);
                    const notionBody = { card: cardPayload, latest: String(st.notionLatest ?? '→4') };
                    const src = String(c.source || '').trim();
                    if (src) notionBody.source = src;
                    await characterMiningApiPost(notionPath, notionBody);
                    st.notionAdded = true;
                } else {
                    const cardPayload = toCharacterCardPayloadMining(c);
                    const safeImage = normalizedImageDataUrlForSubmitMining(st.imageDataUrl);
                    if (st.imageDataUrl && !safeImage) {
                        st.notionError = 'Image is too large to upload (max ~12 MB).';
                    } else {
                        const notionBody = { card: cardPayload, latest: String(st.notionLatest ?? '→4') };
                        if (safeImage) notionBody.imageDataUrl = safeImage;
                        await characterMiningApiPost(notionPath, notionBody);
                        st.notionAdded = true;
                    }
                }
            } catch (err) {
                st.notionError = err instanceof Error ? err.message : String(err);
            } finally {
                st.notionLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
            return;
        }

        if (action === 'add-anki') {
            e.preventDefault();
            readMiningCardEditablesFromDom(host);
            mergeSentenceMiningSourceIntoCard(host);
            st.ankiError = '';
            st.ankiLoading = true;
            refreshCharacterMiningCardDOM(host);
            try {
                if (isSentence) {
                    const cardPayload = toSentenceMiningCardPayloadForExport(c);
                    const extraTags = extraTagsForAnkiFromLingqSnapshotMining(st);
                    await characterMiningApiPost(ankiPath, {
                        card: cardPayload,
                        source: String(c.source || '').trim(),
                        extraTags
                    });
                    st.ankiAdded = true;
                } else {
                    const cardPayload = toCharacterCardPayloadMining(c);
                    const safeImage = normalizedImageDataUrlForSubmitMining(st.imageDataUrl);
                    if (st.imageDataUrl && !safeImage) {
                        st.ankiError = 'Image is too large to upload (max ~12 MB).';
                    } else {
                        const extraTags = extraTagsForAnkiFromLingqSnapshotMining(st);
                        const ankiBody = { card: cardPayload, extraTags };
                        if (safeImage) ankiBody.imageDataUrl = safeImage;
                        await characterMiningApiPost(ankiPath, ankiBody);
                        st.ankiAdded = true;
                    }
                }
            } catch (err) {
                st.ankiError = err instanceof Error ? err.message : String(err);
            } finally {
                st.ankiLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
        }
    });
}

function applyCharacterMiningDrawerStyling(host) {
    Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '10020'
    });
    const backdrop = host.querySelector('.char-mining-backdrop');
    if (backdrop) {
        Object.assign(backdrop.style, {
            position: 'absolute',
            inset: '0',
            background: 'rgba(0,0,0,0.45)'
        });
    }
    const panel = host.querySelector('.char-mining-panel');
    if (panel) {
        Object.assign(panel.style, {
            position: 'absolute',
            top: '0',
            right: '0',
            width: 'min(560px, 42vw)',
            minWidth: '360px',
            maxWidth: '560px',
            height: '100%',
            background: 'rgb(24, 24, 27)',
            color: '#fff',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #262626'
        });
    }
    const header = host.querySelector('.char-mining-header');
    if (header) {
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #262626'
        });
    }
    const headerTitle = host.querySelector('.char-mining-header h3');
    if (headerTitle) Object.assign(headerTitle.style, { margin: '0', fontSize: '0.875rem', fontWeight: '600', color: '#f5f5f5' });
    const closeBtn = host.querySelector('.char-mining-close-btn');
    if (closeBtn) {
        Object.assign(closeBtn.style, {
            border: '0',
            background: 'transparent',
            color: '#a3a3a3',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            lineHeight: '1',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box'
        });
    }
    const body = host.querySelector('.char-mining-body');
    if (body) Object.assign(body.style, { padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' });
    const formCard = host.querySelector('.char-mining-form-card');
    if (formCard) {
        Object.assign(formCard.style, {
            border: '1px solid #262626',
            borderRadius: '6px',
            background: 'rgba(38,38,38,0.6)',
            padding: '12px'
        });
    }
    host.querySelectorAll('.char-mining-row').forEach((row) => {
        Object.assign(row.style, { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' });
    });
    const firstRow = host.querySelector('.char-mining-form-card .char-mining-row');
    if (firstRow) firstRow.style.marginTop = '0';
    host.querySelectorAll('.char-mining-row label').forEach((label) => {
        Object.assign(label.style, { color: '#d4d4d8', fontSize: '0.75rem', fontWeight: '500', paddingTop: '2px' });
    });
    host.querySelectorAll('.char-mining-word, .char-mining-sentence, .char-mining-sentence-textarea, .char-mining-character-input, .char-mining-subcomponents-input, .char-mining-common-words-input, .char-mining-story-meaning-input, .char-mining-focus-word-input, .char-mining-source-input').forEach((input) => {
        Object.assign(input.style, {
            width: '100%',
            boxSizing: 'border-box',
            border: '1px solid #737373',
            background: 'rgba(64,64,64,0.7)',
            color: '#f3f4f6',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '1rem',
            outline: 'none'
        });
    });
    const characterInput = host.querySelector('.char-mining-character-input');
    if (characterInput) {
        Object.assign(characterInput.style, {
            fontSize: '1.75rem',
            fontFamily: "'KaiTi-Web', 'Noto Sans SC', 'SimSun', serif"
        });
    }
    const focusWordInput = host.querySelector('.char-mining-focus-word-input');
    if (focusWordInput) {
        Object.assign(focusWordInput.style, {
            fontSize: '1.5rem',
            fontFamily: "'KaiTi-Web', 'Noto Sans SC', 'SimSun', serif"
        });
    }
    const sentenceTextarea = host.querySelector('.char-mining-sentence-textarea');
    if (sentenceTextarea) {
        Object.assign(sentenceTextarea.style, {
            fontSize: '1.5rem',
            fontFamily: "'KaiTi-Web', 'Noto Sans SC', 'SimSun', serif",
            lineHeight: '1.5'
        });
    }
    const miningHanziFieldStyle = {
        fontSize: '1.5rem',
        fontFamily: "'KaiTi-Web', 'Noto Sans SC', 'SimSun', serif"
    };
    const subcomponentsInput = host.querySelector('.char-mining-subcomponents-input');
    if (subcomponentsInput) {
        Object.assign(subcomponentsInput.style, miningHanziFieldStyle);
    }
    const commonWordsInput = host.querySelector('.char-mining-common-words-input');
    if (commonWordsInput) {
        Object.assign(commonWordsInput.style, miningHanziFieldStyle);
    }
    const optionsWrap = host.querySelector('.char-mining-options');
    if (optionsWrap) {
        Object.assign(optionsWrap.style, { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' });
    }
    host.querySelectorAll('.char-mining-option-btn').forEach((btn) => {
        const isActive = btn.classList.contains('char-mining-option-btn--active');
        const isKnown = btn.classList.contains('char-mining-option-btn--known');
        Object.assign(btn.style, {
            minWidth: '5.75rem',
            border: isKnown
                ? (isActive ? '2px solid #d4d4d4' : '1px solid #3f3f46')
                : (isActive ? '2px solid #facc15' : '1px solid #b9a96a'),
            borderRadius: '0.5rem',
            padding: isActive ? 'calc(0.9rem - 1px) calc(0.7rem - 1px) calc(0.55rem - 1px)' : '0.9rem 0.7rem 0.55rem',
            background: isKnown ? (isActive ? 'rgba(82,82,91,0.86)' : 'rgba(24,24,27,0.7)') : (isActive ? 'rgba(64,64,64,0.86)' : 'rgba(23,23,23,0.72)'),
            color: '#e5e7eb',
            cursor: 'pointer',
            display: 'grid',
            gridTemplateRows: '1.2rem auto 0.95rem',
            alignItems: 'center',
            transition: 'border-color 120ms ease, background-color 120ms ease'
        });
    });
    host.querySelectorAll('.char-mining-option-pinyin').forEach((el) => {
        Object.assign(el.style, {
            display: 'block',
            textAlign: 'center',
            fontSize: '1rem',
            color: '#d1d5db',
            minHeight: '1rem',
            marginTop: '0',
            marginBottom: '0.2rem'
        });
    });
    host.querySelectorAll('.char-mining-option-hanzi').forEach((el) => {
        Object.assign(el.style, {
            display: 'block',
            textAlign: 'center',
            fontFamily: "'Inter', 'KaiTi-Web', 'Noto Sans SC', 'SimSun', serif",
            fontSize: 'clamp(2rem, 5vw, 2.7rem)',
            lineHeight: '1',
            color: '#f9fafb'
        });
    });
    host.querySelectorAll('.char-mining-option-status').forEach((el) => {
        Object.assign(el.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '0.9rem',
            color: '#e5e7eb',
            fontSize: '0.9rem'
        });
    });
    const preview = host.querySelector('.char-mining-preview');
    if (preview) {
        Object.assign(preview.style, {
            border: '1px solid #262626',
            borderRadius: '6px',
            background: 'rgba(38,38,38,0.6)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });
    }
    const previewHanzi = host.querySelector('.char-mining-preview-hanzi');
    if (previewHanzi) Object.assign(previewHanzi.style, { fontSize: '2rem', color: '#fff', lineHeight: '1.1' });
    const previewPinyin = host.querySelector('.char-mining-preview-pinyin');
    if (previewPinyin) Object.assign(previewPinyin.style, { fontSize: '1rem', color: '#ddd' });
    const previewDef = host.querySelector('.char-mining-preview-def');
    if (previewDef) Object.assign(previewDef.style, { fontSize: '0.88rem', color: '#bbb' });
    const generateBtn = host.querySelector('.char-mining-generate-btn');
    if (generateBtn) {
        Object.assign(generateBtn.style, {
            width: '100%',
            borderRadius: '6px',
            border: '1px solid #404040',
            background: '#262626',
            color: '#fff',
            padding: '8px 12px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '12px',
            lineHeight: '1.25',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        });
    }
    const generateError = host.querySelector('.char-mining-generate-error');
    if (generateError) {
        Object.assign(generateError.style, {
            margin: '8px 0 0',
            fontSize: '0.8rem',
            color: '#fca5a5'
        });
    }
}

function openCharacterMiningDrawer(seed) {
    closeSentenceMiningDrawer();
    closeCharacterMiningDrawer();
    const { wordText, pinyinText, sentenceText } = seed;
    let pinyinMap = getCharacterPinyinMapFromWord(wordText, pinyinText);
    const charOptions = Array.from(new Set(Array.from(wordText || '').filter((char) => /[\u4e00-\u9fff]/.test(char))));
    const initialUnknownChar = charOptions.find((char) => {
        const displayScore = getLocalLingqDisplayScore(char);
        return typeof displayScore !== 'number' || displayScore < 5;
    });
    const initialChar = initialUnknownChar || charOptions[0] || '';

    const host = document.createElement('div');
    host.className = 'char-mining-drawer-host';
    host._sentenceMining = false;
    host.innerHTML = `
      <div class="char-mining-backdrop"></div>
      <aside class="char-mining-panel" role="dialog" aria-modal="true" aria-label="Character Mining">
        <div class="char-mining-header">
          <h3>Character Mining</h3>
          <button type="button" class="char-mining-close-btn" title="Close">×</button>
        </div>
        <div class="char-mining-body">
          <div class="char-mining-form-card">
            <div class="char-mining-row">
              <div class="char-mining-options"></div>
            </div>
            <div class="char-mining-row" style="margin-top:10px;">
              <label>Character</label>
              <input type="text" class="char-mining-character-input" value="${initialChar}" placeholder="Single hanzi" />
            </div>
            <div class="char-mining-row">
              <label>Subcomponents (Optional)</label>
              <input type="text" class="char-mining-subcomponents-input" placeholder="e.g. 氵 刀" />
            </div>
            <div class="char-mining-row">
              <label>Common Words (Optional)</label>
              <input type="text" class="char-mining-common-words-input" value="${wordText || ''}" placeholder="e.g. 学习 学校" />
            </div>
            <div class="char-mining-row">
              <label>Story Meaning (Optional)</label>
              <input type="text" class="char-mining-story-meaning-input" placeholder="e.g. bank (financial)" />
            </div>
            <button type="button" class="char-mining-generate-btn">Generate Character Card</button>
            <p class="char-mining-generate-error" style="display:none;"></p>
            <div class="char-mining-card-output" style="display:none;"></div>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(host);
    host._miningState = createDefaultCharacterMiningState();
    bindCharacterMiningHostEvents(host);
    applyCharacterMiningDrawerStyling(host);
    currentCharacterMiningDrawer = host;
    isCharacterMiningDrawerOpen = true;
    window._characterMiningDrawerOpen = true;
    hideSubtitleControlPanelForOverlay();
    setSubtitleControlPanelInteractivity(true);

    const backdrop = host.querySelector('.char-mining-backdrop');
    const closeBtn = host.querySelector('.char-mining-close-btn');
    const optionsWrap = host.querySelector('.char-mining-options');
    const generateBtn = host.querySelector('.char-mining-generate-btn');
    const characterInput = host.querySelector('.char-mining-character-input');
    const subcomponentsInput = host.querySelector('.char-mining-subcomponents-input');
    const commonWordsInput = host.querySelector('.char-mining-common-words-input');
    const storyMeaningInput = host.querySelector('.char-mining-story-meaning-input');
    const generateErrorEl = host.querySelector('.char-mining-generate-error');
    let selectedChar = initialChar;

    const refreshOptions = () => {
        optionsWrap.innerHTML = '';
        charOptions.forEach((char) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'char-mining-option-btn';
            const displayScore = getLocalLingqDisplayScore(char);
            const isKnown = typeof displayScore === 'number' && displayScore >= 5;
            const isActive = char === selectedChar;
            btn.classList.toggle('char-mining-option-btn--active', isActive);
            btn.classList.toggle('char-mining-option-btn--known', isKnown);
            btn.classList.toggle('char-mining-option-btn--unknown', !isKnown);
            const py = pinyinMap[char] ? pinyinMap[char].trim() : '\u00A0';
            btn.innerHTML = `
              <span class="char-mining-option-pinyin">${py || '\u00A0'}</span>
              <span class="char-mining-option-hanzi">${char}</span>
              <span class="char-mining-option-status">${isKnown ? '✓' : ''}</span>
            `;
            btn.addEventListener('click', () => {
                selectedChar = char;
                if (characterInput) characterInput.value = char;
                refreshOptions();
            });
            optionsWrap.appendChild(btn);
        });
        applyCharacterMiningDrawerStyling(host);
    };
    refreshOptions();

    if (characterInput) {
        characterInput.addEventListener('input', () => {
            const next = (characterInput.value || '').trim();
            selectedChar = next;
            refreshOptions();
        });
    }

    generateBtn.addEventListener('click', async () => {
        const hanzi = String(selectedChar || '').trim();
        if (!hanzi) return;

        if (generateErrorEl) {
            generateErrorEl.style.display = 'none';
            generateErrorEl.textContent = '';
        }

        const original = generateBtn.textContent || 'Generate Character Card';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        generateBtn.style.opacity = '0.75';

        try {
            const submittedSubcomponents = String(subcomponentsInput?.value || '').trim();
            const payload = await generateCharacterCardViaBackground({
                hanzi,
                userSubcomponents: submittedSubcomponents || undefined,
                userRequiredWords: String(commonWordsInput?.value || '').trim() || undefined,
                storyMeaningFocus: String(storyMeaningInput?.value || '').trim() || undefined
            });

            const data = payload?.data && typeof payload.data === 'object' ? payload.data : null;
            if (!data) {
                throw new Error('Unexpected response from character generator');
            }

            if (data.hanzi && characterInput) {
                characterInput.value = String(data.hanzi).trim();
                selectedChar = characterInput.value;
            }
            // Keep picker pinyin in sync when returned pinyin includes selected character syllable.
            if (selectedChar && data.pinyin) {
                const firstSyllable = String(data.pinyin).trim().split(/\s+/)[0];
                if (firstSyllable) pinyinMap[selectedChar] = firstSyllable;
                refreshOptions();
            }

            const toneRaw = Number(data.tone);
            const tone = Number.isFinite(toneRaw) && toneRaw >= 1 && toneRaw <= 5 ? toneRaw : 0;
            const oldOutput = host.querySelector('.char-mining-card-output');
            if (oldOutput) {
                oldOutput.innerHTML = '';
                oldOutput.style.display = 'none';
            }
            const generatedImagePrompt = String(data.image_prompt ?? '');
            const componentBreakdown = buildComponentBreakdown(
                submittedSubcomponents,
                String(data.components ?? ''),
                generatedImagePrompt
            );
            host._miningState = createDefaultCharacterMiningState();
            host._miningState.card = {
                hanzi: String(data.hanzi ?? hanzi).trim(),
                pinyin: String(data.pinyin ?? ''),
                tone,
                definition: String(data.definition ?? ''),
                components: componentBreakdown,
                related: String(data.related ?? ''),
                common_words: String(data.common_words ?? ''),
                image_prompt: generatedImagePrompt,
                memory_blurb: String(data.memory_blurb ?? ''),
                anki_story_html: String(data.anki_story_html ?? '')
            };
            host._miningState.lingqLoading = true;
            refreshCharacterMiningCardDOM(host);
            try {
                const term = String(host._miningState.card.hanzi || hanzi).trim();
                const lj = await characterMiningApiPost('/anki/sentence/lingq-lookup', { term });
                host._miningState.lingqBlock = {
                    configured: Boolean(lj?.configured),
                    found: Boolean(lj?.found),
                    displayScore: typeof lj?.displayScore === 'number' ? lj.displayScore : 0,
                    cardPk: typeof lj?.cardPk === 'number' ? lj.cardPk : undefined,
                    error: typeof lj?.error === 'string' ? lj.error : undefined
                };
                snapshotLingqScoreForAnkiTagsMining(host._miningState, host._miningState.lingqBlock.displayScore);
                if (
                    typeof lj?.suggestedLatest === 'string' &&
                    CHARACTER_MINING_NOTION_OPTIONS.includes(lj.suggestedLatest)
                ) {
                    host._miningState.notionLatest = lj.suggestedLatest;
                }
            } catch (lingqErr) {
                host._miningState.lingqBlock = {
                    configured: false,
                    found: false,
                    displayScore: 0,
                    error: lingqErr instanceof Error ? lingqErr.message : String(lingqErr)
                };
                snapshotLingqScoreForAnkiTagsMining(host._miningState, 0);
            } finally {
                host._miningState.lingqLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
        } catch (error) {
            if (generateErrorEl) {
                generateErrorEl.style.display = 'block';
                let msg = error instanceof Error ? error.message : String(error);
                if (/failed to fetch/i.test(msg)) {
                    const base = (window.characterMiningApiBaseUrl || 'http://localhost:3001/api').replace(/\/+$/, '');
                    msg = `Could not reach ${base} (Failed to fetch). Start the ereader proxy on this machine and reload the extension after updating permissions.`;
                }
                generateErrorEl.textContent = msg;
            }
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = original;
            generateBtn.style.opacity = '1';
        }
    });

    backdrop.addEventListener('click', closeCharacterMiningDrawer);
    closeBtn.addEventListener('click', closeCharacterMiningDrawer);
    currentCharacterMiningEscHandler = (event) => {
        if (tryCloseMiningImageModalFromKeyboard(event)) return;
        if (event.key !== 'Escape') return;
        closeCharacterMiningDrawer();
    };
    window.addEventListener('keydown', currentCharacterMiningEscHandler, MINING_ESCAPE_KEYDOWN_CAPTURE);
}

function openSentenceMiningDrawer(seed) {
    closeCharacterMiningDrawer();
    closeSentenceMiningDrawer();
    const { wordText, pinyinText, sentenceText } = seed;
    const sent0 = String(sentenceText || '');
    const focus0 = String(wordText || '');
    const esc = escapeHtmlMining;

    const host = document.createElement('div');
    host.className = 'char-mining-drawer-host';
    host._sentenceMining = true;
    host._lingqTerm = focus0;
    const source0 = esc(getPlexMediaTitleForSourceSync());
    host.innerHTML = `
      <div class="char-mining-backdrop"></div>
      <aside class="char-mining-panel" role="dialog" aria-modal="true" aria-label="Sentence Mining">
        <div class="char-mining-header">
          <h3>Sentence Mining</h3>
          <button type="button" class="char-mining-close-btn" title="Close">×</button>
        </div>
        <div class="char-mining-body">
          <div class="char-mining-form-card">
            <div class="char-mining-row">
              <label>Sentence</label>
              <textarea class="char-mining-word char-mining-sentence-textarea" rows="3" placeholder="Chinese sentence">${esc(sent0)}</textarea>
            </div>
            <div class="char-mining-row">
              <label>Target word or phrase</label>
              <input type="text" class="char-mining-focus-word-input" value="${esc(focus0)}" />
            </div>
            <div class="char-mining-row">
              <label>Source</label>
              <input type="text" class="char-mining-source-input" value="${source0}" placeholder="e.g. show or episode title" />
            </div>
            <button type="button" class="char-mining-generate-btn">Generate Sentence Card</button>
            <p class="char-mining-generate-error" style="display:none;"></p>
            <div class="char-mining-card-output" style="display:none;"></div>
          </div>
        </div>
      </aside>
    `;
    document.body.appendChild(host);
    host._miningState = createDefaultCharacterMiningState();
    bindCharacterMiningHostEvents(host);
    applyCharacterMiningDrawerStyling(host);
    currentSentenceMiningDrawer = host;
    isSentenceMiningDrawerOpen = true;
    window._sentenceMiningDrawerOpen = true;
    hideSubtitleControlPanelForOverlay();
    setSubtitleControlPanelInteractivity(true);

    const backdrop = host.querySelector('.char-mining-backdrop');
    const closeBtn = host.querySelector('.char-mining-close-btn');
    const generateBtn = host.querySelector('.char-mining-generate-btn');
    const sentenceTa = host.querySelector('.char-mining-sentence-textarea');
    const focusInput = host.querySelector('.char-mining-focus-word-input');
    const sourceInput = host.querySelector('.char-mining-source-input');
    const generateErrorEl = host.querySelector('.char-mining-generate-error');

    if (focusInput) {
        focusInput.addEventListener('input', () => {
            host._lingqTerm = String(focusInput.value || '').trim();
        });
    }

    void (async () => {
        if (!sourceInput || sourceInput.value.trim()) return;
        if (typeof detectMediaTitleWithRetry !== 'function') return;
        try {
            const raw = await detectMediaTitleWithRetry(12, 400);
            if (!raw || !sourceInput || sourceInput.value.trim()) return;
            const cleaned = String(raw)
                .replace(/\s*[-\u2013\u2014|:]\s*Plex(?:\s+Web)?\s*$/i, '')
                .trim();
            sourceInput.value = cleaned || String(raw).trim();
        } catch {
            /* ignore */
        }
    })();

    generateBtn.addEventListener('click', async () => {
        const sentenceBody = String(sentenceTa?.value || '').trim();
        if (!sentenceBody) return;

        if (generateErrorEl) {
            generateErrorEl.style.display = 'none';
            generateErrorEl.textContent = '';
        }

        const original = generateBtn.textContent || 'Generate Sentence Card';
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        generateBtn.style.opacity = '0.75';

        try {
            const focusWord = String(focusInput?.value || '').trim() || focus0;
            const source = String(sourceInput?.value || '').trim() || undefined;
            const payload = await generateSentenceCardViaBackground({
                sentence: sentenceBody,
                focusWord,
                targetWord: focusWord,
                focusPinyin: String(pinyinText || '').trim() || undefined,
                source
            });

            const raw =
                payload?.data && typeof payload.data === 'object'
                    ? payload.data
                    : payload && typeof payload === 'object'
                      ? payload
                      : null;
            if (!raw || typeof raw !== 'object') {
                throw new Error('Unexpected response from sentence generator');
            }

            const card = normalizeSentenceMiningCardData(raw, sentenceBody);
            const srcVal = String(sourceInput?.value || '').trim();
            if (srcVal) card.source = srcVal;
            if (!String(card.target_word || '').trim()) card.target_word = focusWord;
            host._lingqTerm = focusWord;
            if (focusInput) focusInput.value = focusWord;

            host._miningState = createDefaultCharacterMiningState();
            host._miningState.card = card;
            host._miningState.lingqLoading = true;
            refreshCharacterMiningCardDOM(host);
            try {
                const term = String(focusWord || '').trim();
                const lj = await characterMiningApiPost('/anki/sentence/lingq-lookup', { term });
                host._miningState.lingqBlock = {
                    configured: Boolean(lj?.configured),
                    found: Boolean(lj?.found),
                    displayScore: typeof lj?.displayScore === 'number' ? lj.displayScore : 0,
                    cardPk: typeof lj?.cardPk === 'number' ? lj.cardPk : undefined,
                    error: typeof lj?.error === 'string' ? lj.error : undefined
                };
                snapshotLingqScoreForAnkiTagsMining(host._miningState, host._miningState.lingqBlock.displayScore);
                if (
                    typeof lj?.suggestedLatest === 'string' &&
                    CHARACTER_MINING_NOTION_OPTIONS.includes(lj.suggestedLatest)
                ) {
                    host._miningState.notionLatest = lj.suggestedLatest;
                }
            } catch (lingqErr) {
                host._miningState.lingqBlock = {
                    configured: false,
                    found: false,
                    displayScore: 0,
                    error: lingqErr instanceof Error ? lingqErr.message : String(lingqErr)
                };
                snapshotLingqScoreForAnkiTagsMining(host._miningState, 0);
            } finally {
                host._miningState.lingqLoading = false;
                refreshCharacterMiningCardDOM(host);
            }
        } catch (error) {
            if (generateErrorEl) {
                generateErrorEl.style.display = 'block';
                let msg = error instanceof Error ? error.message : String(error);
                if (/failed to fetch/i.test(msg)) {
                    const base = (window.characterMiningApiBaseUrl || 'http://localhost:3001/api').replace(/\/+$/, '');
                    msg = `Could not reach ${base} (Failed to fetch). Start the ereader proxy on this machine and reload the extension after updating permissions.`;
                }
                generateErrorEl.textContent = msg;
            }
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = original;
            generateBtn.style.opacity = '1';
        }
    });

    backdrop.addEventListener('click', closeSentenceMiningDrawer);
    closeBtn.addEventListener('click', closeSentenceMiningDrawer);
    currentSentenceMiningEscHandler = (event) => {
        if (tryCloseMiningImageModalFromKeyboard(event)) return;
        if (event.key !== 'Escape') return;
        closeSentenceMiningDrawer();
    };
    window.addEventListener('keydown', currentSentenceMiningEscHandler, MINING_ESCAPE_KEYDOWN_CAPTURE);
}

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
        const formattedCount = typeof formatFrequencyCount === 'function' ? 
            formatFrequencyCount(frequencyInfo.count) : frequencyInfo.count;
        const scoreDescriptionMapZh = {
            5: '前60%',
            4: '60-80%',
            3: '80-90%',
            2: '90-97%',
            1: '97-100%'
        };
        const scoreDescriptionZh =
            scoreDescriptionMapZh[frequencyInfo.score] || frequencyInfo.scoreDescription || '未知';
        
        // Get corpus size from frequency data (total word occurrences)
        const corpusSize = window.frequencyData ? 
            Object.values(window.frequencyData.frequency).reduce((sum, count) => sum + count, 0) : 0;
        const corpusSizeFormatted = typeof formatFrequencyCount === 'function' ? 
            formatFrequencyCount(corpusSize) : corpusSize;

        // Match chinese_ereader PopupHeader: N filled stars (same SVG as CorpusScoreIcon), no leading digit
        const corpusStarSvg =
            '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" style="display:block"><path d="M12 2.5l2.7 6 6.6.5-5 4.3 1.6 6.4L12 16.3 6.1 19.7l1.6-6.4-5-4.3 6.6-.5L12 2.5z" fill="currentColor" stroke-linejoin="round"/></svg>';
        const starCount = Math.max(1, Math.min(5, Number(frequencyInfo.score) || 1));
        let corpusStarsHtml = '';
        for (let si = 0; si < starCount; si += 1) {
            corpusStarsHtml +=
                '<span style="display:inline-flex;align-items:center;justify-content:center;width:1rem;height:1rem;line-height:0;">' +
                corpusStarSvg +
                '</span>';
        }
        
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
            <span class="popup-corpus-stars" style="display:inline-flex;align-items:center;gap:0;color:#c4b06a;">${corpusStarsHtml}</span>
            <span style="color: #888; font-size: 0.95em;">(${scoreDescriptionZh})</span>
            <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
            <span style="color:#fff;font-size:0.97em;margin:0;padding:0;">语料 ${formattedCount} 次 / ${corpusSizeFormatted}</span>
            <span style="color:#888;font-size:1.1em;margin:0 6px;padding:0;">|</span>
            <span class="popup-count" style="color:#fff;font-size:0.97em;margin:0;padding:0;">${count}</span>
          </div>
        `;
    }

    const statusButtonsHtml = STATUS_BUTTON_META.map(
        ({ key, title }) =>
            `<button type="button" class="status-btn" data-status-key="${key}" title="${title}">${key}</button>`
    ).join('');

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
      <div class="status-row" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:6px;">
        ${statusButtonsHtml}
      </div>
      <div class="tag-row" style="display:flex;flex-direction:row;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;">
        <button type="button" class="tag-btn" data-tag-value="characters known">字都认识</button>
        <button type="button" class="tag-btn" data-tag-value="partial characters known">部分字认识</button>
      </div>
      <div class="popup-actions-row">
        <button type="button" class="popup-action-btn popup-copy-sentence-btn">复制句子</button>
        <button type="button" class="popup-action-btn popup-mine-char-btn">字卡</button>
        <button type="button" class="popup-action-btn popup-mine-sentence-btn">句卡</button>
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
        btn.style.fontSize = '0.8em';
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

    const actionRow = popup.querySelector('.popup-actions-row');
    if (actionRow) {
        Object.assign(actionRow.style, {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '6px',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            marginTop: '2px'
        });
    }

    popup.querySelectorAll('.popup-action-btn').forEach((btn) => {
        Object.assign(btn.style, {
            flex: '1 1 auto',
            minWidth: '0',
            borderRadius: '6px',
            border: '1px solid #6B7280',
            background: 'rgb(40, 40, 40)',
            color: '#fff',
            fontSize: '0.84em',
            padding: '6px 10px',
            cursor: btn.disabled ? 'not-allowed' : 'pointer',
            opacity: btn.disabled ? '0.55' : '1',
            outline: 'none',
            lineHeight: '1.2',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.15s, background 0.15s'
        });
    });

    const panel = document.querySelector('.char-mining-panel');
    if (panel) {
        // already open; no-op
    }
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
    let borderBottom = 0;
    const computed = window.getComputedStyle(wordElement);
    if (computed && computed.borderBottomWidth) {
        borderBottom = parseFloat(computed.borderBottomWidth) || 0;
    }
    const hasUnderline = borderBottom > 0 && computed.borderBottomStyle !== 'none';

    // Viewport-fixed overlay (Plex player): use getBoundingClientRect() only — no scrollX/scrollY.
    popup.style.position = 'fixed';

    // Determine if popup should appear above or below
    const position = window.subtitleConfig?.position || 'bottom';
    let popupTop;
    if (position !== 'bottom') {
        // For center/top, include underline/border if present
        const popupOffset = 8;
        popupTop = rect.bottom + popupOffset;
        if (hasUnderline) {
            // Subtract the border width so the popup is always offset from the text baseline
            popupTop = rect.bottom - borderBottom + popupOffset - 2;
        }
    }
    popup.style.left = `${rect.left + rect.width / 2}px`;
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
        popup.style.top = `${rect.top - popupHeight - popupOffset + extraPinyinOffset}px`;
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
    hideWordPopup(true); // Pass true to skip re-render and prevent infinite loop
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
    if (isAnyMiningDrawerOpen()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
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
    // Skip subtitle re-render here: reRenderCurrentSubtitle replaces DOM and invalidates this
    // `wordElement` reference, so getBoundingClientRect() would be (0,0) and the popup jumps to the corner.
    hideWordPopup(true);
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
    if (!popup) return;
    const targetEl = event.target instanceof Element ? event.target : event.target?.parentElement;
    
    // Don't close if clicking inside the popup (including buttons)
    if (popup.contains(event.target)) {
        return;
    }
    
    // Don't close if clicking a subtitle word (let its click handler manage the popup)
    if (targetEl && targetEl.closest('.subtitle-word')) {
        return;
    }
    
    // Click is outside the popup and not on a subtitle word, so close it
    event.preventDefault();
    event.stopPropagation();
    hideWordPopup();
}

/**
 * Adds click event handlers to status and tag buttons in the popup.
 * Handles status updates and tag toggles when buttons are clicked.
 * @param {HTMLElement} popup - The popup DOM element containing buttons
 * @param {string} wordText - The Chinese word text being updated
 * @param {HTMLElement} wordElement - The clicked `.subtitle-word` element (for copy sentence)
 * @returns {void}
 */
function addButtonClickHandlers(popup, wordText, wordElement) {
    // Add status button click handlers
    const statusButtons = popup.querySelectorAll('.status-btn');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const statusKey = (btn.getAttribute('data-status-key') || btn.textContent || '').trim();
            console.log(`[word_popup] Status button clicked: ${statusKey} for word: ${wordText}`);
            
            await updateWordStatus(wordText, statusKey);
        });
    });
    
    // Add tag button click handlers (labels localized; LingQ values in data-tag-value)
    const tagButtons = popup.querySelectorAll('.tag-btn');
    tagButtons.forEach(btn => {
        btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const tagValue = (btn.getAttribute('data-tag-value') || btn.textContent || '').trim();
            console.log(`[word_popup] Tag button clicked: ${tagValue} for word: ${wordText}`);
            
            await toggleWordTag(wordText, tagValue);
        });
    });

    const copyBtn = popup.querySelector('.popup-copy-sentence-btn');
    if (copyBtn && wordElement) {
        copyBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            await copySubtitleSentenceFromWordElement(wordElement, copyBtn);
        });
    }

    const mineCharBtn = popup.querySelector('.popup-mine-char-btn');
    if (mineCharBtn && wordElement) {
        mineCharBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const sentenceText = getSubtitleLinePlainFromWordElement(wordElement);
            const pinyinText = typeof window.getPinyin === 'function' ? window.getPinyin(wordText) : '';
            hideWordPopup(true);
            openCharacterMiningDrawer({
                wordText,
                pinyinText,
                sentenceText
            });
        });
    }

    const mineSentenceBtn = popup.querySelector('.popup-mine-sentence-btn');
    if (mineSentenceBtn && wordElement) {
        mineSentenceBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const sentenceText = getSubtitleLinePlainFromWordElement(wordElement);
            const pinyinText = typeof window.getPinyin === 'function' ? window.getPinyin(wordText) : '';
            hideWordPopup(true);
            openSentenceMiningDrawer({
                wordText,
                pinyinText,
                sentenceText
            });
        });
    }
}

//////////////////////////////
// 5. POPUP DATA UPDATES
//////////////////////////////

/**
 * Updates the LingQ status for a word based on button click.
 * Maps status key (data-status-key / same as visible glyph) to LingQ status values and updates both local storage and server.
 * @param {string} wordText - The Chinese word to update
 * @param {string} buttonText - Status key: 🗑️, 0, 1, 2, 3, 4, or ✓
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
        } else if (buttonText === '🗑️') {
            // Trashcan = Ignored (status=-1)
            newStatus = -1;
            newExtendedStatus = null;
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
        
        // Update pinyin display without re-rendering the entire subtitle
        if (typeof updateWordPinyin === 'function') {
            updateWordPinyin(wordText, newStatus, newExtendedStatus, currentTags);
        }
        
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
 * @param {string} tagText - LingQ tag string (e.g. characters known, partial characters known)
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
        
        // Update pinyin display without re-rendering the entire subtitle
        if (typeof updateWordPinyin === 'function') {
            updateWordPinyin(wordText, currentData.status, currentData.extended_status, newTags);
        }
        
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
        // Use window.lingqTerms as the source of truth (most up-to-date) to avoid race conditions
        // If it doesn't exist, load from storage
        let lingqTerms;
        if (window.lingqTerms && typeof window.lingqTerms === 'object') {
            console.log(`[word_popup] Using existing window.lingqTerms (${Object.keys(window.lingqTerms).length} terms)`);
            // Deep clone to avoid mutating the original object
            lingqTerms = JSON.parse(JSON.stringify(window.lingqTerms));
        } else {
            console.log(`[word_popup] window.lingqTerms not available, loading from storage...`);
            lingqTerms = await window.lingqData.loadLingQTerms();
            console.log(`[word_popup] Current LingQ terms loaded:`, Object.keys(lingqTerms).length, 'terms');
        }
        
        // Normalize word text (strip non-Chinese characters)
        const normalizedWordText = (wordText.match(/[\u4e00-\u9fff]+/g) || []).join('');
        
        if (status === null) {
            // Remove word from LingQ data
            delete lingqTerms[normalizedWordText];
            console.log(`[word_popup] Removed '${normalizedWordText}' from local LingQ data`);
        } else {
            // Update or add word to LingQ data
            lingqTerms[normalizedWordText] = {
                status: status,
                extended_status: extendedStatus,
                tags: tags || []
            };
            console.log(`[word_popup] Updated local LingQ data for '${normalizedWordText}':`, lingqTerms[normalizedWordText]);
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
                            case -1: underlineColor = null; break;                    // Ignored — no underline
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
 * Updates the pinyin display for a specific word without re-rendering the entire subtitle.
 * Finds all instances of the word and updates their pinyin structure based on tags/status.
 * @param {string} wordText - The Chinese word to update
 * @param {number|null} status - The status value
 * @param {number|null} extendedStatus - The extended status value
 * @param {Array<string>} tags - The tags array
 * @returns {void}
 */
function updateWordPinyin(wordText, status, extendedStatus, tags) {
    console.log(`[word_popup] updateWordPinyin called for '${wordText}' with tags:`, tags);
    
    // Functions should be in global scope from utils.js (loaded before word_popup.js)
    // If they're not available, skip update (pinyin will update on next re-render)
    if (typeof getPinyin !== 'function' || typeof getToneColor !== 'function') {
        console.warn('[word_popup] Required functions (getPinyin, getToneColor) not available - pinyin will update on next re-render');
        return;
    }
    
    // Strip non-Chinese characters for consistent matching
    const chineseOnly = (wordText.match(/[\u4e00-\u9fff]+/g) || []).join('');
    if (!chineseOnly) return;
    
    // Get pinyin for the word
    const pinyin = getPinyin(chineseOnly);
    if (pinyin === "none") return;
    
    const pinyinList = pinyin.split(" ");
    const charList = [...chineseOnly];
    
    // Find all word elements with this text
    const wordElements = document.querySelectorAll('.subtitle-word');
    
    wordElements.forEach(element => {
        // Check if this element contains the target word
        const elementText = element.textContent.trim();
        const elementChineseOnly = (elementText.match(/[\u4e00-\u9fff]+/g) || []).join('');
        
        if (elementText === wordText || elementText.includes(wordText) || elementChineseOnly === chineseOnly) {
            // Build status object for pinyin logic
            const statusObj = { status, extended_status: extendedStatus, tags: tags || [] };
            
            // Update pinyin for each character in this word element
            updateWordElementPinyin(element, charList, pinyinList, statusObj);
        }
    });
}

/**
 * Updates the pinyin structure for a single word element.
 * @param {HTMLElement} wordElement - The .subtitle-word element
 * @param {Array<string>} charList - Array of characters in the word
 * @param {Array<string>} pinyinList - Array of pinyin syllables (one per character)
 * @param {Object} statusObj - Status object with status, extended_status, and tags
 * @returns {void}
 */
function updateWordElementPinyin(wordElement, charList, pinyinList, statusObj) {
    const hanziFontStack = "'KaiTi-Web', 'KaiTi', 'KaiTi_GB2312', 'Kaiti SC', 'STKaiti', 'DFKai-SB', serif";
    const latinFontStack = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    const config = window.subtitleConfig || {};
    const isPinyinAll = config.pinyin === "all";
    const isPinyinUnknownOnly = config.pinyin === "unknown-only";
    const isChinese = true; // We're processing Chinese words
    const isPunct = false; // We've already filtered to Chinese characters
    
    // Get tags from status object
    const tags = statusObj?.tags || [];
    const hasCharactersKnownTag = tags.includes("characters known");
    const hasPartialCharactersKnownTag = tags.includes("partial characters known");
    const isLearned = statusObj && statusObj.status === 3 && (statusObj.extended_status === 0 || statusObj.extended_status === null);
    
    // Get known single-character words set
    const knownSingleChars = typeof getKnownSingleCharWords === 'function' 
        ? getKnownSingleCharWords() 
        : new Set();
    
    const shouldColor = config.toneColor === "all" || 
        (config.toneColor === "unknown-only" && (!statusObj || !isKnownWord(statusObj)));
    
    // Apply tone change rules for 不 and 一 based on following characters
    const adjustedPinyinList = pinyinList.map((charPinyin, index) => {
        const char = charList[index];
        const nextCharPinyin = index < pinyinList.length - 1 ? pinyinList[index + 1] : null;
        return typeof applyToneChangeRules === 'function' 
            ? applyToneChangeRules(char, charPinyin, nextCharPinyin, charList.join(''), index)
            : charPinyin;
    });
    
    // Get all children (excluding tooltip divs)
    const children = Array.from(wordElement.children).filter(child => 
        child.tagName !== 'DIV' && (child.tagName === 'RUBY' || child.tagName === 'SPAN')
    );
    
    // Process each character
    let charIndex = 0;
    children.forEach((child, childIndex) => {
        // Skip if we've processed all characters
        if (charIndex >= charList.length) return;
        
        const char = charList[charIndex];
        const charPinyin = adjustedPinyinList[charIndex] || "";
        
        // Extract character text from child
        let currentChar = '';
        if (child.tagName === 'RUBY') {
            const span = child.querySelector('span');
            currentChar = span ? span.textContent : '';
        } else if (child.tagName === 'SPAN') {
            currentChar = child.textContent.trim();
        } else {
            // Skip non-character elements (like tooltips)
            return;
        }
        
        // Skip if this child doesn't match the expected character
        if (currentChar !== char) {
            return;
        }
        
        // Determine if pinyin should be shown for this character
        let shouldShowCharPinyin = false;
        
        if (isPinyinAll) {
            shouldShowCharPinyin = !hasCharactersKnownTag;
        } else if (isPinyinUnknownOnly) {
            if (hasCharactersKnownTag) {
                shouldShowCharPinyin = false;
            } else if (hasPartialCharactersKnownTag) {
                const isCharKnown = knownSingleChars.has(char);
                shouldShowCharPinyin = !isCharKnown;
            } else if (isLearned) {
                // Rule 3: "learned" words = show pinyin only for characters NOT in known set
                const isCharKnown = knownSingleChars.has(char);
                shouldShowCharPinyin = !isCharKnown;
                console.log(`[Pinyin Debug] Word (learned) - Character "${char}": ${isCharKnown ? '✅ FOUND in known set (will hide pinyin)' : '❌ NOT FOUND in known set (will show pinyin)'}`);
            } else {
                // Default "unknown-only" behavior: for any unknown word, hide pinyin for known characters
                if (!statusObj || !isKnownWord(statusObj)) {
                    // Word is unknown (not in LingQ data OR not known in LingQ): hide pinyin for known characters
                    if (statusObj && statusObj.status === -1) {
                        // Ignored words: don't show pinyin
                        shouldShowCharPinyin = false;
                    } else {
                        // Check if this character is known
                        const isCharKnown = knownSingleChars.has(char);
                        shouldShowCharPinyin = !isCharKnown;
                    }
                } else {
                    // Word is known (status=3): don't show pinyin
                    shouldShowCharPinyin = false;
                }
            }
        }
        
        // Determine current state
        const currentlyHasPinyin = child.tagName === 'RUBY';
        const needsPinyin = shouldShowCharPinyin && charPinyin;
        
        // Only update if structure needs to change
        if (currentlyHasPinyin !== needsPinyin) {
            const toneColor = shouldColor && charPinyin ? getToneColor(charPinyin) : "white";
            
            if (needsPinyin) {
                // Need to add pinyin - convert span to ruby
                const ruby = document.createElement("ruby");
                const span = document.createElement("span");
                span.textContent = char;
                span.style.margin = "0";
                span.style.color = toneColor;
                if (/[\u4e00-\u9fff]/.test(char)) span.style.fontFamily = hanziFontStack;
                
                const rt = document.createElement("rt");
                rt.textContent = charPinyin;
                rt.style.color = toneColor;
                rt.style.fontFamily = latinFontStack;
                
                ruby.appendChild(span);
                ruby.appendChild(rt);
                wordElement.replaceChild(ruby, child);
            } else {
                // Need to remove pinyin - convert ruby to span
                const span = child.querySelector('span');
                if (span) {
                    const newSpan = document.createElement("span");
                    newSpan.textContent = span.textContent;
                    newSpan.style.margin = "0";
                    newSpan.style.color = span.style.color || "white";
                    if (/[\u4e00-\u9fff]/.test(newSpan.textContent || "")) newSpan.style.fontFamily = hanziFontStack;
                    wordElement.replaceChild(newSpan, child);
                }
            }
        } else if (currentlyHasPinyin && needsPinyin) {
            // Structure is correct, but update tone color if needed
            const span = child.querySelector('span');
            const rt = child.querySelector('rt');
            if (span && rt) {
                const toneColor = shouldColor && charPinyin ? getToneColor(charPinyin) : "white";
                span.style.color = toneColor;
                rt.style.color = toneColor;
                if (/[\u4e00-\u9fff]/.test(span.textContent || "")) span.style.fontFamily = hanziFontStack;
                rt.style.fontFamily = latinFontStack;
            }
        }
        
        charIndex++;
    });
    
    console.log(`[word_popup] Updated pinyin structure for word element`);
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
