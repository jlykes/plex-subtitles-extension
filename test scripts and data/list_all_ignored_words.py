#!/usr/bin/env python3
"""
Script to extract all ignored LingQ words (status -1) from the latest test_lingq_data_*.json
and write them to ignored_words_list.txt (one per line).
"""
import json
import glob
import sys

# Find the latest test_lingq_data_*.json file
files = sorted(glob.glob('test_lingq_data_*.json'), reverse=True)
if not files:
    print("No test_lingq_data_*.json file found.")
    sys.exit(1)

filename = files[0]
print(f"Loading data from: {filename}")

with open(filename, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract ignored words (status -1)
ignored_words = [entry['term'] for entry in data if entry.get('status') == -1]

print(f"Found {len(ignored_words)} ignored words.")

# Write to file
with open('ignored_words_list.txt', 'w', encoding='utf-8') as out:
    for word in ignored_words:
        out.write(word + '\n')

print("Wrote ignored words to ignored_words_list.txt") 