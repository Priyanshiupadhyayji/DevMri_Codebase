
import os
import re

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Simple stack-based tag and brace checker
stack = []
def check_balance(text):
    lines = text.split('\n')
    for num, line in enumerate(lines, 1):
        # Braces
        for char in line:
            if char == '{': stack.append(('{', num))
            elif char == '}':
                if not stack: 
                   # print(f"ERROR: Extra }} at line {num}")
                   pass
                else:
                    top, _ = stack.pop()
                    if top != '{':
                        # print(f"ERROR: Expected {top} closed, but found }} at line {num}")
                        pass
    return stack

# Check JS Braces
rem = check_balance(content)
if rem:
    print(f"Unclosed Braces ({len(rem)}):")
    for r in rem:
        print(f"  {{ at line {r[1]}")

# Check JSX Tags (simplified)
tag_stack = []
# Find all <div, <main, <button, etc and their closures
# This is hard because of style={{...}}
# We will use a regex to find tags
tag_pattern = re.compile(r'<(div|main|button|span|section|article|h[1-5]|p|pre|code)(?:\s+[^>]*?)?(>|(?:\/>))|<\/(div|main|button|span|section|article|h[1-5]|p|pre|code)>', re.IGNORECASE | re.DOTALL)

for match in tag_pattern.finditer(content):
    full_match = match.group(0)
    tag_name = match.group(1) or match.group(3)
    is_close = full_match.startswith('</')
    is_self_close = full_match.endswith('/>')
    
    if is_self_close:
        continue
    if is_close:
        if not tag_stack:
            # print(f"ERROR: Extra </{tag_name}> at line {content[:match.start()].count('\n')+1}")
            pass
        else:
            top_name, line_num = tag_stack.pop()
            if top_name != tag_name:
                # print(f"ERROR: Expected </{top_name}> (from line {line_num}), but found </{tag_name}> at line {content[:match.start()].count('\n')+1}")
                pass
    else:
        tag_stack.append((tag_name, content[:match.start()].count('\n')+1))

if tag_stack:
    print(f"Unclosed Tags ({len(tag_stack)}):")
    for t in tag_stack:
        # Filter out some false positives from style props
        if t[0] in ['div', 'main', 'span', 'p', 'button']:
            print(f"  <{t[0]}> at line {t[1]}")
