import re

with open('explore.html', 'r', encoding='utf-8') as f:
    html = f.read()

body_match = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
if body_match:
    body = body_match.group(1)
    body = body.replace('class=', 'className=')
    body = body.replace('for=', 'htmlFor=')
    body = re.sub(r'(<img[^>]*?[^/])>', r'\g<1>/>', body)
    body = re.sub(r'(<input[^>]*?[^/])>', r'\g<1>/>', body)
    body = re.sub(r'(<hr[^>]*?[^/])>', r'\g<1>/>', body)
    body = re.sub(r'(<br[^>]*?[^/])>', r'\g<1>/>', body)
    body = re.sub(r'(<meta[^>]*?[^/])>', r'\g<1>/>', body)
    body = re.sub(r'(<link[^>]*?[^/])>', r'\g<1>/>', body)
    body = body.replace('<!--', '{/*').replace('-->', '*/}')
    
    react_code = """\"use client\";\n\nimport React from \"react\";\n\nexport default function ExplorePage() {\n  return (\n    <div className=\"bg-surface-canvas font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container\">\n""" + body + """\n    </div>\n  );\n}\n"""
    
    with open('prism_logic/cad-dashboard-app/src/app/explore/page.tsx', 'w', encoding='utf-8') as out:
        out.write(react_code)
    print('Converted successfully')
else:
    print('Body tag not found')
