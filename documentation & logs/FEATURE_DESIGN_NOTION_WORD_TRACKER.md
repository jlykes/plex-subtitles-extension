# Feature Design: Notion Word Tracker Integration

## Project Timeline
- Create Python script for Notion API integration using requests library
- Add environment variable configuration for Notion API key and database ID
- Implement function to create database entries with word, status, and current date
- Integrate Notion API call into word popup status update flow when button "4" is clicked
- Add error handling and logging for API failures
- Test integration with real Notion database
- Add configuration options to enable/disable Notion tracking
- Update documentation and user instructions

## Phases & Checkpoints

### Phase 1: Notion API Infrastructure
- [ ] Create `notion_api.js` module with Notion API client setup
- [ ] Add background script message handler for Notion API calls to avoid CORS issues
- [ ] Add environment variables for `NOTION_API_KEY` and `NOTION_DATABASE_ID` in extension storage
- [ ] Implement `createWordTrackerEntry(word, status, date)` function using fetch API
- [ ] Test: Verify API connection and database access with sample entry

### Phase 2: Integration with Word Popup
- [ ] Modify `updateWordStatus()` in `word_popup.js` to detect status 4 transitions
- [ ] Send message to background script for Notion API calls
- [ ] Implement `addNotionWordTrackerEntry(wordText)` function using chrome.runtime.sendMessage
- [ ] Test: Click button "4" on word popup and verify Notion entry creation

### Phase 3: Configuration & Error Handling
- [ ] Implement error handling for API failures with user feedback, and say "Failed to update Notion" in popup somewhere
- [ ] Add logging for debugging Notion API interactions
- [ ] Test: Verify graceful handling of network errors and invalid API keys

## Technical Implementation

### Notion Database Structure
The Notion database should have the following properties:
- **Word** (Title): The Chinese word being tracked
- **Latest** (Select): Dropdown with options including "enrich_srt.py4" for learned status
- **Date** (Date): The date when the word was marked as learned

### API Integration Points
1. **Word Popup Status Update**: When button "4" is clicked in `word_popup.js`
2. **Background Script**: Handle Notion API calls to avoid CORS issues
3. **Configuration**: User toggle to enable/disable feature

### Error Handling Strategy
- Network failures: Log error but don't block LingQ status update
- Invalid API key: Show user-friendly error message
- Database access issues: Graceful degradation with logging

## Potential Future Features
- Track additional metadata (video source, context, etc.)
- Sync existing LingQ learned words to Notion database
- Add Notion database as data source for word status
- Export learning statistics to Notion for analysis
- Batch import/export functionality between LingQ and Notion 