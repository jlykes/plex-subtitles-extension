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
from typing import Dict, List, Tuple


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
    """Check if a word contains Chinese characters and is not purely numeric."""
    # Match Chinese characters (Unicode ranges for Chinese)
    chinese_regex = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f]')
    
    # Must contain at least one Chinese character AND not be purely numeric
    has_chinese = bool(chinese_regex.search(word))
    is_numeric = word.isdigit()
    
    return has_chinese and not is_numeric

"""
/**
 * Builds a word frequency dictionary from enriched subtitle files.
 *
 * @function build_word_frequency_corpus
 * @returns {Dict[str, int]} Dictionary mapping words to their frequency counts.
 *
 */
"""
def build_word_frequency_corpus() -> Dict[str, int]:
    """Parse all enriched subtitle files and build word frequency dictionary."""
    enriched_dir = Path(__file__).parent / "enriched_subtitles"
    frequency_dict = {}
    
    try:
        files = list(enriched_dir.glob("*.enriched.json"))
        print(f"Processing {len(files)} enriched subtitle files...")
        
        for i, file_path in enumerate(files):
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
            
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(files)} files...")
        
        print(f"Completed! Found {len(frequency_dict)} unique Chinese words.")
        return frequency_dict
        
    except Exception as error:
        print(f"Error building word frequency corpus: {error}")
        return {}

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
def print_statistics(frequency_dict: Dict[str, int], score_dict: Dict[str, int]):
    """Print corpus statistics and sample data."""
    total_words = sum(frequency_dict.values())
    unique_words = len(frequency_dict)
    
    print("\n=== CORPUS STATISTICS ===")
    print(f"Total word occurrences: {total_words:,}")
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
    frequency_dict = build_word_frequency_corpus()
    
    if not frequency_dict:
        print("No frequency data generated. Exiting.")
        return
    
    print("Mapping frequencies to scores...")
    score_dict = map_frequency_to_scores(frequency_dict)
    
    print("Saving data to cache...")
    save_frequency_data(frequency_dict, score_dict)
    
    print_statistics(frequency_dict, score_dict)

if __name__ == "__main__":
    main() 