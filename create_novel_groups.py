#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create 100 vocabulary groups for the novel
Each group contains 50 words
"""

import os
import json

# Chapter themes matching the novel structure
CHAPTER_THEMES = [
    # Part 1: Small Town Origins (Chapters 1-10)
    ("Chapter 1", "Family Daily Life", "家庭日常生活"),
    ("Chapter 2", "Small Town Community", "小镇社区"),
    ("Chapter 3", "Childhood Memories", "童年回忆"),
    ("Chapter 4", "School Education", "学校教育"),
    ("Chapter 5", "Friends and Neighbors", "朋友与邻居"),
    ("Chapter 6", "Family Dinner Conversations", "家庭餐桌对话"),
    ("Chapter 7", "Small Town Scenery", "小镇风景"),
    ("Chapter 8", "Departure Preparation", "离别准备"),
    ("Chapter 9", "Dreams and Fears", "梦想与恐惧"),
    ("Chapter 10", "The Day of Departure", "启程之日"),

    # Part 2: Arriving in the City (Chapters 11-20)
    ("Chapter 11", "Train Journey", "火车旅程"),
    ("Chapter 12", "First Impressions", "第一印象"),
    ("Chapter 13", "Finding a Place to Live", "寻找住处"),
    ("Chapter 14", "City Streets", "城市街道"),
    ("Chapter 15", "Job Interviews", "求职面试"),
    ("Chapter 16", "Coffee Shop Culture", "咖啡馆文化"),
    ("Chapter 17", "Subway Commute", "地铁通勤"),
    ("Chapter 18", "Kindness from Strangers", "陌生人的善意"),
    ("Chapter 19", "Homesick Moments", "想家时刻"),
    ("Chapter 20", "A New Beginning", "新的开始"),

    # Part 3: Starting Career (Chapters 21-30)
    ("Chapter 21", "The Newsroom", "新闻编辑部"),
    ("Chapter 22", "First Assignment", "第一个任务"),
    ("Chapter 23", "Office Politics", "办公室政治"),
    ("Chapter 24", "Lunch Break", "午餐时光"),
    ("Chapter 25", "Deadline Pressure", "截稿压力"),
    ("Chapter 26", "Interview Skills", "采访技巧"),
    ("Chapter 27", "Colleague Relationships", "同事关系"),
    ("Chapter 28", "Boss Expectations", "老板期望"),
    ("Chapter 29", "Workplace Mistakes", "职场失误"),
    ("Chapter 30", "Small Victory", "小小胜利"),

    # Part 4: Social Observations (Chapters 31-40)
    ("Chapter 31", "Political Rally", "政治集会"),
    ("Chapter 32", "Community Issues", "社区问题"),
    ("Chapter 33", "Economic Topics", "经济议题"),
    ("Chapter 34", "Law and Justice", "法律与正义"),
    ("Chapter 35", "Healthcare System", "医疗系统"),
    ("Chapter 36", "Education Reform", "教育改革"),
    ("Chapter 37", "Immigration Stories", "移民故事"),
    ("Chapter 38", "Racial Issues", "种族问题"),
    ("Chapter 39", "Gender Equality", "性别平等"),
    ("Chapter 40", "Democracy and Voting", "民主与投票"),

    # Part 5: Personal Growth (Chapters 41-50)
    ("Chapter 41", "First Date", "初次约会"),
    ("Chapter 42", "Deepening Friendship", "友谊深化"),
    ("Chapter 43", "Family Phone Calls", "家庭电话"),
    ("Chapter 44", "Self-Doubt", "自我怀疑"),
    ("Chapter 45", "Mental Health", "心理健康"),
    ("Chapter 46", "Healthy Living", "健康生活"),
    ("Chapter 47", "Financial Challenges", "财务挑战"),
    ("Chapter 48", "Budding Romance", "爱情萌芽"),
    ("Chapter 49", "Disappointment and Heartbreak", "失望与伤心"),
    ("Chapter 50", "Finding Strength Again", "重新振作"),

    # Part 6: Career Breakthrough (Chapters 51-60)
    ("Chapter 51", "Major News Lead", "重大新闻线索"),
    ("Chapter 52", "Investigative Reporting", "调查报道"),
    ("Chapter 53", "Dangerous Situations", "危险情境"),
    ("Chapter 54", "Ethical Dilemmas", "道德困境"),
    ("Chapter 55", "Truth and Lies", "真相与谎言"),
    ("Chapter 56", "Media Responsibility", "媒体责任"),
    ("Chapter 57", "Public Response", "公众反应"),
    ("Chapter 58", "Professional Recognition", "职业认可"),
    ("Chapter 59", "New Opportunities", "新的机遇"),
    ("Chapter 60", "Difficult Choices", "艰难选择"),

    # Part 7: Social Engagement (Chapters 61-70)
    ("Chapter 61", "Environmental Movement", "环保运动"),
    ("Chapter 62", "Climate Change", "气候变化"),
    ("Chapter 63", "Educational Equity", "教育公平"),
    ("Chapter 64", "Poverty Issues", "贫困问题"),
    ("Chapter 65", "Housing Crisis", "住房危机"),
    ("Chapter 66", "Healthcare Reform", "医疗改革"),
    ("Chapter 67", "Social Welfare", "社会福利"),
    ("Chapter 68", "Volunteer Service", "志愿服务"),
    ("Chapter 69", "Community Organization", "社区组织"),
    ("Chapter 70", "Civic Action", "公民行动"),

    # Part 8: Digital Age (Chapters 71-80)
    ("Chapter 71", "Digital Media", "数字媒体"),
    ("Chapter 72", "Social Networks", "社交网络"),
    ("Chapter 73", "Fake News Problem", "假新闻问题"),
    ("Chapter 74", "Tech Innovation", "科技创新"),
    ("Chapter 75", "Artificial Intelligence", "人工智能"),
    ("Chapter 76", "Privacy Protection", "隐私保护"),
    ("Chapter 77", "Internet Culture", "网络文化"),
    ("Chapter 78", "Startup Stories", "创业故事"),
    ("Chapter 79", "Tech Ethics", "技术伦理"),
    ("Chapter 80", "Media Transformation", "媒体转型"),

    # Part 9: Cultural Exploration (Chapters 81-90)
    ("Chapter 81", "Art Exhibition", "艺术展览"),
    ("Chapter 82", "Concert", "音乐会"),
    ("Chapter 83", "Theater Performance", "戏剧演出"),
    ("Chapter 84", "Literary Festival", "文学节"),
    ("Chapter 85", "Film Culture", "电影文化"),
    ("Chapter 86", "Food Exploration", "美食探索"),
    ("Chapter 87", "Multicultural Experience", "多元文化"),
    ("Chapter 88", "Historical Heritage", "历史遗产"),
    ("Chapter 89", "Religious Beliefs", "宗教信仰"),
    ("Chapter 90", "Philosophical Thinking", "哲学思考"),

    # Part 10: Coming Full Circle (Chapters 91-100)
    ("Chapter 91", "Career Achievement", "职业成就"),
    ("Chapter 92", "Journey Home", "回乡之旅"),
    ("Chapter 93", "Small Town Changes", "小镇变化"),
    ("Chapter 94", "Family Reunion", "家人团聚"),
    ("Chapter 95", "Old Friends Reconnect", "老友重逢"),
    ("Chapter 96", "Sharing and Mentoring", "传承与分享"),
    ("Chapter 97", "New Project", "新的项目"),
    ("Chapter 98", "Life Balance", "生活平衡"),
    ("Chapter 99", "Future Vision", "未来展望"),
    ("Chapter 100", "The Complete Circle", "完整的圆"),
]

def create_groups():
    """Create 100 vocabulary groups"""

    # Read all words
    with open('vocabulary_5000.txt', 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]

    print(f"Total words: {len(words)}")

    # Create output directory
    output_dir = 'novel_vocabulary_groups'
    os.makedirs(output_dir, exist_ok=True)

    # Divide into 100 groups (50 words each)
    groups = []
    words_per_group = 50

    for i in range(100):
        start_idx = i * words_per_group
        end_idx = start_idx + words_per_group
        group_words = words[start_idx:end_idx]

        chapter_num = i + 1
        chapter, theme_en, theme_cn = CHAPTER_THEMES[i]

        group_info = {
            'group_number': chapter_num,
            'chapter': chapter,
            'theme_english': theme_en,
            'theme_chinese': theme_cn,
            'word_count': len(group_words),
            'words': group_words
        }

        groups.append(group_info)

        # Create individual group file
        filename = f'{output_dir}/group_{chapter_num:03d}_{theme_en.replace(" ", "_").lower()}.md'
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"# Group {chapter_num}: {theme_en}\n\n")
            f.write(f"**Chinese**: {theme_cn}\n\n")
            f.write(f"**Chapter**: {chapter}\n\n")
            f.write(f"**Word Count**: {len(group_words)}\n\n")
            f.write("## Vocabulary List\n\n")
            for j, word in enumerate(group_words, 1):
                f.write(f"{j}. **{word}**\n")

        print(f"Created {filename}")

    # Create master index
    with open(f'{output_dir}/INDEX.md', 'w', encoding='utf-8') as f:
        f.write("# Novel Vocabulary Groups - Complete Index\n\n")
        f.write("## The Light Chaser: From Small Town to the World\n\n")
        f.write("Total: 100 Groups | 5000 Words\n\n")
        f.write("---\n\n")

        for group in groups:
            f.write(f"### {group['chapter']}: {group['theme_english']}\n")
            f.write(f"- **Chinese**: {group['theme_chinese']}\n")
            f.write(f"- **Words**: {group['word_count']}\n")
            f.write(f"- **File**: group_{group['group_number']:03d}_{group['theme_english'].replace(' ', '_').lower()}.md\n\n")

    # Save JSON metadata
    with open(f'{output_dir}/groups_metadata.json', 'w', encoding='utf-8') as f:
        json.dump(groups, f, ensure_ascii=False, indent=2)

    print(f"\nSuccessfully created {len(groups)} groups!")
    print(f"Files saved in: {output_dir}/")

    return groups

if __name__ == '__main__':
    groups = create_groups()
