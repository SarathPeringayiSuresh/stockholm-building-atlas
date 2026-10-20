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
shutil.copytree(root / 'walk', out, ignore=shutil.ignore_patterns('test', 'vendor'))
# Ship only the original atlas's renderer primitives and geometry, not its old UI.
atlas = out / 'atlas'
(atlas / 'vendor').mkdir(parents=True)
(atlas / 'data').mkdir()
for name in ('worker.js', 'tile.js', 'gz.js', 'sweref.js', 'themes.js'):
    shutil.copy(root / 'web' / name, atlas / name)
for name in ('three.module.js', 'three.core.js', 'MapControls.js', 'OrbitControls.js', 'fflate.js', 'fflate.LICENSE'):
    shutil.copy(root / 'web/vendor' / name, atlas / 'vendor' / name)
version = json.loads((root / 'web/data/current.json').read_text())['version']
data = root / 'web/data' / version
config = json.loads((data / 'stockholm.json').read_text())
config['tiles'] = [tile for tile in config['tiles'] if tile['dist'] < 6500]
(atlas / 'data/stockholm.json').write_text(json.dumps({k: config[k] for k in ('origin', 'tiles', 'periods', 'home')}))
for name in {'land.bin.gz', 'water.bin.gz', *(tile['pack'] for tile in config['tiles'])}:
    shutil.copy(data / name, atlas / 'data' / name)
shutil.copy(root / 'WALK-DATA-SOURCES.md', out / 'DATA-SOURCES.md')
print(f"Walking planner ready: {len(json.loads((out / 'data/places.json').read_text())['places'])} outdoor stops")
