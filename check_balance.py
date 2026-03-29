
import os

file_path = r"c:\Users\urjit upadhyay\Dropbox (Old)\PC\Desktop\X-ray\devmri-app\src\app\dashboard\page.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

open_paren = content.count('(')
close_paren = content.count(')')
open_brace = content.count('{')
close_brace = content.count('}')
open_bracket = content.count('[')
close_bracket = content.count(']')

print(f"Parens: (={open_paren}, )={close_paren}, Diff={open_paren - close_paren}")
print(f"Braces: {{={open_brace}, }}={close_brace}, Diff={open_brace - close_brace}")
print(f"Brackets: [={open_bracket}, ]={close_bracket}, Diff={open_bracket - close_bracket}")

# Let's check JSX tags balance for specific tags
tags = ['div', 'main', 'button', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'p', 'pre', 'code']
for tag in tags:
    o = content.count(f'<{tag}')
    c = content.count(f'</{tag}')
    # Account for self-closing tags like <div /> if any (though rare for these)
    sc = content.count(f'<{tag} />') + content.count(f'<{tag} /')
    # Actually count how many times <tag appears WITHOUT being followed by /
    # A simple regex might be better
    import re
    open_count = len(re.findall(rf'<{tag}(\s|>)', content))
    close_count = len(re.findall(rf'</{tag}>', content))
    # Count self-closing: <tag ... />
    self_closing = len(re.findall(rf'<{tag}[^>]*?/>', content))
    
    if open_count != close_count + self_closing:
        print(f"Mismatch in tag <{tag}>: Open={open_count}, Close={close_count}, SelfClosing={self_closing}, Net={open_count - close_count - self_closing}")

# Custom components
components = ['InteractivePipeline', 'PatientMonitor', 'ThemeToggle', 'MedicalCertificate', 'EmptyClinicalState', 'CinematicTour', 'AutopsyReplay', 'ResponsiveContainer', 'RadarChart', 'PolarGrid', 'PolarAngleAxis', 'PolarRadiusAxis', 'Radar', 'Tooltip']
for comp in components:
    open_count = len(re.findall(rf'<{comp}(\s|>)', content))
    close_count = len(re.findall(rf'</{comp}>', content))
    self_closing = len(re.findall(rf'<{comp}[^>]*?/>', content))
    if open_count != close_count + self_closing:
        print(f"Mismatch in component <{comp}>: Open={open_count}, Close={close_count}, SelfClosing={self_closing}, Net={open_count - close_count - self_closing}")
