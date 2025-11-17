#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 seed_files 目录中提取所有单词列表，合并到一个文件中
每个单词一行，去除 ** 标记
"""

import sys
import re
from pathlib import Path
from typing import List

# 设置控制台输出编码为 UTF-8（解决 Windows 控制台编码问题）
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


def extract_words_from_file(file_path: Path) -> List[str]:
    """
    从单个 markdown 文件中提取单词列表
    
    Args:
        file_path: markdown 文件路径
        
    Returns:
        单词列表
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 查找 ## Word List 之后的内容（使用更精确的正则表达式）
        word_list_pattern = r'## Word List\s*\n(.+?)(?=\n##|\Z)'
        match = re.search(word_list_pattern, content, re.DOTALL)
        
        if not match:
            return []
        
        word_list_text = match.group(1)
        
        # 提取所有被 ** 包围的单词
        word_pattern = r'\*\*([^*]+?)\*\*'
        found_words = re.findall(word_pattern, word_list_text)
        
        # 清理单词（去除首尾空格）
        return [word.strip() for word in found_words if word.strip()]
        
    except Exception as e:
        print(f"警告: 处理文件 {file_path.name} 时出错: {e}")
        return []


def main():
    """主函数"""
    # 设置目录路径
    seed_files_dir = Path('seed_files')
    output_file = Path('all_words.txt')
    
    # 检查输入目录
    if not seed_files_dir.exists():
        print(f"❌ 错误: {seed_files_dir} 目录不存在")
        return 1
    
    # 获取所有 markdown 文件（使用自然排序）
    md_files = sorted(
        seed_files_dir.glob('group*.md'),
        key=lambda x: int(re.search(r'\d+', x.stem).group()) if re.search(r'\d+', x.stem) else 0
    )
    
    if not md_files:
        print(f"❌ 警告: 在 {seed_files_dir} 中没有找到 group*.md 文件")
        return 1
    
    print(f"📁 找到 {len(md_files)} 个文件")
    print(f"{'='*50}")
    
    # 收集所有单词
    all_words = []
    for file_path in md_files:
        words = extract_words_from_file(file_path)
        all_words.extend(words)
        if len(all_words) % 500 == 0:  # 每500个单词显示一次进度
            print(f"📊 已提取 {len(all_words)} 个单词...")
    
    # 写入输出文件
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(all_words) + '\n')
    except Exception as e:
        print(f"❌ 写入文件失败: {e}")
        return 1
    
    # 显示统计信息
    print(f"{'='*50}")
    print(f"✅ 完成！")
    print(f"📝 总共提取了 {len(all_words)} 个单词")
    print(f"💾 已保存到: {output_file}")
    print(f"🔢 其中唯一单词数量: {len(set(all_words))}")
    
    return 0


if __name__ == '__main__':
    exit(main())

