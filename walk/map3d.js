import * as THREE from './atlas/vendor/three.module.js';
import {MapControls} from './atlas/vendor/MapControls.js';
import {fetchGz} from './atlas/gz.js';
import {latLonToLocal} from './atlas/sweref.js';
import {THEMES} from './atlas/themes.js';
const theme=THEMES.arg;
function polygons(buf){
 const [np,nr,nv]=new Uint32Array(buf,0,3),rs=new Uint32Array(buf,12,np+1),vs=new Uint32Array(buf,12+4*(np+1),nr+1),xz=new Float32Array(buf,12+4*(np+1)+4*(nr+1),nv*2);
 const ring=r=>{const pts=[];for(let i=vs[r];i<vs[r+1];i++)pts.push(new THREE.Vector2(xz[i*2],-xz[i*2+1]));return pts;};
 const shapes=[];for(let p=0;p<np;p++){const s=new THREE.Shape(ring(rs[p]));for(let r=rs[p]+1;r<rs[p+1];r++)s.holes.push(new THREE.Path(ring(r)));shapes.push(s);}
 const g=new THREE.ShapeGeometry(shapes);g.rotateX(-Math.PI/2);return g;
}
export class AtlasMap {
 constructor(el,onError){
  this.el=el;this.onError=onError;this.markers=[];this.pendingRoute=null;this.inset=0;this.disposed=false;this.dirty=true;
  this.status=document.createElement('p');this.status.className='atlas-status';this.status.textContent='Bringing the building atlas back…';el.append(this.status);
  this.canvas=document.createElement('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','3D Stockholm building map. Drag to pan, scroll to zoom, right-drag to rotate.');el.append(this.canvas);
  try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true});}catch(e){this.fail('The 3D map needs WebGL. Your walk and Google Maps links still work.');return;}
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(theme.sky);
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(35,1,2,40000);this.controls=new MapControls(this.camera,this.canvas);
  this.controls.enableDamping=true;this.setInteraction(!matchMedia('(max-width: 720px)').matches);this.controls.maxPolarAngle=Math.PI*.46;this.controls.minDistance=150;this.controls.maxDistance=18000;this.controls.screenSpacePanning=false;
  this.controls.mouseButtons={LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_ROTATE};
  this.controls.listenToKeyEvents(this.canvas);this.controls.addEventListener('change',()=>{this.dirty=true;});
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x75838d,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(-1500,2500,1000);this.scene.add(sun);
  this.routeGroup=new THREE.Group();this.scene.add(this.routeGroup);this.labelLayer=document.createElement('div');this.labelLayer.className='atlas-labels';el.append(this.labelLayer);
  this.resizeObserver=new ResizeObserver(()=>{this.resize();if(this.config)this.fit(this.inset);});this.resizeObserver.observe(el);
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.fail('The 3D map was interrupted. Reload to restore it; your route links still work.');});
  this.resize();this.camera.position.set(-2600,2300,2200);this.controls.target.set(0,0,0);this.controls.update();
  this.animate=()=>{if(this.disposed)return;this.frame=requestAnimationFrame(this.animate);this.controls.update();if(this.dirty){this.renderer.render(this.scene,this.camera);this.projectLabels();this.dirty=false;}};this.animate();
  this.ready=this.load().catch(e=>this.fail('Some 3D map data could not load. Reload to try again.'));
 }
 setInteraction(enabled){if(!this.controls)return;this.controls.enabled=enabled;this.canvas.style.touchAction=enabled?'none':'pan-y';this.canvas.setAttribute('aria-label',enabled?'Interactive 3D Stockholm map. Drag to pan, pinch to zoom. Use Back to walk controls to leave the map.':'3D Stockholm map preview. Swipe to scroll the page, or choose Explore map to interact.');}
 fail(message){this.status.hidden=false;this.status.textContent=message;this.status.classList.add('error');this.onError?.(message);}
 resize(){if(!this.renderer)return;const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.dirty=true;}
 async load(){
  const response=await fetch(new URL('./atlas/data/stockholm.json',import.meta.url));if(!response.ok)throw Error('Map configuration unavailable');this.config=await response.json();
  const base=new URL('./atlas/data/',import.meta.url);
  const [land,water]=await Promise.all(['land.bin.gz','water.bin.gz'].map(p=>fetchGz(new URL(p,base))));
  const landMesh=new THREE.Mesh(polygons(land),new THREE.MeshBasicMaterial({color:theme.land}));landMesh.position.y=-1;this.scene.add(landMesh);
  const waterMesh=new THREE.Mesh(polygons(water),new THREE.MeshBasicMaterial({color:theme.water}));waterMesh.position.y=-2;this.scene.add(waterMesh);
  // The original atlas geometry worker preserves footprint courtyards and towers.
  const worker=new Worker(new URL('./atlas/worker.js',import.meta.url),{type:'module'});this.worker=worker;
  let pending;worker.onmessage=({data})=>{this.addTile(data);pending?.resolve();};worker.onerror=()=>pending?.reject(Error('Building geometry failed'));
  const tiles=this.config.tiles.filter(t=>t.dist<6500),packNames=[...new Set(tiles.map(t=>t.pack))];let loaded=0;
  for(const pack of packNames){const buf=await fetchGz(new URL(pack,base));for(const tile of tiles.filter(t=>t.pack===pack)){
   const slice=buf.slice(tile.offset,tile.offset+tile.length);await new Promise((resolve,reject)=>{pending={resolve,reject};worker.postMessage({buf:slice,id:loaded},[slice]);});
   this.status.textContent=`Drawing Stockholm · ${Math.round(++loaded/tiles.length*100)}%`;if(loaded===1){this.fit(this.inset);if(this.pendingRoute)this.showRoute(this.pendingRoute,this.inset);}
  }}
  worker.terminate();this.status.hidden=true;this.loaded=true;this.dirty=true;
 }
 addTile(m){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(m.pos,3));g.setIndex(new THREE.BufferAttribute(m.idx,1));
  const colors=new Float32Array(m.bld.length*3),palette=theme.periods.map(c=>new THREE.Color(c)),unknown=new THREE.Color(theme.unknown);
  for(let i=0;i<m.bld.length;i++){const a=m.bld[i]*12,flags=Math.floor(m.attr[a+1]/16),period=m.attr[a+1]%16;const color=flags===7?unknown:palette[period]||unknown;colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));mesh.scale.setScalar(.1);mesh.position.set(m.origin[0],0,m.origin[1]);this.scene.add(mesh);this.dirty=true;
 }
 point(coords,y=10){const [x,z]=latLonToLocal(...coords,this.config.origin);return new THREE.Vector3(x,y,z);}
 marker(coords,label,name,start=false){const button=document.createElement('button');button.className='atlas-marker'+(start?' start':'');button.textContent=label;button.title=name;button.setAttribute('aria-label',name);button.onclick=()=>{this.focusPoint(coords);this.status.hidden=false;this.status.textContent=name;};this.labelLayer.append(button);this.markers.push({position:this.point(coords,48),button});}
 showRoute(route,inset=0){this.pendingRoute=route;this.inset=inset;if(!this.config||!this.renderer)return;this.clearRoute();
  this.fit(inset);
  const width=Math.max(5,this.camera.position.distanceTo(this.controls.target)*.0016);
  for(const [half,color,order] of [[width*1.7,'#ffffff',9],[width,'#ef764f',10]]){
   const vertices=[];for(let i=1;i<route.coords.length;i++){const a=this.point(route.coords[i-1],7),b=this.point(route.coords[i],7),d=b.clone().sub(a);if(d.length()<.01)continue;const normal=new THREE.Vector3(-d.z,0,d.x).normalize().multiplyScalar(half);const a1=a.clone().add(normal),a2=a.clone().sub(normal),b1=b.clone().add(normal),b2=b.clone().sub(normal);for(const p of [a1,a2,b1,a2,b2,b1])vertices.push(p.x,p.y,p.z);}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));mesh.renderOrder=order;this.routeGroup.add(mesh);
  }
  this.marker(route.start.coords,'↗',`${route.start.name} · start${route.loop?' and finish':''}`,true);route.stops.forEach((p,i)=>this.marker(p.coords,String(i+1),p.name));this.fit(inset);
 }
 clearRoute(){for(const child of [...this.routeGroup.children]){child.geometry?.dispose();child.material?.dispose();this.routeGroup.remove(child);}this.markers.forEach(m=>m.button.remove());this.markers=[];}
 fit(inset=0){if(!this.config||!this.renderer)return;this.inset=inset;
  const coords=this.pendingRoute?.coords;const box=new THREE.Box3();if(coords)coords.forEach(c=>box.expandByPoint(this.point(c,0)));else if(this.startCoords){const p=this.point(this.startCoords,0);box.setFromCenterAndSize(p,new THREE.Vector3(2400,0,2400));}else box.setFromCenterAndSize(new THREE.Vector3(-250,0,0),new THREE.Vector3(3800,0,3800));
  const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const w=this.el.clientWidth,h=this.el.clientHeight;
  const visible=Math.max(.32,1-inset/h),span=Math.max(size.x,size.z,700);
  const direction=new THREE.Vector3(.55,-.85,-1).normalize(),right=new THREE.Vector3().crossVectors(direction,this.camera.up).normalize(),up=new THREE.Vector3().crossVectors(right,direction).normalize();
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const z of [box.min.z,box.max.z]){const p=new THREE.Vector3(x,0,z).sub(center),px=p.dot(right),py=p.dot(up);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
  const tan=Math.tan(THREE.MathUtils.degToRad(17.5));const distance=Math.max(1600,Math.max((maxX-minX)/(2*tan*this.camera.aspect),(maxY-minY)/(2*tan*visible))*(w<600?1.4:1.15)+span*.3);
  // Leave room below the route for the itinerary card.
  this.controls.target.copy(center);this.camera.position.copy(center).add(new THREE.Vector3(-.55,.85,1).normalize().multiplyScalar(Math.min(distance,17000)));this.controls.update();
  if(inset){const direction=new THREE.Vector3().subVectors(this.controls.target,this.camera.position).normalize();const right=new THREE.Vector3().crossVectors(direction,this.camera.up).normalize(),up=new THREE.Vector3().crossVectors(right,direction).normalize();const offset=up.multiplyScalar(-distance*Math.tan(THREE.MathUtils.degToRad(17.5))*inset/h);this.controls.target.add(offset);this.camera.position.add(offset);this.controls.update();}
  this.dirty=true;
 }
 setStart(coords){this.startCoords=coords;if(!this.pendingRoute)this.fit(0);}
 focusPoint(coords){if(!this.config)return;const point=this.point(coords,0),offset=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(1600);this.controls.target.copy(point);this.camera.position.copy(point).add(offset);this.controls.update();this.dirty=true;}
 focusStop(i){const p=i===0?this.pendingRoute?.start:this.pendingRoute?.stops[i-1];if(p)this.focusPoint(p.coords);}
 projectLabels(){const w=this.el.clientWidth,h=this.el.clientHeight;for(const marker of this.markers){const p=marker.position.clone().project(this.camera);marker.button.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1;marker.button.style.left=`${(p.x*.5+.5)*w}px`;marker.button.style.top=`${(-p.y*.5+.5)*h}px`;}}
 zoom(factor){if(!this.camera)return;this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.dirty=true;}
 rotate(){if(!this.camera)return;const d=this.camera.position.clone().sub(this.controls.target);d.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6);this.camera.position.copy(this.controls.target).add(d);this.controls.update();this.dirty=true;}
}
