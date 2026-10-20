"""Fetch bounded OSM XML extracts with two concurrent requests.
Usage: python3 scripts/fetch_walk_data.py /path/to/cache
Never run this on page load. The static app uses the resulting bundled snapshot.
"""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
def fetch(cell):
    x,y=cell;p=root/f'{x}_{y}.xml';west=18.02+x*.02;south=59.30+y*.01
    url=f'https://api.openstreetmap.org/api/0.6/map?bbox={west:.4f},{south:.4f},{west+.02:.4f},{south+.01:.4f}'
    if not p.exists():
        subprocess.run(['curl','-fLsS','--retry','1','--max-time','60',url,'-o',str(p)],check=True)
    if ET.parse(p).getroot().tag!='osm':raise ValueError(f'Invalid OSM response: {p}')
    return {'file':p.name,'url':url,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
    files=list(ex.map(fetch,[(x,y) for x in range(7) for y in range(6)]))
manifest={'retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'coverage':[59.30,18.02,59.36,18.16],'licence':'ODbL-1.0','files':files}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(f'Validated {len(files)} OSM extracts. Run scripts/build_walk_data.py with this directory.')
