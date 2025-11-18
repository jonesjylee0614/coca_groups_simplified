#!/usr/bin/env python3
"""
Batch Vocabulary Verification Tool
Verifies vocabulary coverage for multiple chapters at once
"""

import os
import sys
import re
from pathlib import Path

def load_vocabulary(group_number):
    """Load vocabulary from the group file"""
    group_file = f"novel_vocabulary_groups/group_{group_number:03d}_*.md"
    import glob
    files = glob.glob(group_file)

    if not files:
        return []

    vocab = []
    with open(files[0], 'r', encoding='utf-8') as f:
        in_list = False
        for line in f:
            if line.strip() == "## Vocabulary List":
                in_list = True
                continue
            if in_list and line.strip() and line.strip()[0].isdigit():
                # Extract word between ** markers
                match = re.search(r'\*\*(.+?)\*\*', line)
                if match:
                    vocab.append(match.group(1).lower())

    return list(set(vocab))  # Remove duplicates

def check_chapter(chapter_file, chapter_num):
    """Check vocabulary coverage for a single chapter"""
    if not os.path.exists(chapter_file):
        return None

    # Load required vocabulary
    vocab = load_vocabulary(chapter_num)

    if not vocab:
        return None

    # Read chapter content
    with open(chapter_file, 'r', encoding='utf-8') as f:
        content = f.read().lower()

    # Find which words are present
    found = []
    missing = []

    for word in vocab:
        if f"**{word}**" in content.lower():
            found.append(word)
        else:
            missing.append(word)

    # Count words
    word_count = len(content.split())

    return {
        'chapter': chapter_num,
        'total': len(vocab),
        'found': len(found),
        'missing': len(missing),
        'missing_words': missing,
        'percentage': (len(found) / len(vocab) * 100) if vocab else 0,
        'word_count': word_count,
        'exists': True
    }

def generate_report(start_chapter=1, end_chapter=100):
    """Generate batch verification report"""
    print("=" * 80)
    print("BATCH VOCABULARY VERIFICATION REPORT")
    print("=" * 80)
    print()

    results = []
    complete_count = 0
    incomplete_count = 0
    missing_count = 0

    for i in range(start_chapter, end_chapter + 1):
        chapter_file = f"novel_chapters/chapter_{i:02d}.md"
        result = check_chapter(chapter_file, i)

        if result is None:
            missing_count += 1
            print(f"Chapter {i:2d}: NOT CREATED YET")
            results.append({'chapter': i, 'exists': False})
        else:
            results.append(result)
            if result['percentage'] == 100:
                status = "✅ COMPLETE"
                complete_count += 1
            else:
                status = f"🟡 {result['percentage']:.1f}%"
                incomplete_count += 1

            print(f"Chapter {i:2d}: {status} ({result['found']}/{result['total']} words, ~{result['word_count']} words)")

            if result['missing'] > 0 and result['missing'] <= 10:
                print(f"            Missing: {', '.join(result['missing_words'][:10])}")

    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Chapters:      {end_chapter - start_chapter + 1}")
    print(f"Completed (100%):    {complete_count}")
    print(f"Incomplete:          {incomplete_count}")
    print(f"Not Created:         {missing_count}")
    print(f"Overall Progress:    {((complete_count / (end_chapter - start_chapter + 1)) * 100):.1f}%")
    print("=" * 80)

    return results

def main():
    """Main function"""
    if len(sys.argv) > 2:
        start = int(sys.argv[1])
        end = int(sys.argv[2])
    elif len(sys.argv) > 1:
        start = 1
        end = int(sys.argv[1])
    else:
        start = 1
        end = 100

    results = generate_report(start, end)

    # Generate detailed report file
    with open('batch_verification_report.txt', 'w', encoding='utf-8') as f:
        f.write("Batch Vocabulary Verification Report\n")
        f.write("=" * 80 + "\n\n")

        for result in results:
            if result.get('exists'):
                f.write(f"Chapter {result['chapter']:02d}: {result['percentage']:.1f}% ")
                f.write(f"({result['found']}/{result['total']} words)\n")
                if result['missing'] > 0:
                    f.write(f"  Missing words: {', '.join(result['missing_words'])}\n")
                f.write("\n")

    print("\nDetailed report saved to: batch_verification_report.txt")

if __name__ == "__main__":
    main()
