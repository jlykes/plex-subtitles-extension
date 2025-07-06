# Feature Design: LingQ Status Percentage Tracking

## Overview
Add comprehensive LingQ status percentage tracking to the control panel, showing what percentage of words in the current subtitle file fall into each LingQ status category.

## Current State Analysis

### LingQ Status Values
From examining `lingqs.json`, the LingQ status values are:
- **Status 3**: Known (fully mastered)
- **Status 2**: Familiar (familiar, but not fully mastered)
- **Status 1**: Recognized (seen once, being learned)
- **Status 0**: New (never seen before)

### Current Control Panel
The control panel currently has:
- A placeholder for "% word coverage" in the Key Info section
- This appears to be a single percentage value

## Feature Requirements

### 1. UI Changes
**Location**: `html/control_panel.html` - Key Info section

**Current**:
```html
<div class="control-row">
  <label for="coverage-display">% word coverage:</label>
  <span id="coverage-display" class="info-value">---</span>
</div>
```

**Proposed**:
```html
<div class="control-row">
  <label for="mode-display">Mode:</label>
  <span id="mode-display" class="info-value">Auto</span>
</div>
<div class="control-row">
  <label for="status-known">% Known (3):</label>
  <span id="status-known" class="info-value">---</span>
</div>
<div class="control-row">
  <label for="status-familiar">% Familiar (2):</label>
  <span id="status-familiar" class="info-value">---</span>
</div>
<div class="control-row">
  <label for="status-recognized">% Recognized (1):</label>
  <span id="status-recognized" class="info-value">---</span>
</div>
<div class="control-row">
  <label for="status-new">% New (0):</label>
  <span id="status-new" class="info-value">---</span>
</div>
```

### 2. Data Processing Logic

#### Function: `calculateLingQStatusPercentages()`
**Purpose**: Calculate percentage breakdown of words by LingQ status

**Inputs**:
- Current subtitle data (enriched JSON structure with segmented words)
- LingQ terms data (from `lingqs.json`)

**Process**:
1. Extract all word occurrences from enriched subtitle JSON (using segmented words)
2. For each word, look up its LingQ status
3. Count words in each status category (0, 1, 2, 3)
4. Calculate percentages: `(count / total_words) * 100`
5. Handle edge cases (words not in LingQ data = status 0)

**Output**:
```javascript
{
  totalWords: 150,
  status3: { percentage: 30, count: 45 },  // Known
  status2: { percentage: 20, count: 30 },  // Familiar  
  status1: { percentage: 20, count: 30 },  // Recognized
  status0: { percentage: 30, count: 45 }   // New
}
```

### 3. Integration Points

#### A. Preprocessed Mode (`preprocessed.js`)
- Calculate percentages when enriched JSON is loaded
- Update control panel display
- Recalculate when video changes

#### B. Live Mode (`live.js`)
- Hide percentage display rows entirely (not supported in live mode)
- Remove percentage rows from control panel when in live mode

#### C. Control Panel (`control.js`)
- Add event listeners for percentage display updates
- Format percentage values (e.g., "30%" - no decimals)
- Handle cases where no data is available
- Show/hide percentage display rows based on current mode
- Completely remove percentage rows from DOM in live mode

### 4. Performance Considerations

#### Optimization Strategy
- **Single Calculation**: Calculate percentages once when subtitle file is loaded
- **Cross-Document Percentages**: Calculate for entire subtitle document, not per line
- **Video Switch**: Recalculate only when switching to a new video
- **No Incremental Updates**: No need for real-time updates during playback

#### Memory Management
- Clear percentage data when switching videos
- Store calculated percentages for current video only
- No need for complex caching or incremental updates

### 5. Error Handling

#### Edge Cases
1. **No LingQ data**: Show all words as status 0 (unknown)
2. **Empty subtitles**: Display "---" for all percentages
3. **Corrupted data**: Graceful fallback to basic word counting
4. **Large files**: Implement progress indicators for calculation

#### User Feedback
- Loading states: "Calculating..." while processing
- Error states: "Error loading data" with retry option
- Empty states: "No subtitle data available"

### 6. Implementation Plan

#### Phase 1: Core Logic
1. Create `calculateLingQStatusPercentages()` function
2. Add word extraction logic from subtitle data
3. Implement LingQ status lookup system
4. Add percentage calculation logic

#### Phase 2: UI Integration
1. Update control panel HTML with new percentage rows
2. Add CSS styling for new elements
3. Implement display update functions
4. Add event listeners for data updates

#### Phase 3: Mode Integration
1. Integrate with preprocessed mode (calculate once on load)
2. Hide percentage display in live mode
3. Add video change handling (recalculate on new video)
4. Implement cleanup logic



### 7. Technical Specifications

#### File Changes Required
1. `html/control_panel.html` - Add new percentage display rows
2. `helper_scripts/utils.js` - Add percentage calculation function
3. `helper_scripts/preprocessed.js` - Integrate percentage calculation
4. `helper_scripts/live.js` - Hide percentage display in live mode
5. `helper_scripts/control.js` - Add display update logic

#### New Functions
```javascript
// utils.js
function calculateLingQStatusPercentages(subtitleData, lingqTerms)
function extractAllWordsFromSubtitles(subtitleData)
function getLingQStatusForWord(word, lingqTerms)

// control.js
function updateStatusPercentagesDisplay(percentages)
function formatPercentage(value)
function showPercentageDisplay(show)
function hidePercentageRows()
function showPercentageRows()
```

#### Data Flow
```
Subtitle Data → Word Extraction → LingQ Lookup → Percentage Calculation → UI Update
```

### 8. Success Criteria

#### Functional Requirements
- [ ] Display accurate percentage breakdown for all 4 status categories
- [ ] Update percentages when switching videos
- [ ] Only show percentage rows in preprocessed mode (completely hide in live mode)
- [ ] Graceful error handling and fallbacks

#### Performance Requirements
- [ ] Calculation completes within 1 second for typical subtitle files
- [ ] No UI lag during video playback (calculation only happens once)
- [ ] Memory usage remains reasonable (< 10MB additional)

#### User Experience Requirements
- [ ] Clear, readable percentage display
- [ ] Consistent formatting (e.g., "30%" - no decimals)
- [ ] Loading states for better user feedback
- [ ] Responsive to video changes

### 9. Future Enhancements

#### Potential Additions
1. **Historical Tracking**: Show percentage changes over time
2. **Progress Indicators**: Visual progress bars for each status
3. **Export Functionality**: Save percentage data to file
4. **Custom Categories**: Allow user-defined status groupings
5. **Analytics**: Track learning progress across multiple videos

#### Advanced Features
1. **Word Frequency Analysis**: Show most common unknown words
2. **Learning Recommendations**: Suggest focus areas based on percentages
3. **Goal Setting**: Set target percentages for each status
4. **Comparative Analysis**: Compare percentages across different content types

## Implementation Notes

### Development Approach
- Implement chunk by chunk for easy progress checking
- Add inline comments for complex interactions
- Focus on core functionality first, then UI integration 