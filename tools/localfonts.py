"""Download the latin-subset woff2 files named in a Google Fonts css and write a local @font-face css.

usage: python3 -I localfonts.py <fonts.css> <outdir>
"""
import re, sys, urllib.request, pathlib

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
css = src.read_text()
blocks = re.findall(r'/\* (\S+) \*/\s*(@font-face \{.*?\})', css, re.S)
local = []
for subset, block in blocks:
    if subset != 'latin':
        continue
    fam = re.search(r"font-family: '([^']+)'", block).group(1)
    wt = re.search(r'font-weight: (\d+)', block).group(1)
    url = re.search(r'url\((https://[^)]+\.woff2)\)', block).group(1)
    name = f"{fam.replace(' ', '')}-{wt}.woff2"
    (out / name).write_bytes(urllib.request.urlopen(url).read())
    block = re.sub(r'src: url\([^)]+\) format\(\'woff2\'\);', f"src: url('{name}') format('woff2');", block)
    local.append(block)
(out / 'fonts.local.css').write_text('\n'.join(local) + '\n')
print(len(local), 'faces')
