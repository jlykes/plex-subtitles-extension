#!/usr/bin/env python3
"""
word_frequency.py

This module analyzes enriched Chinese subtitle files to build a word frequency dictionary.
It provides utilities for extracting, counting, and categorizing Chinese word occurrences
across a subtitle corpus, supporting downstream features such as frequency-based word highlighting
and learning progress tracking.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
try:
    import jieba
except ImportError:
    print("jieba library not found. Please install it with 'pip install jieba'.")
    exit(1)

"""
/**
 * Checks if a word contains Chinese characters and is not purely numeric.
 *
 * @function is_chinese_word
 * @param {str} word - The word to check.
 * @returns {bool} True if the word contains at least one Chinese character and is not purely numeric, False otherwise.
 *
 */
"""
def is_chinese_word(word: str) -> bool:
    """Check if a word consists entirely of Chinese characters (no non-Chinese characters allowed)."""
    # Match Chinese characters (Unicode ranges for Chinese)
    chinese_regex = re.compile(r'^[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]+$')
    # The word must be non-empty and all characters must be Chinese
    return bool(word) and bool(chinese_regex.fullmatch(word))

def scan_corpus_files() -> List[Tuple[str, str]]:
    """
    Scan enriched_subtitles/, other_corpus_text/, enriched_books/, and enriched_texts/ directories recursively.
    Returns a list of tuples: (file_path, file_type), where file_type is 'enriched_json', 'plain_text', 'enriched_book_json', or 'enriched_text_json'.
    """
    base_dir = Path(__file__).parent
    enriched_dir = base_dir / "enriched_subtitles"
    text_dir = base_dir / "other_corpus_text"
    books_dir = base_dir / "enriched_books"
    texts_dir = base_dir / "enriched_texts"
    files = []

    # Collect enriched JSON files recursively (including subdirectories)
    if enriched_dir.exists():
        for file_path in enriched_dir.rglob("*.enriched.json"):
            files.append((str(file_path), "enriched_json"))

    # Collect plain text files recursively (including subdirectories)
    if text_dir.exists():
        for file_path in text_dir.rglob("*.txt"):
            files.append((str(file_path), "plain_text"))

    # Collect enriched book JSON files recursively (including subdirectories)
    if books_dir.exists():
        for file_path in books_dir.rglob("*.json"):
            files.append((str(file_path), "enriched_book_json"))

    # Collect enriched text JSON files recursively (including subdirectories)
    if texts_dir.exists():
        for file_path in texts_dir.rglob("*.json"):
            files.append((str(file_path), "enriched_text_json"))

    print(f"Found {len(files)} files: {len([f for f in files if f[1]=='enriched_json'])} enriched JSON, {len([f for f in files if f[1]=='plain_text'])} plain text, {len([f for f in files if f[1]=='enriched_book_json'])} enriched books, {len([f for f in files if f[1]=='enriched_text_json'])} enriched texts.")
    return files

"""
/**
 * Builds a word frequency dictionary from enriched subtitle files.
 *
 * @function build_word_frequency_corpus
 * @returns {Dict[str, int]} Dictionary mapping words to their frequency counts.
 *
 */
"""


def build_word_frequency_corpus() -> Tuple[Dict[str, int], int, int, int, int]:
    """
    Parse all corpus files and build word frequency dictionary.
    Returns:
        frequency_dict: Dictionary mapping words to their frequency counts.
        enriched_word_count: Total word occurrences from enriched JSON files.
        plain_text_word_count: Total word occurrences from plain text files.
        book_word_count: Total word occurrences from enriched book JSON files.
        text_word_count: Total word occurrences from enriched text JSON files.
    """
    frequency_dict = {}
    enriched_word_count = 0
    plain_text_word_count = 0
    book_word_count = 0
    text_word_count = 0
    try:
        files = scan_corpus_files()
        print(f"Processing {len(files)} corpus files...")
        for i, (file_path, file_type) in enumerate(files):
            if file_type == 'enriched_json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Extract words from segmented data
                if isinstance(data, list):
                    for subtitle in data:
                        if subtitle.get('segmented') and isinstance(subtitle['segmented'], list):
                            for segment in subtitle['segmented']:
                                if segment.get('word') and is_chinese_word(segment['word']):
                                    word = segment['word']
                                    frequency_dict[word] = frequency_dict.get(word, 0) + 1
                                    enriched_word_count += 1
            elif file_type == 'plain_text':
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                # Use jieba to segment the text
                for word in jieba.cut(text):
                    word = word.strip()
                    if is_chinese_word(word):
                        frequency_dict[word] = frequency_dict.get(word, 0) + 1
                        plain_text_word_count += 1
            elif file_type == 'enriched_book_json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Extract words from book content structure: content -> paragraphs -> sentences -> words -> hanzi
                if isinstance(data, dict) and 'content' in data:
                    for item in data['content']:
                        if item.get('type') == 'paragraph' and 'sentences' in item:
                            for sentence in item['sentences']:
                                if 'words' in sentence:
                                    for word_data in sentence['words']:
                                        if word_data.get('hanzi') and is_chinese_word(word_data['hanzi']):
                                            word = word_data['hanzi']
                                            frequency_dict[word] = frequency_dict.get(word, 0) + 1
                                            book_word_count += 1
            elif file_type == 'enriched_text_json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                # Extract words from enriched text content structure: content -> paragraphs -> sentences -> words -> hanzi
                if isinstance(data, dict) and 'content' in data:
                    for item in data['content']:
                        if item.get('type') == 'paragraph' and 'sentences' in item:
                            for sentence in item['sentences']:
                                if 'words' in sentence:
                                    for word_data in sentence['words']:
                                        if word_data.get('hanzi') and is_chinese_word(word_data['hanzi']):
                                            word = word_data['hanzi']
                                            frequency_dict[word] = frequency_dict.get(word, 0) + 1
                                            text_word_count += 1
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(files)} files...")
        print(f"Completed! Found {len(frequency_dict)} unique Chinese words.")
        # Return both the frequency dict and the counts for reporting
        return frequency_dict, enriched_word_count, plain_text_word_count, book_word_count, text_word_count
    except Exception as error:
        print(f"Error building word frequency corpus: {error}")
        return {}, 0, 0, 0, 0

"""
/**
 * Maps word frequencies to scores 1-5 based on cumulative frequency.
 *
 * @function map_frequency_to_scores
 * @param {Dict[str, int]} frequency_dict - Dictionary mapping words to their frequency counts.
 * @returns {Dict[str, int]} Dictionary mapping words to their frequency scores.
 *
 */
"""
def map_frequency_to_scores(frequency_dict: Dict[str, int]) -> Dict[str, int]:
    """Map frequency counts to scores 1-5 based on cumulative frequency."""
    # Sort words by frequency descending
    sorted_words = sorted(frequency_dict.items(), key=lambda x: x[1], reverse=True)
    
    total_frequency = sum(count for _, count in sorted_words)
    
    # Cumulative frequency breakpoints
    breakpoints = {
        5: 0.60,  # Top 60% of total word volume (most frequent)
        4: 0.80,  # Next 20%
        3: 0.90,  # Next 10%
        2: 0.97,  # Next 7%
        1: 1.00   # Last 3%
    }
    
    cumulative = 0
    score_dict = {}
    
    for word, count in sorted_words:
        cumulative += count
        ratio = cumulative / total_frequency
        
        if ratio <= breakpoints[5]:
            score_dict[word] = 5
        elif ratio <= breakpoints[4]:
            score_dict[word] = 4
        elif ratio <= breakpoints[3]:
            score_dict[word] = 3
        elif ratio <= breakpoints[2]:
            score_dict[word] = 2
        else:
            score_dict[word] = 1
    
    return score_dict

"""
/**
 * Saves frequency and score data to cache files.
 *
 * @function save_frequency_data
 * @param {Dict[str, int]} frequency_dict - Dictionary mapping words to their frequency counts.
 * @param {Dict[str, int]} score_dict - Dictionary mapping words to their frequency scores.
 *
 */
"""
def save_frequency_data(frequency_dict: Dict[str, int], score_dict: Dict[str, int]):
    """Save frequency and score data to cache files."""
    cache_dir = Path(__file__).parent / "cache"
    cache_dir.mkdir(exist_ok=True)
    
    frequency_path = cache_dir / "word_frequency.json"
    score_path = cache_dir / "word_scores.json"
    
    with open(frequency_path, 'w', encoding='utf-8') as f:
        json.dump(frequency_dict, f, ensure_ascii=False, indent=2)
    
    with open(score_path, 'w', encoding='utf-8') as f:
        json.dump(score_dict, f, ensure_ascii=False, indent=2)
    
    print(f"Frequency data saved to: {frequency_path}")
    print(f"Score data saved to: {score_path}")

"""
/**
 * Prints corpus statistics and sample data, including the top 5 words by score.
 *
 * @function print_statistics
 * @param {Dict[str, int]} frequency_dict - Dictionary mapping words to their frequency counts.
 * @param {Dict[str, int]} score_dict - Dictionary mapping words to their frequency scores.
 *
 */
"""
def print_statistics(frequency_dict: Dict[str, int], score_dict: Dict[str, int], enriched_word_count: Optional[int] = None, plain_text_word_count: Optional[int] = None, book_word_count: Optional[int] = None, text_word_count: Optional[int] = None):
    """
    Print corpus statistics and sample data.
    Optionally includes counts for enriched, plain text, book, and enriched text word occurrences.
    """
    total_words = sum(frequency_dict.values())
    unique_words = len(frequency_dict)
    
    print("\n=== CORPUS STATISTICS ===")
    print(f"Total word occurrences: {total_words:,}")
    if enriched_word_count is not None and plain_text_word_count is not None and book_word_count is not None and text_word_count is not None:
        print(f"  - From enriched JSON:   {enriched_word_count:,}")
        print(f"  - From plain text:      {plain_text_word_count:,}")
        print(f"  - From enriched books:  {book_word_count:,}")
        print(f"  - From enriched texts:  {text_word_count:,}")
    print(f"Unique Chinese words: {unique_words:,}")

    
    # Print top 5 words from each score bucket
    print("\n=== TOP 5 WORDS BY SCORE ===")
    for score in range(5, 0, -1):
        words_in_score = [(word, count) for word, count in frequency_dict.items() 
                         if score_dict[word] == score]
        words_in_score.sort(key=lambda x: x[1], reverse=True)
        
        print(f"\nScore {score} (top 5):")
        for word, count in words_in_score[:5]:
            print(f"  {word}: {count:,} occurrences")
    
    print("\n=== FREQUENCY DISTRIBUTION ===")
    score_counts = {}
    for score in score_dict.values():
        score_counts[score] = score_counts.get(score, 0) + 1
    
    for score in sorted(score_counts.keys(), reverse=True):
        print(f"Score {score}: {score_counts[score]:,} words")

"""
/**
 * Main function to build and save word frequency data.
 *
 * @function main
 *
 */
"""
def main():
    """Main function to build and save word frequency data."""
    print("Building word frequency corpus...")
    frequency_dict, enriched_word_count, plain_text_word_count, book_word_count, text_word_count = build_word_frequency_corpus()
    
    if not frequency_dict:
        print("No frequency data generated.")
        return
    
    print("Mapping frequencies to scores...")
    score_dict = map_frequency_to_scores(frequency_dict)
    
    print("Saving data to cache...")
    save_frequency_data(frequency_dict, score_dict)
    
    print_statistics(frequency_dict, score_dict, enriched_word_count, plain_text_word_count, book_word_count, text_word_count)

if __name__ == "__main__":
    main() 