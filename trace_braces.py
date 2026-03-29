
import os

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines, 1):
    for char in line:
        if char == '{':
            stack.append(i)
        elif char == '}':
            if stack:
                stack.pop()
            else:
                print(f"Extra }} at line {i}")

if stack:
    print(f"Unclosed Braces ({len(stack)}):")
    # Show the last 10
    for s in stack[-10:]:
        print(f"  {{ at line {s}")
