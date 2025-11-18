#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch verification tool for all completed chapters
Generates comprehensive coverage report
"""

import os
import json
import glob
from pathlib import Path
from verify_chapter_vocabulary import extract_words_from_text, load_group_words


def find_completed_chapters():
    """Find all completed chapter files"""
    chapter_files = sorted(glob.glob('novel_chapters/chapter_*.md'))
    return chapter_files


def extract_chapter_number(chapter_file):
    """Extract chapter number from filename"""
    # Extract number from filename like 'chapter_01.md'
    basename = os.path.basename(chapter_file)
    number_str = basename.replace('chapter_', '').replace('.md', '')
    return int(number_str)


def verify_all_chapters():
    """Verify all completed chapters and generate report"""

    chapter_files = find_completed_chapters()

    if not chapter_files:
        print("❌ No chapters found in novel_chapters/")
        return

    print(f"📚 Found {len(chapter_files)} chapter(s) to verify\n")
    print("=" * 80)

    results = []
    total_words_required = 0
    total_words_found = 0
    all_perfect = True

    for chapter_file in chapter_files:
        chapter_num = extract_chapter_number(chapter_file)

        print(f"\n📖 Verifying Chapter {chapter_num}...")

        # Load required vocabulary
        try:
            required_words = load_group_words(chapter_num)
        except Exception as e:
            print(f"   ⚠️  Could not load vocabulary group: {e}")
            continue

        # Read chapter text
        with open(chapter_file, 'r', encoding='utf-8') as f:
            chapter_text = f.read()

        # Extract words from chapter
        chapter_words = extract_words_from_text(chapter_text)

        # Check each required word
        missing_words = []
        found_words = []

        for word in required_words:
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
        word_count = len(chapter_text.split())

        # Store results
        result = {
            'chapter': chapter_num,
            'file': chapter_file,
            'required': len(required_words),
            'found': found_count,
            'missing': missing_count,
            'coverage': coverage_percent,
            'word_count': word_count,
            'missing_words': missing_words
        }
        results.append(result)

        # Update totals
        total_words_required += len(required_words)
        total_words_found += found_count

        # Print result
        if missing_count == 0:
            print(f"   ✅ Perfect! {found_count}/{len(required_words)} words (100%)")
            print(f"   📊 Chapter word count: {word_count}")
        else:
            all_perfect = False
            print(f"   ⚠️  {found_count}/{len(required_words)} words ({coverage_percent:.1f}%)")
            print(f"   ❌ Missing {missing_count} words: {', '.join(missing_words[:5])}")
            if missing_count > 5:
                print(f"      ... and {missing_count - 5} more")
            print(f"   📊 Chapter word count: {word_count}")

    # Generate summary report
    print("\n" + "=" * 80)
    print("\n📊 SUMMARY REPORT\n")
    print("=" * 80)

    overall_coverage = (total_words_found / total_words_required * 100) if total_words_required > 0 else 0

    print(f"\n📚 Chapters Verified: {len(results)}")
    print(f"📝 Total Words Required: {total_words_required}")
    print(f"✅ Total Words Found: {total_words_found}")
    print(f"❌ Total Words Missing: {total_words_required - total_words_found}")
    print(f"📊 Overall Coverage: {overall_coverage:.1f}%")

    # Calculate statistics
    perfect_chapters = sum(1 for r in results if r['coverage'] == 100)
    total_word_count = sum(r['word_count'] for r in results)
    avg_word_count = total_word_count / len(results) if results else 0

    print(f"\n✨ Perfect Chapters: {perfect_chapters}/{len(results)}")
    print(f"📖 Total Story Words: {total_word_count:,}")
    print(f"📏 Average Chapter Length: {avg_word_count:.0f} words")

    # Chapter-by-chapter breakdown
    print(f"\n📋 CHAPTER BREAKDOWN\n")
    print("-" * 80)
    print(f"{'Chapter':<10} {'Coverage':<12} {'Word Count':<12} {'Status':<10}")
    print("-" * 80)

    for result in results:
        status = "✅ Perfect" if result['coverage'] == 100 else f"⚠️  {result['missing']} missing"
        print(f"{result['chapter']:<10} {result['coverage']:>6.1f}%{'':<5} {result['word_count']:>8,}{'':<3} {status}")

    # Chapters with issues
    problematic = [r for r in results if r['coverage'] < 100]
    if problematic:
        print(f"\n⚠️  CHAPTERS NEEDING ATTENTION ({len(problematic)})\n")
        print("-" * 80)

        for result in problematic:
            print(f"\nChapter {result['chapter']}: {result['coverage']:.1f}% coverage")
            print(f"Missing words ({result['missing']}): {', '.join(result['missing_words'])}")

    # Save detailed report to JSON
    with open('verification_report.json', 'w', encoding='utf-8') as f:
        json.dump({
            'summary': {
                'total_chapters': len(results),
                'perfect_chapters': perfect_chapters,
                'total_words_required': total_words_required,
                'total_words_found': total_words_found,
                'overall_coverage': overall_coverage,
                'total_story_words': total_word_count,
                'avg_chapter_length': avg_word_count
            },
            'chapters': results
        }, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Detailed report saved to: verification_report.json")

    # Final status
    print("\n" + "=" * 80)
    if all_perfect:
        print("\n🎉 EXCELLENT! All chapters have 100% vocabulary coverage!")
    else:
        print(f"\n⚠️  {len(results) - perfect_chapters} chapter(s) need additional work.")

    print("\n" + "=" * 80)

    return results


def generate_markdown_report(results):
    """Generate a markdown format report"""

    if not results:
        return

    report_lines = [
        "# Batch Verification Report\n",
        f"**Generated**: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        "\n---\n",
        "\n## Summary\n",
    ]

    total_chapters = len(results)
    perfect_chapters = sum(1 for r in results if r['coverage'] == 100)
    total_words_required = sum(r['required'] for r in results)
    total_words_found = sum(r['found'] for r in results)
    overall_coverage = (total_words_found / total_words_required * 100) if total_words_required > 0 else 0
    total_word_count = sum(r['word_count'] for r in results)

    report_lines.extend([
        f"- **Total Chapters**: {total_chapters}\n",
        f"- **Perfect Chapters**: {perfect_chapters} ({perfect_chapters/total_chapters*100:.1f}%)\n",
        f"- **Overall Coverage**: {overall_coverage:.1f}%\n",
        f"- **Total Story Words**: {total_word_count:,}\n",
        f"- **Average Chapter Length**: {total_word_count/total_chapters:.0f} words\n",
        "\n---\n",
        "\n## Chapter Details\n\n",
        "| Chapter | Coverage | Word Count | Status |\n",
        "|---------|----------|------------|--------|\n",
    ])

    for result in results:
        status = "✅ Perfect" if result['coverage'] == 100 else f"⚠️ {result['missing']} missing"
        report_lines.append(
            f"| {result['chapter']} | {result['coverage']:.1f}% | {result['word_count']:,} | {status} |\n"
        )

    # Add problematic chapters section
    problematic = [r for r in results if r['coverage'] < 100]
    if problematic:
        report_lines.extend([
            "\n---\n",
            "\n## Chapters Needing Attention\n\n",
        ])

        for result in problematic:
            report_lines.extend([
                f"### Chapter {result['chapter']} ({result['coverage']:.1f}% coverage)\n\n",
                f"**Missing {result['missing']} words**: {', '.join(result['missing_words'])}\n\n",
            ])

    # Write to file
    with open('verification_report.md', 'w', encoding='utf-8') as f:
        f.writelines(report_lines)

    print(f"📄 Markdown report saved to: verification_report.md")


def main():
    """Main function"""
    print("\n" + "=" * 80)
    print(" " * 20 + "BATCH VOCABULARY VERIFICATION")
    print("=" * 80 + "\n")

    results = verify_all_chapters()

    if results:
        print("\n📄 Generating markdown report...")
        generate_markdown_report(results)

    print("\n✅ Batch verification complete!\n")


if __name__ == '__main__':
    main()
