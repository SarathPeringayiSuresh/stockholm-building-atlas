import {STARTS} from './planner.js';
const $=s=>document.querySelector(s),form=$('#planner-form'),status=$('#form-status'),generate=$('#generate');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let map,poiLayer,routeLayer,currentRoute,markers=[],requestId=0,seed=0,ready=false;
const titles={mixed:'A little bit of Stockholm',architecture:'Stories written in stone',nature:'A little room to breathe',waterfront:'Where the city meets water'};
function setStatus(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function setBusy(busy){form.classList.toggle('loading',busy);for(const el of form.querySelectorAll('input,select,button'))el.disabled=busy;$('#minus').disabled=busy||Number($('#stops').value)===2;$('#plus').disabled=busy||Number($('#stops').value)===8;generate.disabled=busy||!ready;generate.firstElementChild.textContent=busy?'Finding your scenic way…':currentRoute?'Create another walk':'Create my walk';}
function fit(){if(!map)return;if(currentRoute){map.fitBounds(L.latLngBounds(currentRoute.coords),{paddingTopLeft:[40,80],paddingBottomRight:[40,$('#route-card').hidden?40:Math.min($('#route-card').offsetHeight+60,map.getSize().y*.63)],maxZoom:16,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});}else map.setView([59.3275,18.079],13);}
function initMap(){
 if(!window.L){setStatus('The map library could not load. Please reload the page.',true);return;}
 map=L.map('map',{zoomControl:false,minZoom:11,maxZoom:19,scrollWheelZoom:false}).setView([59.3275,18.079],13);
 // Public raster basemap; route generation itself uses the bundled OSM graph.
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
 L.control.zoom({position:'topright'}).addTo(map);poiLayer=L.layerGroup().addTo(map);routeLayer=L.layerGroup().addTo(map);
 map.on('click',()=>map.scrollWheelZoom.enable());
}
function showPois(places){if(!map)return;for(const p of places){const category=p.categories.includes('architecture')?'architecture':p.categories.includes('waterfront')?'waterfront':'nature';L.marker(p.coords,{icon:L.divIcon({className:`place-marker ${category}`,iconSize:[9,9],iconAnchor:[4,4]})}).bindTooltip(p.name,{direction:'top'}).addTo(poiLayer);}}
function focusStop(i){const marker=markers[i];if(marker){map.panTo(marker.getLatLng());marker.openPopup();}}
function showRoute(route){
 currentRoute=route;$('#map-caption').hidden=true;$('#map-bottom-note').hidden=true;$('#route-card').hidden=false;
 $('#route-title').textContent=titles[route.mood];$('#route-distance').textContent=(route.metres/1000).toFixed(1);$('#route-time').textContent=Math.round(route.minutes);$('#route-stops').textContent=route.stops.length;$('#route-shape').textContent=route.loop?'↺':'↗';$('#route-shape-label').textContent=route.loop?'round trip':'one way';
 const diff=Math.round(route.minutes)-route.targetMinutes;
 $('#route-note').textContent=`Starts ${route.start.name}${route.loop?' · returns to the same place':''}. ${Math.abs(diff)>10?`Closest match: ${Math.abs(diff)} min ${diff>0?'longer':'shorter'} than requested. `:''}Allow extra time for stops.${route.retrace/route.metres>.25?' Some paths are retraced.':''}`;
 $('#itinerary').replaceChildren();
 route.stops.forEach((p,i)=>{const li=document.createElement('li');li.innerHTML=`<span class="stop-number">${i+1}</span><div class="stop-description"><button class="stop-name" type="button">${escape(p.name)}</button><p>${escape(p.description)}</p><a href="${escape(p.source)}" target="_blank" rel="noopener">Place source ↗</a></div><span class="leg-time">${Math.max(1,Math.round(route.legs[i].minutes))} min walk</span>`;li.querySelector('button').onclick=()=>focusStop(i+1);$('#itinerary').append(li);});
 if(route.loop){const li=document.createElement('li');li.innerHTML=`<span class="stop-number">↺</span><div class="stop-description"><span class="stop-name">Back to ${escape(route.start.name)}</span><p>Your walk comes full circle.</p></div><span class="leg-time">${Math.round(route.legs.at(-1).minutes)} min walk</span>`;$('#itinerary').append(li);}
 $('#maps-links').replaceChildren();route.links.forEach((link,i)=>{const a=document.createElement('a');a.href=link.url;a.target='_blank';a.rel='noopener';a.innerHTML=`${route.links.length===1?'Open walk in Google Maps':`Google Maps · part ${i+1}`}<span>↗</span>`;a.setAttribute('aria-label',`Open ${route.links.length>1?'part '+(i+1)+' of '+route.links.length+' in ':''}Google Maps: ${link.from} to ${link.to}`);$('#maps-links').append(a);});
 if(map){routeLayer.clearLayers();poiLayer.remove();L.polyline(route.coords,{color:'#fff',weight:9,opacity:.85,lineJoin:'round'}).addTo(routeLayer);L.polyline(route.coords,{color:'#e5724b',weight:4,opacity:1,lineJoin:'round'}).addTo(routeLayer);
 markers=[route.start,...route.stops].map((p,i)=>{const m=L.marker(p.coords,{icon:L.divIcon({className:'route-marker'+(!i?' start':''),html:i?String(i):'↗',iconSize:[29,29],iconAnchor:[14,14]}),zIndexOffset:1000}).bindPopup(`<strong>${escape(p.name)}</strong><br><small>${i?'Stop '+i:'Start'+(route.loop?' & finish':'')}</small>`).addTo(routeLayer);return m;});fit();}
 setStatus('Your walk is ready. Take it at your own pace.');if(innerWidth<=720){$('.map-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
}
$('#duration').addEventListener('input',e=>{$('#duration-output').innerHTML=`${Number(e.target.value)} <span>min</span>`;markChanged();});
function changeStops(delta){const n=Math.max(2,Math.min(8,Number($('#stops').value)+delta));$('#stops').value=n;$('#stops-output').textContent=n;$('#minus').disabled=n===2;$('#plus').disabled=n===8;markChanged();}
$('#minus').onclick=()=>changeStops(-1);$('#plus').onclick=()=>changeStops(1);
function markChanged(){if(currentRoute)setStatus('Settings changed. Create a new walk to apply them.');}
form.addEventListener('change',markChanged);$('#fit').onclick=fit;
$('#close-route').onclick=()=>{$('#route-card').hidden=true;fit();setStatus('Your route is still on the map. Create another walk to change it.');};
$('#about-open').onclick=()=>$('#about').showModal();$('#about-close').onclick=()=>$('#about').close();$('#about').addEventListener('click',e=>{if(e.target===$('#about')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
initMap();
let worker;
try{worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.postMessage({type:'init'});}catch(e){setStatus('The route planner could not start. Please use a current browser and reload.',true);}
if(worker){worker.onmessage=({data})=>{if(data.type==='ready'){ready=true;setBusy(false);showPois(data.places);$('#data-detail').textContent=`${data.places.length} outdoor stops · ${data.meta.nodes.toLocaleString()} mapped path points · OpenStreetMap snapshot ${data.meta.date}. Central Stockholm coverage.`;setStatus('No account needed. Just a pair of comfortable shoes.');}else if(data.type==='route'&&data.id===requestId){showRoute(data.route);setBusy(false);}else if(data.type==='error'&&(data.id===undefined||data.id===requestId)){setBusy(false);setStatus(data.message,true);}};worker.onerror=()=>{ready=false;setBusy(false);setStatus('The route planner could not load. Reload the page to try again.',true);};}
form.addEventListener('submit',e=>{e.preventDefault();if(!ready)return;const options={mood:new FormData(form).get('mood'),minutes:Number($('#duration').value),count:Number($('#stops').value),startId:$('#start').value,loop:$('#loop').checked,seed:++seed};setBusy(true);setStatus('Connecting places along real walking paths…');worker.postMessage({type:'plan',id:++requestId,options});});
