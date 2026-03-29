
import os
import re

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

tag_stack = []
tag_pattern = re.compile(r'<(div|main|button|span|section|article|h[1-5]|p|pre|code)(?:\s+[^>]*?)?(>|(?:\/>))|<\/(div|main|button|span|section|article|h[1-5]|p|pre|code)>', re.IGNORECASE | re.DOTALL)

for match in tag_pattern.finditer(content):
    full_match = match.group(0)
    line_num = content[:match.start()].count('\n') + 1
    
    if full_match.endswith('/>'):
        continue
    
    if full_match.startswith('</'):
        tag_name = match.group(3)
        if not tag_stack:
            print(f"ERROR: Extra </{tag_name}> at line {line_num}")
        else:
            top_name, top_line = tag_stack.pop()
            if top_name.lower() != tag_name.lower():
                print(f"ERROR: Mismatch! Top is <{top_name}> from line {top_line}, but found </{tag_name}> at line {line_num}")
                # We put it back and move on? No, just keep popping.
    else:
        tag_name = match.group(1)
        tag_stack.append((tag_name, line_num))

if tag_stack:
    print(f"UNCLOSED TAGS ({len(tag_stack)}):")
    for t in tag_stack:
        # Filter out noise
        if t[0].lower() in ['div', 'main', 'span', 'p']:
            print(f"  <{t[0]}> at line {t[1]}")
