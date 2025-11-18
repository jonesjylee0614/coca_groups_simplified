#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract clean words from all_words.txt
"""

def extract_words():
    words = []
    with open('all_words.txt', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if '→' in line:
                parts = line.split('→')
                if len(parts) >= 2 and parts[1].strip():
                    words.append(parts[1].strip())

    # Write to vocabulary file
    with open('vocabulary_5000.txt', 'w', encoding='utf-8') as f:
        for word in words:
            f.write(word + '\n')

    print(f"Extracted {len(words)} words to vocabulary_5000.txt")
    return words

if __name__ == '__main__':
    words = extract_words()
