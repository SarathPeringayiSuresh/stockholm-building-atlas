"""Build a compact pedestrian graph and outdoor stops from downloaded OSM data.
Usage: python3 scripts/build_walk_data.py /path/to/osm.json (Overpass geom)
   or: python3 scripts/build_walk_data.py /path/to/extracts (OSM XML files)
Derived OSM graph/places are ODbL; preserve attribution and source metadata.
"""
import sys,json,math,datetime,collections,re,hashlib
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
if source.is_dir():
    raw_nodes={};raw_ways={};raw_relations={}
    for f in source.glob('*.xml'):
        root=ET.parse(f).getroot()
        for e in root:
            tags={x.attrib['k']:x.attrib['v'] for x in e.findall('tag')}
            if e.tag=='node':raw_nodes[int(e.attrib['id'])]={'type':'node','id':int(e.attrib['id']),'lat':float(e.attrib['lat']),'lon':float(e.attrib['lon']),'tags':tags}
            if e.tag=='relation':raw_relations[int(e.attrib['id'])]={'type':'relation','id':int(e.attrib['id']),'tags':tags,'members':[dict(x.attrib) for x in e.findall('member')]}
            if e.tag=='way':raw_ways[int(e.attrib['id'])]={'type':'way','id':int(e.attrib['id']),'nodes':[int(x.attrib['ref']) for x in e.findall('nd')],'tags':tags}
    elements=list(raw_nodes.values())
    for w in raw_ways.values():
        if all(n in raw_nodes for n in w['nodes']):
            w['geometry']=[{k:raw_nodes[n][k] for k in ['lat','lon']} for n in w['nodes']];elements.append(w)
    for r in raw_relations.values():
        for m in r['members']:
            if m.get('type')=='way':m['geometry']=raw_ways.get(int(m['ref']),{}).get('geometry',[])
        if r['tags'].get('type')=='multipolygon':elements.append(r)
    timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
else:
    raw=json.loads(source.read_text());elements=raw['elements'];timestamp=raw.get('osm3s',{}).get('timestamp_osm_base',datetime.datetime.now(datetime.timezone.utc).isoformat())
def dist(a,b):return math.hypot((a[0]-b[0])*111195,(a[1]-b[1])*111195*math.cos(math.radians((a[0]+b[0])/2)))
# Exclude paths inside mapped ticketed theme parks and zoos (including Skansen).
restricted=[]
for e in elements:
    t=e.get('tags',{})
    if t.get('tourism') in ('theme_park','zoo') or (t.get('fee')=='yes' and t.get('leisure') in ('garden','park')):
        ps=e.get('geometry',[])
        if len(ps)>3:
            polygon=[(p['lat'],p['lon']) for p in ps]
            restricted.append((min(p[0] for p in polygon),min(p[1] for p in polygon),max(p[0] for p in polygon),max(p[1] for p in polygon),polygon))
def is_restricted(lat,lon):
    for lo,le,hi,ri,poly in restricted:
        if not(lo<=lat<=hi and le<=lon<=ri):continue
        inside=False;j=len(poly)-1
        for i,(y,x) in enumerate(poly):
            yj,xj=poly[j]
            if (y>lat)!=(yj>lat) and lon<(xj-x)*(lat-y)/(yj-y)+x:inside=not inside
            j=i
        if inside:return True
    return False
coords={};edges={};ways=0
excluded_nodes=set()
allowed={'footway','pedestrian','path','steps','living_street','residential','service','unclassified','tertiary','tertiary_link','secondary','secondary_link','primary','primary_link','cycleway','track'}
blocked={e['id'] for e in elements if e['type']=='node' and (e.get('tags',{}).get('foot') in ('no','private') or e.get('tags',{}).get('access') in ('no','private'))}
for e in elements:
    t=e.get('tags',{})
    if e['type']!='way' or t.get('highway') not in allowed or t.get('area')=='yes':continue
    if t.get('foot') in ('no','private','use_sidepath') or t.get('access') in ('private','no','customers','delivery') or t.get('indoor')=='yes' or t.get('tunnel')=='building_passage':continue
    if t.get('highway')=='cycleway' and t.get('foot') not in ('yes','designated','permissive'):continue
    if t.get('highway')=='service' and t.get('service') in ('driveway','parking_aisle','drive-through'):continue
    if t.get('highway') in ('primary','secondary') and t.get('sidewalk')=='no' and t.get('foot') not in ('yes','designated'):continue
    ids=e.get('nodes',[]);geom=e.get('geometry',[])
    if len(ids)!=len(geom):continue
    ways+=1
    for i,n in enumerate(ids):
        if n not in coords and is_restricted(geom[i]['lat'],geom[i]['lon']):excluded_nodes.add(n)
        coords[n]=[round(geom[i]['lat'],6),round(geom[i]['lon'],6)]
    for a,b in zip(ids,ids[1:]):
        if a==b or a in blocked or b in blocked or a in excluded_nodes or b in excluded_nodes:continue
        d=dist(coords[a],coords[b])
        if d>.1:edges[tuple(sorted((a,b)))]=round(d,2)
# Keep the largest connected walking component; do not invent links across water.
adj=collections.defaultdict(list)
for a,b in edges:adj[a].append(b);adj[b].append(a)
seen=set();components=[]
for n in adj:
    if n in seen:continue
    group=set([n]);seen.add(n);stack=[n]
    while stack:
        for v in adj[stack.pop()]:
            if v not in seen:seen.add(v);group.add(v);stack.append(v)
    components.append(group)
keep=max(components,key=len);ids=sorted(keep);index={n:i for i,n in enumerate(ids)};nodes=[coords[n] for n in ids]
graph={'nodes':nodes,'edges':[[index[a],index[b],m] for (a,b),m in edges.items() if a in keep and b in keep]}
# Grid indexing avoids a full-node scan for every park boundary vertex.
grid=collections.defaultdict(list)
for i,p in enumerate(nodes):grid[(int(p[0]*500),int(p[1]*500))].append(i)
def nearest(p):
    key=(int(p[0]*500),int(p[1]*500));c=[]
    for dx in range(-2,3):
        for dy in range(-2,3):c.extend(grid.get((key[0]+dx,key[1]+dy),[]))
    if not c:c=range(len(nodes))
    i=min(c,key=lambda i:dist(p,nodes[i]));return i,dist(p,nodes[i])
places=[];names=set();selected=set(json.loads((ROOT/'walk/data/green-space-selection.json').read_text()))
for p in json.loads((ROOT/'walk/data/landmarks.json').read_text()):
    i,d=nearest(p['coords'])
    if d>180:continue
    places.append({'id':'atlas-'+str(p['gid']),'name':p['name'],'categories':['architecture'],'coords':nodes[i],'node':i,'year':p['year'],'description':f"Architecture · {p['year']} in the building atlas. View from outside.",'source':'https://husforhus.se/data/v20261018-p4p/stockholm.json','atlasGid':p['gid'],'approachMetres':round(d)})
water=re.compile(r'mälar|strand|långholm|reimersholm|tantolund|nobelpark|waldemars|djurgårdsbrunn|isblad|långholms|beckholm|kastell|montelius|skinnarvik|fåfäng|fjällgat|sjö|riddarholm|skeppsholm|rålamb|smedsudd',re.I)
for e in elements:
    t=e.get('tags',{});name=t.get('name');leisure=t.get('leisure');view=t.get('tourism')=='viewpoint'
    if not name or (name not in selected and not view) or name.casefold() in names:continue
    if leisure not in ('park','garden','nature_reserve') and not view and name!='Rosendals Slottspark':continue
    if t.get('access') in ('private','no','customers') or t.get('fee')=='yes':continue
    if t.get('garden:type') in ('residential','botanical') or t.get('landuse')=='allotments':continue
    geometry=e.get('geometry',[])
    if e['type']=='relation':
        geometry=[p for m in e.get('members',[]) for p in m.get('geometry',[])]
    if not geometry and 'lat' in e:geometry=[e]
    if not geometry:continue
    ps=[[p['lat'],p['lon']] for p in geometry if p and 'lat' in p]
    if not ps:continue
    lat=sum(p[0] for p in ps)/len(ps);lon=sum(p[1] for p in ps)/len(ps)
    if not (59.30<lat<59.36 and 18.02<lon<18.16) or is_restricted(lat,lon):continue
    # Skip tiny planted squares; keep meaningful green-space stops.
    if len(ps)>2:
        area=abs(sum(ps[j][1]*ps[(j+1)%len(ps)][0]-ps[(j+1)%len(ps)][1]*ps[j][0] for j in range(len(ps))))/2*111195**2*math.cos(math.radians(lat))
        if area<1800 and not view:continue
    candidates=[nearest(p) for p in ps[::max(1,len(ps)//60)]]
    if view:candidates=[nearest([lat,lon])]
    i,d=min(candidates,key=lambda x:x[1])
    if d>100:continue
    categories=['waterfront'] if view else ['nature']
    if water.search(name) and 'waterfront' not in categories:categories.append('waterfront')
    description='Viewpoint · take in the city from an outdoor lookout.' if view else 'Green space · pause by the park and follow its public paths.'
    if leisure=='nature_reserve':description='Nature reserve · a green escape along public walking paths.'
    places.append({'id':f"osm-{e['type']}-{e['id']}",'name':name,'categories':categories,'coords':nodes[i],'node':i,'description':description,'source':f"https://www.openstreetmap.org/{e['type']}/{e['id']}",'approachMetres':round(d)})
    names.add(name.casefold())
# Spatially duplicate named park parts count as one stop; no fabricated POIs.
meta={'date':timestamp[:10],'osmTimestamp':timestamp,'nodes':len(nodes),'edges':len(graph['edges']),'ways':ways,'licence':'ODbL-1.0','coverage':[59.30,18.02,59.36,18.16],'excludedTicketedAreas':len(restricted),'source':'OpenStreetMap','speedKmH':4.5}
for name,data in [('graph.json',graph),('places.json',{'meta':meta,'places':places})]:
    (ROOT/'walk/data'/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(meta);print('Places:',len(places),collections.Counter(c for p in places for c in p['categories']))
print('Nature & views:',', '.join(p['name'] for p in places if 'architecture' not in p['categories']))
