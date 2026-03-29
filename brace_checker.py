
import os

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find DashboardPage
start_str = "export default function DashboardPage() {"
start_idx = content.find(start_str)

if start_idx == -1:
    print("DashboardPage not found")
else:
    # Counter for braces
    count = 0
    in_string = False
    quote_char = ""
    
    for i in range(start_idx + len(start_str) - 1, len(content)):
        char = content[i]
        
        if not in_string:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
                if count == 0:
                    print(f"DashboardPage ends at index {i} (Line {content[:i].count('\n') + 1})")
                    break
        
        # Simple string tracking
        if char in ["'", '"', '`']:
            if not in_string:
                in_string = True
                quote_char = char
            elif quote_char == char:
                # Check for escape? Skip for now.
                in_string = False

if count > 0:
    print(f"ERROR: DashboardPage has {count} unclosed braces!")
elif count < 0:
    print(f"ERROR: DashboardPage has {abs(count)} extra closing braces!")
