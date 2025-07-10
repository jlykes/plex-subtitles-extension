# Feature Design: Word Frequency Score in Word Popup

## Project Timeline
- Analyze all `enriched_subtitles/*.enriched.json` files to build a word frequency corpus
- Define frequency score mapping: assign a score (1-5) based on word's relative frequency percentile
- On word popup open, fetch and display the frequency score for the selected word
- Add a visual indicator (e.g., colored badge or number) to the popup UI for the score
- Ensure frequency data is efficiently cached or precomputed for fast lookup
- Update UI logic in `word_popup.js` to show the score alongside status/tags
- Add helper functions in `lingq_data.js` for frequency lookup
- Handle missing words (not in corpus) gracefully (e.g., show N/A or lowest score)
- Test with a variety of words to ensure score accuracy and UI clarity
- Document the scoring logic and update user instructions if needed

## Phases & Checkpoints

### Phase 1: Frequency Data Extraction & Scoring
- [ ] Script or function to parse all `enriched_subtitles/*.enriched.json` files and count word frequencies.
- [ ] Output: A frequency dictionary (word → count) saved to a cache file or in-memory object.
- [ ] Define and document the mapping from frequency percentiles to scores (1–5).
- [ ] Test: Manually inspect a few words to verify counts and score assignments are reasonable.

### Phase 2: Popup Integration & UI Display
- [ ] On word popup open, fetch the frequency score for the selected word from the precomputed data.
- [ ] Display the score visually in the popup (e.g., badge, number, or color).
- [ ] Handle missing words gracefully (e.g., show N/A or lowest score).
- [ ] Test: Open popups for a variety of words and verify the score appears and matches expectations.

### Phase 3: Performance, UX, and Documentation
- [ ] Ensure frequency data is efficiently loaded/cached for fast lookups.
- [ ] Add a tooltip or info icon explaining the score meaning (optional, but good for UX).
- [ ] Update documentation and user instructions.
- [ ] Test: Evaluate performance and user understanding with real usage.

## Potential Future Features
- Allow users to toggle between absolute frequency and percentile score
- Add tooltip or info icon explaining the score meaning
- Support frequency analysis for multi-word phrases
- Enable filtering or sorting words by frequency in other UI components
- Periodically update frequency data as new subtitles are added 