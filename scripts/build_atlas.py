"""Build the standalone static atlas from checked-in source and pinned map assets."""
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'dist'
if out.exists():
    shutil.rmtree(out)
shutil.copytree(root / 'web', out, ignore=shutil.ignore_patterns('test', '_shots'))
version = json.loads((out / 'data/current.json').read_text())['version']
path = out / 'data' / version / 'stockholm.json'
config = json.loads(path.read_text())
config['about']['maker'] = ''
config['about']['contact'] = ''
config['subtitle'] = {'en': 'A city of islands. A history in buildings.', 'sv': 'En stad av öar. En historia i byggnader.'}
path.write_text(json.dumps(config, ensure_ascii=False))
shutil.copy(root / 'DATA-SOURCES.md', out / 'DATA-SOURCES.md')
print(f'Static atlas ready: {config["stats"]["buildings"]:,} buildings')
