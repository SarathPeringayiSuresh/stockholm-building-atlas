"""Build the focused Stockholm walking planner for static hosting."""
import json
import shutil
from pathlib import Path
root = Path(__file__).resolve().parents[1]
out = root / 'dist'
for name in ('graph.json', 'places.json'):
    if not (root / 'walk/data' / name).is_file():
        raise SystemExit(f'Missing walking data: {name}; run scripts/build_walk_data.py first.')
if out.exists():
    shutil.rmtree(out)
shutil.copytree(root / 'walk', out, ignore=shutil.ignore_patterns('test'))
shutil.copy(root / 'WALK-DATA-SOURCES.md', out / 'DATA-SOURCES.md')
print(f"Walking planner ready: {len(json.loads((out / 'data/places.json').read_text())['places'])} outdoor stops")
