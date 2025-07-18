#!/usr/bin/env python3
"""
Script to print a simple list of all 'Known' LingQ words (status 3, extended_status 3), one per line.
Reads from the latest test_lingq_data_*.json file in the current directory.
"""

import json
import glob
import os

# Find the latest test_lingq_data_*.json file
files = sorted(glob.glob('test_lingq_data_*.json'), reverse=True)
if not files:
    print("No test_lingq_data_*.json file found.")
    exit(1)

filename = files[0]
print(f"Loading data from: {filename}")

with open(filename, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract known words (status 3, extended_status 3)
known_words = [entry['term'] for entry in data if entry.get('status') == 3 and entry.get('extended_status') == 3]

print(f"Found {len(known_words)} known words.")

# Print each known word, one per line
for word in known_words:
    print(word) 