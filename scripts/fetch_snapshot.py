"""Download a pinned, credited public data snapshot; no live dependency on the original host."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'v20261018-p4p'
BASE = f'https://husforhus.se/data/{VERSION}/'
DEST = ROOT / 'web' / 'data' / VERSION

def fetch(name):
    if '..' in name or name.startswith('/'):
        raise ValueError(name)
    target = DEST / name
    if not target.exists():
        data = subprocess.check_output(['curl', '-fLsS', '--retry', '2', '--max-time', '90', BASE + name])
        if name.endswith('.json'):
            json.loads(data)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    return name, target.stat().st_size

def main():
    fetch('stockholm.json')
    config = json.loads((DEST / 'stockholm.json').read_text())
    files = ['attrs.bin.gz', 'water.bin.gz', 'land.bin.gz', 'labels.json',
             'districts.bin.gz', 'photo-gids.json', 'plaques.json', 'metro.json',
             'quests.json', 'search/index.json', config['terrain']['file'], *config['packs']]
    files += [f'{directory}/{i:02d}.json' for directory in ['cards', 'wiki'] for i in range(64)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(fetch, files))
    index = json.loads((DEST / 'search/index.json').read_text())
    shards = sorted({row[3] for row in index['streets']})
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results += list(pool.map(fetch, [f'search/addr/{s}.json' for s in shards]))
    (DEST.parent / 'current.json').write_text(json.dumps({'version': VERSION}))
    manifest = {'source': BASE, 'version': VERSION, 'files': {
        str(p.relative_to(DEST)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(DEST.rglob('*')) if p.is_file()}}
    (ROOT / 'snapshot-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(f'Downloaded {len(results)+1} files: {sum(size for _, size in results)/1024/1024:.1f} MiB', flush=True)

if __name__ == '__main__':
    main()
