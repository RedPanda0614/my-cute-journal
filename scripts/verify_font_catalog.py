"""Run with a Python environment containing fonttools. Checks bundled source fonts independently of browser fallback."""
from pathlib import Path
from hashlib import sha256
import json
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1] / '网页源码' / 'fonts'
fonts = json.loads((root / 'catalog.json').read_text())
seen = set()
for info in fonts:
    file = root / info['file']
    digest = sha256(file.read_bytes()).hexdigest()
    assert digest == info['sha256'], f'Changed binary: {info["family"]}'
    assert digest not in seen, f'Duplicate font binary: {info["family"]}'
    seen.add(digest)
    assert (root / info['licenseFile']).is_file(), f'Missing license: {info["family"]}'
    with TTFont(file) as font:
        actual = font.getBestCmap()
        coverage = {cp for a, b in info['ranges'] for cp in range(a, b + 1)}
        assert coverage == set(actual), f'Wrong coverage: {info["family"]}'
        sample = '星期一' if info['language'] == 'zh' else 'Monday'
        assert all(cp in actual and actual[cp] != '.notdef' for cp in map(ord, sample) if not chr(cp).isspace()), f'Missing sample glyph: {info["family"]}'
        names = [n.toUnicode() for n in font['name'].names if n.nameID in [1, 4, 6, 16]]
        # Google Fonts' public family name differs from the source SFNT name here.
        source_family = {'Nanum Pen Script': 'Nanum Pen'}.get(info['family'], info['family'])
        family_key = ''.join(c.lower() for c in source_family if c.isalnum())
        assert any(family_key in ''.join(c.lower() for c in n if c.isalnum()) for n in names), f'Wrong source family: {info["family"]}: {names}'
print(f'PASS: {len(fonts)} distinct source fonts; licenses, SHA-256, actual family names, cmap coverage and preview glyphs verified.')
