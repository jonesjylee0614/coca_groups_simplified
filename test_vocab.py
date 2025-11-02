import re

f = open('reading_materials/group14_reading.md', 'r', encoding='utf-8')
content = f.read()
f.close()

# 查找词汇表部分
match = re.search(r'##.*?重点词汇注释', content)
if match:
    print(f"Found at position: {match.start()}")
    section = content[match.start():match.start()+2000]
    words = re.findall(r'\d+\.\s+\*\*([a-zA-Z]+)\*\*', section)
    print(f"Found {len(words)} words")
    print(f"First 10: {words[:10]}")
else:
    print("Not found")

