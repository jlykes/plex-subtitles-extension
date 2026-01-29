# Pinyin Display and Tone Coloring Logic

This document explains the complete logic for displaying pinyin and applying tone colors in the Chinese e-reader application.

## Overview

The application uses a two-level system for determining pinyin display:
1. **Word-level logic**: Determines if pinyin should be shown for a word based on LingQ vocabulary status
2. **Character-level logic**: Overrides word-level logic when individual characters are known, even if the word is unknown

Tone coloring is applied to pinyin syllables based on their tone (1-5), with special rules for tone changes in 不 (bu) and 一 (yi).

---

## 1. Pinyin Display Logic

### 1.1 Word-Level Pinyin Display (`shouldShowPinyin`)

The word-level function determines whether to show pinyin for an entire word based on its LingQ vocabulary status.

**Input:**
- `word`: The word string (may contain punctuation)
- `lingqTerms`: Dictionary mapping Chinese-only words to their LingQ status data: `{ [word]: { status, extended_status, tags } }`

**Process:**
1. Extract Chinese-only characters from the word (removes punctuation, numbers, etc.)
2. Look up the word in `lingqTerms` using the Chinese-only version
3. If word not found in LingQ data → **Show pinyin** (unknown word)
4. If word found, check status and tags:
   - **Status -1 (Ignored)**: Hide pinyin
   - **Status 3, Extended Status 3 (Known)**: Hide pinyin
   - **Tag "characters known"**: Hide pinyin
   - **Tag "partial characters known"**: Return true (defer to character-level logic)
   - **All other statuses** (New=0, Learning=1, Familiar=2, Learned=3 with extended_status=0/null): Show pinyin

**Output:** Boolean indicating whether pinyin should be shown at the word level

### 1.2 Character-Level Pinyin Display (`shouldShowPinyinForCharacter`)

The character-level function provides fine-grained control, hiding pinyin for individual known characters even when the word is unknown.

**Input:**
- `char`: The individual character to check
- `word`: The word containing this character
- `lingqTerms`: Dictionary of word status data
- `knownCharacters`: Set of known single-character words (loaded from LingQ vocabulary)

**Process:**
1. Extract Chinese-only version of the word
2. Look up word in `lingqTerms`

**For Unknown Words (not in LingQ data):**
- If character is in `knownCharacters` set → **Hide pinyin** for this character
- Otherwise → **Show pinyin** for this character

**For Known Words (in LingQ data):**
- **Status 3, Extended Status 3 (Known)**: Hide pinyin
- **Status -1 (Ignored)**: Hide pinyin
- **Tag "partial characters known"**: 
  - If character is in `knownCharacters` set → Hide pinyin
  - Otherwise → Show pinyin
- **All other word statuses**:
  - If character is in `knownCharacters` set → Hide pinyin
  - Otherwise → Use word-level logic (`shouldShowPinyin`)

**Output:** Boolean indicating whether pinyin should be shown for this specific character

### 1.3 Key Principles

1. **Character knowledge overrides word status**: If a character is known (in `knownCharacters` set), pinyin is hidden for that character regardless of word status
2. **Unknown words with known characters**: Even completely unknown words will hide pinyin for characters you know
3. **"Partial characters known" tag**: Allows word-level status while still hiding pinyin for known characters
4. **"Characters known" tag**: Hides pinyin for the entire word at the word level

---

## 2. Tone Coloring

### 2.1 Tone Extraction (`extractToneFromPinyin`)

Extracts the tone number (1-5) from a pinyin syllable with tone marks.

**Process:**
1. Match tone marks in the pinyin syllable:
   - `āēīōūǖ` → Tone 1
   - `áéíóúǘ` → Tone 2
   - `ǎěǐǒǔǚ` → Tone 3
   - `àèìòùǜ` → Tone 4
   - No tone mark → Tone 5 (neutral)
2. Return tone number (1-5)

### 2.2 Color Mapping (`getToneColor`)

Maps tone numbers to colors, with different palettes for dark mode and light mode.

**Dark Mode Colors:**
- Tone 1: `#ffccd2` (soft, light red)
- Tone 2: `#fff1b8` (soft, light yellow)
- Tone 3: `#c8f2cc` (soft, light green)
- Tone 4: `#b3d8fa` (soft, light blue)
- Tone 5 (neutral): `#e5e5e5` (light gray)

**Light Mode Colors:**
- Tone 1: `#b71c1c` (desaturated darker red)
- Tone 2: `#b8860b` (darker gold)
- Tone 3: `#2e7d32` (desaturated darker green)
- Tone 4: `#1565c0` (desaturated darker blue)
- Tone 5 (neutral): `#616161` (desaturated darker gray)

**Usage:** The color is applied to both the character and its pinyin ruby text.

---

## 3. Tone Change Rules for 不 (bu) and 一 (yi)

### 3.1 Special Case: 一 as Number

Before applying tone change rules, check if 一 is used as a number (should remain tone 1).

**Patterns that indicate 一 as number:**
- Common number words: `十一`, `二十一`, `一百`, `一千`, `一万`, `第一`, `第二`, etc.
- Pattern matches:
  - `一` followed by single digits: `一[一二三四五六七八九十]`
  - `一` with units: `一[十百千万]`
  - Digits followed by `一`: `[一二三四五六七八九十]一`
  - `第` + number: `第[一二三四五六七八九十]`
  - Number + counter: `第[一二三四五六七八九十][个次回]`
  - Months/days: `[一二三四五六七八九十]月`, `[一二三四五六七八九十]日`, etc.

**If 一 is a number:** Convert any tone mark to tone 1 (āēīōūǖ) and return early.

### 3.2 General Tone Change Rules

**Rule:** Both 不 and 一 change tone based on the tone of the **next character** in the word.

**For 不 (bu):**
- If next character is tone 4 → Change 不 to tone 2 (áéíóúǘ)
- Otherwise → Keep 不 as tone 4 (àèìòùǜ) - no change needed

**For 一 (yi):**
- If next character is tone 4 → Change 一 to tone 2 (áéíóúǘ)
- Otherwise → Change 一 to tone 4 (àèìòùǜ)

**Implementation:**
1. Extract tone from next character's pinyin using `extractToneFromPinyin`
2. If next character tone is 4:
   - For 不: Convert tone 4 marks (àèìòùǜ) to tone 2 marks (áéíóúǘ)
   - For 一: Convert tone 1 marks (āēīōūǖ) to tone 2 marks (áéíóúǘ)
3. Otherwise:
   - For 不: No change (already tone 4)
   - For 一: Convert tone 1 marks (āēīōūǖ) to tone 4 marks (àèìòùǜ)

**Tone Mark Conversion Tables:**

*Tone 1 → Tone 2:*
- `ā` → `á`, `ē` → `é`, `ī` → `í`, `ō` → `ó`, `ū` → `ú`, `ǖ` → `ǘ`

*Tone 1 → Tone 4:*
- `ā` → `à`, `ē` → `è`, `ī` → `ì`, `ō` → `ò`, `ū` → `ù`, `ǖ` → `ǜ`

*Tone 4 → Tone 2:*
- `à` → `á`, `è` → `é`, `ì` → `í`, `ò` → `ó`, `ù` → `ú`, `ǜ` → `ǘ`

### 3.3 Application Order

1. Check if 一 is used as number → If yes, convert to tone 1 and return
2. Check if next character pinyin is available → If not, return original pinyin
3. Extract tone from next character
4. Apply tone change rules based on next character's tone
5. Return modified pinyin

**Note:** Tone change rules are only applied when `showToneColors` is enabled, as the modified pinyin affects the color display.

---

## 4. Neutral Tone Handling (Bonus)

The application also supports neutral tone for the last character of specific words.

**Process:**
1. Check if word is in neutral tone words set (loaded from `/_Neutral-Tone-Words.txt`)
2. If word is neutral tone word AND character is the last character in the word:
   - Remove tone marks from pinyin (convert to neutral tone)
   - Tone mark removal mapping:
     - `āáǎà` → `a`
     - `ēéěè` → `e`
     - `īíǐì` → `i`
     - `ōóǒò` → `o`
     - `ūúǔù` → `u`
     - `ǖǘǚǜ` → `ü`

**Application:** Neutral tone is applied after tone change rules, so the last character of neutral tone words will display without tone marks and be colored as tone 5 (neutral/gray).

---

## 5. Implementation Flow

For each character in a word:

1. **Get pinyin**: Use provided pinyin from JSON, or generate using pinyin-pro library
2. **Apply tone change rules** (if `showToneColors` enabled and character is 不 or 一):
   - Check if 一 is number → convert to tone 1
   - Otherwise, check next character tone → apply tone change
3. **Apply neutral tone** (if `showToneColors` enabled, character is last in word, and word is neutral tone word):
   - Remove tone marks
4. **Extract tone and get color**: Use modified pinyin to determine color
5. **Check if pinyin should be displayed**:
   - Use character-level logic (`shouldShowPinyinForCharacter`)
   - This checks word status, character knowledge, and tags
6. **Render**:
   - If pinyin should be shown: Render `<ruby>` tag with character and pinyin, both colored
   - If pinyin should be hidden: Render `<span>` tag with character only, colored

---

## 6. Data Structures

### LingQ Status Object
```typescript
{
  status: number,        // -1: Ignored, 0: New, 1: Learning, 2: Familiar, 3: Known/Learned
  extended_status: number | null,  // 0: Learned, 3: Known, null: default
  tags: string[]         // ["characters known", "partial characters known", etc.]
}
```

### Known Characters Set
- Set of single-character strings (e.g., `Set(["一", "不", "的", ...])`)
- Loaded from LingQ vocabulary (words that are single characters and marked as Known/Learned)
- Used to check if individual characters are known regardless of word status

---

## 7. Example Scenarios

### Scenario 1: Unknown Word with Known Characters
- Word: `不知道` (unknown word, blue underline)
- Character `不`: Known → Hide pinyin
- Character `知`: Unknown → Show pinyin
- Character `道`: Known → Hide pinyin

### Scenario 2: Word with "Partial Characters Known" Tag
- Word: `学习` (tagged "partial characters known", status=Learning)
- Character `学`: Known → Hide pinyin
- Character `习`: Unknown → Show pinyin

### Scenario 3: 一 with Tone Change
- Word: `一个`
- Character `一`: Next character `个` is tone 4 → Change 一 to tone 2 (yí)
- Character `个`: Normal display

### Scenario 4: 不 with Tone Change
- Word: `不是`
- Character `不`: Next character `是` is tone 4 → Change 不 to tone 2 (bú)
- Character `是`: Normal display

### Scenario 5: 一 as Number
- Word: `第一`
- Character `一`: Matches number pattern → Keep as tone 1 (yī)
- Character `第`: Normal display

---

## Summary

The pinyin display system prioritizes character-level knowledge over word-level status, allowing fine-grained control. Tone coloring provides visual feedback for tone pronunciation, with special handling for tone changes in 不 and 一 based on the following character's tone. The system is designed to progressively hide pinyin as users learn characters and words, while maintaining accurate tone representation through color coding.

