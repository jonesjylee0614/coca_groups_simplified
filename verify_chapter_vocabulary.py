#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verify that a chapter contains all required vocabulary words
"""

import json
import re
import sys
from pathlib import Path


def load_group_words(group_number):
    """Load vocabulary words for a specific group"""
    metadata_file = 'novel_vocabulary_groups/groups_metadata.json'

    with open(metadata_file, 'r', encoding='utf-8') as f:
        groups = json.load(f)

    if 1 <= group_number <= 100:
        return groups[group_number - 1]['words']
    else:
        raise ValueError(f"Group number must be between 1 and 100, got {group_number}")


def extract_words_from_text(text):
    """Extract all words from text (case-insensitive)"""
    # Convert to lowercase for matching
    text_lower = text.lower()

    # Extract words (alphanumeric + apostrophes for contractions)
    words = re.findall(r"[a-z]+(?:'[a-z]+)?", text_lower)

    return set(words)


def verify_chapter(chapter_file, group_number):
    """Verify that a chapter contains all required vocabulary"""

    # Load required vocabulary
    required_words = load_group_words(group_number)
    print(f"Checking Chapter {group_number}...")
    print(f"Required vocabulary: {len(required_words)} words\n")

    # Read chapter text
    with open(chapter_file, 'r', encoding='utf-8') as f:
        chapter_text = f.read()

    # Extract words from chapter
    chapter_words = extract_words_from_text(chapter_text)

    # Check each required word
    missing_words = []
    found_words = []

    for word in required_words:
        # Handle special cases like "n't" which should match "don't", "can't", etc.
        word_lower = word.lower()

        if word_lower == "n't":
            # Check if any contraction with n't exists
            if any("n't" in w for w in chapter_words):
                found_words.append(word)
            else:
                missing_words.append(word)
        else:
            if word_lower in chapter_words:
                found_words.append(word)
            else:
                missing_words.append(word)

    # Calculate statistics
    found_count = len(found_words)
    missing_count = len(missing_words)
    coverage_percent = (found_count / len(required_words)) * 100

    # Print results
    print(f"✓ Found: {found_count}/{len(required_words)} words ({coverage_percent:.1f}%)")

    if missing_words:
        print(f"\n✗ Missing {missing_count} words:")
        for i, word in enumerate(sorted(missing_words), 1):
            print(f"  {i}. {word}")
    else:
        print("\n🎉 Perfect! All vocabulary words are included!")

    print(f"\nChapter word count: ~{len(chapter_text.split())} words")

    return missing_count == 0, missing_words


def main():
    if len(sys.argv) != 3:
        print("Usage: python verify_chapter_vocabulary.py <chapter_file> <group_number>")
        print("Example: python verify_chapter_vocabulary.py novel/chapter_01.md 1")
        sys.exit(1)

    chapter_file = sys.argv[1]
    group_number = int(sys.argv[2])

    if not Path(chapter_file).exists():
        print(f"Error: Chapter file '{chapter_file}' not found")
        sys.exit(1)

    success, missing = verify_chapter(chapter_file, group_number)

    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
