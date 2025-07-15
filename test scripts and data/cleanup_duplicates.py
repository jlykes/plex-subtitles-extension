#!/usr/bin/env python3
"""
Script to find and clean up duplicate LingQ entries for the same word (by characters).
For any word with multiple entries, sets all non-ignored entries to Ignored (status -1).
"""
import json
import glob
import sys
from collections import defaultdict
from lingq_patch import update_word_status_by_characters, get_lingq_cookies

def main():
    # Find the latest test_lingq_data_*.json file
    files = sorted(glob.glob('test_lingq_data_*.json'), reverse=True)
    if not files:
        print("No test_lingq_data_*.json file found.")
        sys.exit(1)
    filename = files[0]
    print(f"Loading data from: {filename}")
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Build mapping: term -> list of entries
    term_map = defaultdict(list)
    for entry in data:
        term_map[entry['term']].append(entry)

    # Get cookies and headers
    cookies = get_lingq_cookies()
    if not cookies:
        print("Failed to get LingQ cookies.")
        sys.exit(1)
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRFToken": cookies['csrftoken'],
        "User-Agent": "Mozilla/5.0"
    }

    total_duplicates = 0
    total_cleaned = 0
    for term, entries in term_map.items():
        if len(entries) > 1:
            print(f"\nDuplicate found for '{term}':")
            total_duplicates += 1
            for e in entries:
                eid = e.get('id') or e.get('pk')
                print(f"  ID: {eid}, status: {e['status']}, ext: {e.get('extended_status')}")
            # If any are ignored, set all others to ignored
            for e in entries:
                if e['status'] != -1:
                    print(f"  -> Setting '{term}' to Ignored (was status {e['status']}, ext {e.get('extended_status')})")
                    result = update_word_status_by_characters(term, -1, None, cookies, headers)
                    if result.get("success"):
                        print(f"     ✅ Set to Ignored")
                        total_cleaned += 1
                    else:
                        print(f"     ❌ Failed to set to Ignored: {result.get('error')}")
    print(f"\nSummary: {total_duplicates} words had duplicates. {total_cleaned} entries were set to Ignored.")
    print("Done.")

if __name__ == "__main__":
    main() 