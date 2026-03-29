
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
        tag_name = match.group(3).lower()
        if not tag_stack:
            pass
        else:
            top_name, top_line = tag_stack.pop()
            if top_line == 848:
                print(f"Line 848 (<{top_name}>) closed by </{tag_name}> at line {line_num}")
            elif line_num == 3657:
                print(f"Line 3657 (</{tag_name}>) closed <{top_name}> from line {top_line}")
    else:
        tag_name = match.group(1).lower()
        tag_stack.append((tag_name, line_num))
