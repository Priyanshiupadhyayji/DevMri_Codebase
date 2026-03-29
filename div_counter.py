
import os

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
for i, line in enumerate(lines):
    l = line.strip()
    if '<div' in l and not '/>' in l:
        count += 1
    if '</div' in l:
        count -= 1
    if '<main' in l:
        print(f"Main opened at {i+1}")
    if '</main' in l:
        print(f"Main closed at {i+1}")
    if i+1 == 4085:
        print(f"Net divs at line 4085: {count}")

print(f"Final net divs: {count}")
