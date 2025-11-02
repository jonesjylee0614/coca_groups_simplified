#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复 reading_materials 目录下所有 group*_reading.md 文件的加粗格式
- 阅读材料部分：只保留词汇表的单词加粗
- 其他部分：取消所有加粗
"""

import re
import os
import sys
from pathlib import Path

# 设置输出编码
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_vocabulary_words(content):
    """从词汇注释部分提取应该加粗的单词列表"""
    vocab_words = set()
    
    # 查找词汇注释部分（支持多种标题格式）
    vocab_section_match = re.search(
        r'## (?:📝 重点词汇注释|Key Vocabulary Annotations).*?(?=## 🎯|## 🧠|## 📚|## [A-Z]|$)',
        content,
        re.DOTALL | re.IGNORECASE
    )
    
    if vocab_section_match:
        vocab_section = vocab_section_match.group(0)
        
        # 提取所有加粗的单词（支持多种格式）
        # 格式1: 1. **word** /pronunciation/
        pattern1 = r'\d+\.\s*\*\*([a-zA-Z]+)\*\*\s*/'
        matches1 = re.findall(pattern1, vocab_section)
        vocab_words.update([w.lower() for w in matches1])
        
        # 格式2: **数字. word** /pronunciation/
        pattern2 = r'\*\*\d+\.\s*([a-zA-Z]+)\*\*\s*/'
        matches2 = re.findall(pattern2, vocab_section)
        vocab_words.update([w.lower() for w in matches2])
        
        # 格式3: **word** /pronunciation/（没有数字）
        pattern3 = r'\*\*([a-zA-Z]+)\*\*\s*/[^/\n]*'
        matches3 = re.findall(pattern3, vocab_section)
        vocab_words.update([w.lower() for w in matches3])
        
        # 如果上面的匹配没有找到足够的单词，尝试匹配所有 **word** 格式（在词汇注释部分）
        if len(vocab_words) < 10:  # 如果提取的单词太少，使用备用方法
            # 匹配所有 **word** 格式，但排除一些常见的非词汇单词
            all_bold_pattern = r'\*\*([a-zA-Z]{3,})\*\*'
            all_matches = re.findall(all_bold_pattern, vocab_section)
            # 过滤掉一些常见的非词汇单词
            exclude_words = {'用法', '记忆', '技巧', '例句', '词性', '核心', '重要', '其他', 'try', 'free'}
            vocab_words.update([w.lower() for w in all_matches if w.lower() not in exclude_words])
    
    return vocab_words

def remove_bold_outside_vocab(text, vocab_words):
    """移除文本中不在词汇表中的单词的加粗，保留词汇表单词的加粗"""
    def replace_bold(match):
        word = match.group(1)
        word_lower = word.lower()
        # 如果单词在词汇表中，保留加粗
        if word_lower in vocab_words:
            return match.group(0)  # 保留原样 **word**
        else:
            return word  # 移除加粗
    
    # 替换 **word** 格式（只匹配单词，不包括标点）
    pattern = r'\*\*([a-zA-Z]+)\*\*'
    text = re.sub(pattern, replace_bold, text)
    
    return text

def remove_all_bold(text):
    """移除文本中所有加粗"""
    # 替换 **word** 为 word
    text = re.sub(r'\*\*(\w+)\*\*', r'\1', text)
    # 替换 **短语** 为 短语（处理中文或短语）
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    return text

def process_file(file_path):
    """处理单个文件"""
    print(f"处理文件: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取词汇表中的单词
    vocab_words = extract_vocabulary_words(content)
    print(f"  找到 {len(vocab_words)} 个词汇表单词")
    
    # 找到阅读材料部分（从"## 📖 Reading Passage"开始，到下一个"##"或"---"结束）
    reading_section_pattern = r'(## 📖 Reading Passage:.*?)(?=---|\n##)'
    reading_match = re.search(reading_section_pattern, content, re.DOTALL)
    
    if reading_match:
        reading_section = reading_match.group(1)
        
        # 处理阅读材料部分：只保留词汇表单词的加粗
        processed_reading = remove_bold_outside_vocab(reading_section, vocab_words)
        
        # 替换原内容
        content = content[:reading_match.start()] + processed_reading + content[reading_match.end():]
        
        # 重新匹配以更新位置
        reading_match = re.search(reading_section_pattern, content, re.DOTALL)
    
    # 处理其他部分：取消所有加粗
    # 找到文章概要部分（从"## 📋 文章概要"开始，到下一个"##"或"---"结束）
    summary_pattern = r'(## 📋 文章概要.*?)(?=---|\n##)'
    summary_match = re.search(summary_pattern, content, re.DOTALL)
    if summary_match:
        summary_section = summary_match.group(1)
        processed_summary = remove_all_bold(summary_section)
        content = content[:summary_match.start()] + processed_summary + content[summary_match.end():]
    
    # 处理中文翻译部分（从"## 📖 中文翻译"开始，到下一个"##"或"---"结束）
    translation_pattern = r'(## 📖 中文翻译.*?)(?=---|\n##)'
    translation_match = re.search(translation_pattern, content, re.DOTALL)
    if translation_match:
        translation_section = translation_match.group(1)
        processed_translation = remove_all_bold(translation_section)
        content = content[:translation_match.start()] + processed_translation + content[translation_match.end():]
    
    # 处理其他部分：除了词汇注释部分，其他都取消加粗
    # 但我们保留词汇注释部分的加粗（因为那是词汇表）
    
    # 保存文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  完成")

def main():
    """主函数"""
    reading_materials_dir = Path('reading_materials')
    
    # 获取所有 group*_reading.md 文件
    files = sorted(reading_materials_dir.glob('group*_reading.md'))
    
    print(f"找到 {len(files)} 个文件需要处理\n")
    
    for file_path in files:
        try:
            process_file(file_path)
        except Exception as e:
            print(f"  处理失败: {e}")
    
    print(f"\n所有文件处理完成！")

if __name__ == '__main__':
    main()
