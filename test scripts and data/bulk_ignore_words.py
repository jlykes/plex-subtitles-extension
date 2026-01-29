#!/usr/bin/env python3
"""
Script to set a list of LingQ words to Ignored (status -1).
Reads words from ignore_words.txt (one per line).
"""
import sys
import time
import random
from lingq_patch import update_word_status_by_characters, get_lingq_cookies, search_lingq_cards

def main():
    # Read words from file
    try:
        with open('ignore_words.txt', 'r', encoding='utf-8') as f:
            words = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print("ignore_words.txt not found. Please create this file with one word per line.")
        sys.exit(1)

    print(f"Found {len(words)} words to ignore.")

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

    failed_words = []
    success_count = 0

    # Update each word
    for i, word in enumerate(words, 1):
        print(f"[{i}/{len(words)}] Ignoring: {word}")
        for attempt in range(3):
            result = update_word_status_by_characters(word, -1, None, cookies, headers)
            if result.get("success"):
                print(f"   ✅ Ignored: {word}")
                success_count += 1
                break
            else:
                print(f"   ❌ Failed: {word} - {result.get('error')}")
                if "too many requests" in str(result.get('error')).lower():
                    print("   ⏳ Waiting 10 seconds before retrying...")
                    time.sleep(10)
                else:
                    break
        else:
            failed_words.append(word)
        # Verify status after update (explicitly search for status -1)
        search_result = search_lingq_cards(word, cookies, headers, page_size=5, statuses=[-1])
        if search_result["success"] and search_result["count"] > 0:
            print(f"   🔎 Found {search_result['count']} IGNORED entries for '{word}':")
            for entry in search_result["results"]:
                print(f"      ID: {entry.get('pk')}, status: {entry.get('status')}, extended_status: {entry.get('extended_status')}")
            if search_result["count"] > 1:
                print(f"   ⚠️  WARNING: Multiple ignored entries found for '{word}'! Possible duplicate IDs.")
        else:
            print(f"   🔎 Could not confirm ignored status (not found in API search with status=-1)")
        # Add a 2-second delay with a small random jitter between requests
        time.sleep(2 + random.uniform(0, 1))

    print(f"\nSummary: {success_count} succeeded, {len(failed_words)} failed.")
    if failed_words:
        print("Failed to ignore the following words:")
        for w in failed_words:
            print(w)
    else:
        print("All words were successfully ignored!")

if __name__ == "__main__":
    main() 