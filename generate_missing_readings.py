"""
生成缺失的 reading_materials_shuffled 文件

这个脚本会读取 seed_shuffled 中的词汇列表和指令，
为缺失的 reading 文件创建提示，供 AI 生成内容使用。
"""

import os
import sys
import io

# 设置输出编码为UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 缺失的文件列表
MISSING_FILES = [65, 66, 67, 68, 69, 70, 88, 150, 160, 170, 180, 190, 200]

SEED_DIR = "seed_shuffled"
OUTPUT_DIR = "reading_materials_shuffled"

def read_seed_file(group_num):
    """读取seed文件内容"""
    seed_path = os.path.join(SEED_DIR, f"g{group_num}.md")
    if not os.path.exists(seed_path):
        print(f"警告: seed文件不存在 - {seed_path}")
        return None
    
    with open(seed_path, 'r', encoding='utf-8') as f:
        return f.read()

def create_prompt_file(group_num):
    """为每个缺失的组创建AI提示文件"""
    seed_content = read_seed_file(group_num)
    if not seed_content:
        return False
    
    prompt_file = f"prompts_for_ai/prompt_g{group_num}.txt"
    os.makedirs("prompts_for_ai", exist_ok=True)
    
    with open(prompt_file, 'w', encoding='utf-8') as f:
        f.write(f"=== 请使用以下内容生成 g{group_num}_reading.md ===\n\n")
        f.write(seed_content)
        f.write("\n\n=== 生成完成后，保存为: reading_materials_shuffled/g{}_reading.md ===".format(group_num))
    
    print(f"[OK] 创建提示文件: {prompt_file}")
    return True

def generate_simple_placeholder(group_num):
    """生成简单的占位符文件（可选）"""
    seed_content = read_seed_file(group_num)
    if not seed_content:
        return False
    
    # 提取词汇列表
    lines = seed_content.split('\n')
    word_list = ""
    for i, line in enumerate(lines):
        if line.startswith('**') and '**' in line[2:]:
            word_list = line
            break
    
    placeholder_content = f"""# Group {group_num} Learning Material

**注意：此文件为占位符，需要使用 AI 生成完整内容**

## 词汇列表
{word_list}

## 生成说明
请将 `prompts_for_ai/prompt_g{group_num}.txt` 中的完整提示提交给 AI（如 ChatGPT 或 Claude），
然后将生成的内容替换此文件。

## 生成步骤
1. 打开 `prompts_for_ai/prompt_g{group_num}.txt`
2. 复制全部内容
3. 提交给 AI（推荐使用 Claude 3.5 Sonnet 或 GPT-4）
4. 将生成的内容保存为本文件

---

### 临时内容

本组包含以下词汇（待生成完整学习材料）：
{word_list}
"""
    
    output_path = os.path.join(OUTPUT_DIR, f"g{group_num}_reading.md")
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(placeholder_content)
    
    print(f"[OK] 创建占位符文件: {output_path}")
    return True

def main():
    print("=" * 60)
    print("生成缺失的 reading_materials_shuffled 文件")
    print("=" * 60)
    print()
    
    print(f"需要生成的文件数量: {len(MISSING_FILES)}")
    print(f"缺失的组号: {MISSING_FILES}")
    print()
    
    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs("prompts_for_ai", exist_ok=True)
    
    # 询问用户选择
    print("请选择操作：")
    print("1. 创建AI提示文件（用于手动提交给AI）")
    print("2. 创建占位符文件（临时占位，稍后替换）")
    print("3. 两者都创建")
    print()
    
    choice = input("请输入选择 (1/2/3): ").strip()
    
    if choice not in ['1', '2', '3']:
        print("无效选择，退出。")
        return
    
    print()
    print("开始处理...")
    print()
    
    success_count = 0
    
    for group_num in MISSING_FILES:
        print(f"\n处理 Group {group_num}...")
        
        if choice in ['1', '3']:
            if create_prompt_file(group_num):
                success_count += 1
        
        if choice in ['2', '3']:
            if generate_simple_placeholder(group_num):
                success_count += 1
    
    print()
    print("=" * 60)
    print(f"完成！成功处理 {success_count} 个文件")
    print()
    
    if choice in ['1', '3']:
        print("[提示] AI提示文件已保存在: prompts_for_ai/")
        print("   请将这些提示提交给 AI（如 Claude 或 GPT-4）生成完整内容")
    
    if choice in ['2', '3']:
        print("[文件] 占位符文件已保存在: reading_materials_shuffled/")
        print("   这些是临时文件，需要替换为AI生成的完整内容")
    
    print()
    print("建议：使用 Claude 3.5 Sonnet 或 GPT-4o 生成高质量学习材料")
    print("=" * 60)

if __name__ == "__main__":
    main()

