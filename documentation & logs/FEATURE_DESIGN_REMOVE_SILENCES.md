# Feature Design: Remove Silences - Skip Between Subtitle Segments

## Overview
Implement a "Remove Silences" mode that automatically skips video playback from the end of one subtitle segment directly to the beginning of the next, eliminating silent periods and providing pure learning time without gaps.

## Current State Analysis

### Control Panel Status
The control panel currently has:
- A "Remove silences (to-do)" dropdown in the Behavior section
- Options: "Off" (selected) and "On"
- Currently marked as "to-do" indicating it's not yet implemented

### Current Playback Behavior
- Normal video playback with continuous timeline
- Subtitles appear and disappear based on their timing
- Silent periods between subtitle segments are played normally
- User manually controls playback (play/pause/seek)

## Feature Requirements

### 1. UI Changes
**Location**: `html/control_panel.html` - Behavior section

**Current**:
```html
<div class="control-row">
  <label for="dropdown-remove-silences">Remove silences (to-do)</label>
  <select id="dropdown-remove-silences">
    <option value="off" selected>Off</option>
    <option value="on">On</option>
  </select>
</div>
```

**Proposed**:
```html
<div class="control-row">
  <label for="dropdown-remove-silences">Remove silences</label>
  <select id="dropdown-remove-silences">
    <option value="off" selected>Off</option>
    <option value="on">On</option>
  </select>
</div>
```

### 2. Core Functionality

#### Mode Behavior
**When Enabled (On)**:
- Video automatically skips from end of subtitle A to start of subtitle B
- No manual intervention required during playback
- Maintains natural subtitle timing within each segment
- Provides continuous learning experience without silent gaps

**When Disabled (Off)**:
- Normal video playback behavior
- Silent periods play normally
- User has full control over timeline

#### Skip Logic
**Trigger Conditions**:
- Current video time reaches the end of an active subtitle segment PLUS the auto-pause threshold
- Next subtitle segment exists in the timeline
- Remove silences mode is enabled

**Skip Behavior**:
- Automatically seek to the start time of the next subtitle
- Maintain playback state (if playing, continue playing)
- Preserve user's current playback speed settings

**Why Use Auto-Pause Threshold**:
- Ensures user has heard the entire subtitle before skipping
- Leverages existing user-configured timing preference
- Provides consistent behavior with auto-pause functionality
- No need for additional configuration

### 3. Data Processing Logic

#### Function: `shouldSkipToNextSubtitle()`
**Purpose**: Determine if current playback should skip to next subtitle

**Inputs**:
- Current video time
- Current subtitle segment end time
- Next subtitle segment start time
- Remove silences setting
- Auto-pause threshold (from existing setting)

**Process**:
1. Check if remove silences mode is enabled
2. Calculate skip trigger time: `subtitleEndTime + autoPauseThreshold`
3. Compare current time with skip trigger time
4. Verify next subtitle exists
5. Trigger skip when current time >= skip trigger time

**Output**:
```javascript
{
  shouldSkip: true/false,
  nextSubtitleTime: 45.2,
  skipReason: "end_of_subtitle_plus_threshold"
}
```

#### Function: `getNextSubtitleTime()`
**Purpose**: Find the start time of the next subtitle segment

**Inputs**:
- Current subtitle index
- Subtitle data array

**Process**:
1. Find current subtitle in array
2. Look for next subtitle with different start time
3. Handle edge cases (last subtitle, no next subtitle)

**Output**:
```javascript
{
  found: true/false,
  nextTime: 45.2,
  nextIndex: 15
}
```

### 4. Integration Points

#### A. Video Player Control
- **Location**: `helper_scripts/control.js`
- Monitor video time updates
- Trigger skip logic when conditions are met
- Handle seek operations to next subtitle

#### B. Subtitle Timing (Preprocessed Mode Only)
- **Location**: `helper_scripts/preprocessed.js`
- Access current subtitle timing information
- Track current subtitle index
- Provide subtitle data for skip calculations
- Access full subtitle timeline for next subtitle prediction

#### C. User Controls
- **Location**: `helper_scripts/control.js`
- Handle dropdown change events
- Enable/disable skip functionality
- Provide visual feedback when mode is active
- Disable remove silences option in live mode (not supported)

#### D. Live Mode Limitations
- **Location**: `helper_scripts/live.js`
- Disable remove silences dropdown when in live mode
- Show user feedback that feature is not available
- Prevent accidental activation in unsupported mode

### 5. Implementation Strategy

#### Phase 1: Core Skip Logic
1. Create skip detection functions
2. Implement next subtitle time calculation
3. Add basic skip functionality
4. Test with simple subtitle data

#### Phase 2: Video Integration
1. Integrate with video time monitoring
2. Add automatic seek functionality
3. Handle playback state preservation
4. Test with actual video playback

#### Phase 3: UI Integration
1. Connect dropdown to skip functionality
2. Add visual indicators for active mode
3. Handle mode switching during playback
4. Disable remove silences option in live mode
5. Add error handling and edge cases

#### Phase 4: Polish and Testing
1. Fine-tune skip timing thresholds
2. Add performance optimizations
3. Test with various subtitle formats
4. Handle edge cases and error conditions

### 6. Technical Specifications

#### File Changes Required
1. `html/control_panel.html` - Remove "(to-do)" from label
2. `helper_scripts/control.js` - Add skip logic and event handlers
3. `helper_scripts/preprocessed.js` - Integrate with subtitle timing
4. `helper_scripts/live.js` - Disable remove silences option (not supported)
5. `helper_scripts/utils.js` - Add utility functions for skip calculations

#### New Functions
```javascript
// utils.js
function shouldSkipToNextSubtitle(currentTime, currentSubtitle, nextSubtitle, removeSilencesEnabled)
function getNextSubtitleTime(currentIndex, subtitleData)
function calculateSkipTriggerTime(subtitleEndTime, autoPauseThreshold)

// control.js
function handleRemoveSilencesToggle()
function monitorVideoTimeForSkips()
function skipToNextSubtitle(nextTime)
function updateRemoveSilencesDisplay(enabled)

// preprocessed.js
function getCurrentSubtitleInfo()
function getNextSubtitleInfo()

// live.js
function disableRemoveSilencesInLiveMode()
```

#### Data Flow
```
Video Time Update → Check Skip Conditions → Calculate Next Time → Execute Skip → Update UI
```

### 7. Performance Considerations

#### Optimization Strategy
- **Efficient Lookup**: Use indexed subtitle data for fast next subtitle finding
- **Throttled Monitoring**: Check skip conditions at reasonable intervals (e.g., 100ms)
- **Cached Calculations**: Store next subtitle times to avoid repeated calculations
- **Minimal DOM Updates**: Only update UI when necessary
- **Reuse Auto-Pause Setting**: Leverage existing auto-pause threshold configuration

#### Memory Management
- Clear skip-related data when switching videos
- Store only essential timing information
- Avoid storing large subtitle arrays in memory

### 8. Error Handling

#### Edge Cases
1. **No Next Subtitle**: Handle end of video gracefully


#### User Feedback
- Visual indicator when skip mode is active
- Smooth transitions between subtitle segments
- Clear error messages for problematic scenarios
- Option to disable mode if issues occur

### 9. Success Criteria

#### Functional Requirements
- [ ] Automatically skip from subtitle end to next subtitle start
- [ ] Maintain playback state during skips
- [ ] Handle mode switching during playback
- [ ] Work with preprocessed subtitle mode only
- [ ] Disable remove silences option in live mode

#### Performance Requirements
- [ ] Skip detection responds within 100ms
- [ ] No noticeable lag during video playback
- [ ] Smooth transitions between subtitle segments
- [ ] Minimal impact on overall extension performance

#### User Experience Requirements
- [ ] Seamless learning experience without silent gaps
- [ ] Clear visual feedback when mode is active
- [ ] Easy mode switching without interrupting playback
- [ ] Consistent behavior across different video types

### 10. Future Enhancements

#### Potential Additions
1. **Skip Preview**: Show next subtitle content before skipping
2. **Skip History**: Track which segments were skipped for review
3. **Selective Skipping**: Skip only certain types of silent periods
4. **Auto-Pause Integration**: Coordinate with auto-pause functionality for seamless experience

#### Advanced Features
1. **Smart Skip Detection**: Use audio analysis to detect actual silence vs. background noise
2. **Learning Analytics**: Track time saved and learning efficiency
3. **Custom Skip Patterns**: Allow users to define specific skip rules
4. **Batch Processing**: Apply skip settings to multiple videos

## Implementation Notes

### Development Approach
- Implement chunk by chunk for easy progress checking
- Add inline comments for complex timing interactions
- Focus on core skip functionality first, then UI integration
- Test extensively with various subtitle timing scenarios