import os

input_file = 'index.html'
output_html = 'index.html'
css_file = 'src/styles.css'
js_file = 'src/main.js'

os.makedirs('src', exist_ok=True)

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_html_lines = []
css_lines = []
js_lines = []

in_style = False
in_script = False

style_extracted = False
script_extracted = False

for i, line in enumerate(lines):
    # CSS extraction
    if not style_extracted and '<style>' in line:
        in_style = True
        new_html_lines.append('    <link rel="stylesheet" href="/src/styles.css" />\n')
        continue
    if in_style and '</style>' in line:
        in_style = False
        style_extracted = True
        continue
    if in_style:
        css_lines.append(line)
        continue

    # Remove old three.js CDN links
    if '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/' in line or \
       '<script src="https://cdn.jsdelivr.net/npm/three' in line:
        continue

    # JS extraction
    if not script_extracted and '<script>' in line and i > 2400:
        in_script = True
        new_html_lines.append('    <script type="module" src="/src/main.js"></script>\n')
        continue
    if in_script and '</script>' in line:
        in_script = False
        script_extracted = True
        continue
    if in_script:
        js_lines.append(line)
        continue

    new_html_lines.append(line)

with open(css_file, 'w', encoding='utf-8') as f:
    f.writelines(css_lines)

# Since we use Vite, we need to import Three
js_content = 'import * as THREE from "three";\n' + "".join(js_lines)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js_content)

with open(output_html, 'w', encoding='utf-8') as f:
    f.writelines(new_html_lines)

print("Extraction complete")
