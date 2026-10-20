import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeGraph,shortestPaths,pathNodes,mapsLinks,makePlanner,SPEED} from '../planner.js';
const graphData=JSON.parse(fs.readFileSync(new URL('../data/graph.json',import.meta.url)));
const placesData=JSON.parse(fs.readFileSync(new URL('../data/places.json',import.meta.url)));
const planner=makePlanner(graphData,placesData.places);
test('shortest path takes connected bridge edges rather than a straight-line shortcut',()=>{
 const g=makeGraph({nodes:[[0,0],[0,1],[1,1],[1,0]],edges:[[0,1,100],[1,2,50],[2,3,100]]});
 const t=shortestPaths(g,0);assert.equal(t.dist[3],250);assert.deepEqual(pathNodes(t,0,3),[0,1,2,3]);
});
test('disconnected destinations are rejected',()=>{
 const g=makeGraph({nodes:[[0,0],[0,1]],edges:[]});assert.throws(()=>pathNodes(shortestPaths(g,0),0,1),/not connected/);
});
test('Google links preserve every stop, loop endpoint and mobile waypoint limit',()=>{
 for(let count=2;count<=8;count++){
 const points=Array.from({length:count+1},(_,i)=>({name:`Stop ${i}`,coords:[59.32+i*.001,18.07]}));points.push(points[0]);
 const links=mapsLinks(points),recovered=[];
 links.forEach((l,i)=>{const u=new URL(l.url);assert.equal(u.searchParams.get('api'),'1');assert.equal(u.searchParams.get('travelmode'),'walking');const middle=u.searchParams.get('waypoints')?.split('|')||[];assert.ok(middle.length<=3);assert.ok(l.url.length<2048);if(!i)recovered.push(u.searchParams.get('origin'));else assert.equal(u.searchParams.get('origin'),recovered.at(-1));recovered.push(...middle,u.searchParams.get('destination'));});
 assert.deepEqual(recovered,points.map(p=>p.coords.join(',')));
 }
});
test('source data has valid graph references and source links',()=>{
 assert.ok(graphData.nodes.length>1000);assert.ok(placesData.places.length>30);
 assert.equal(new Set(placesData.places.map(p=>p.id)).size,placesData.places.length);
 for(const p of placesData.places){assert.deepEqual(p.coords,graphData.nodes[p.node]);assert.ok(p.source.startsWith('https://'));}
 for(const [a,b,m] of graphData.edges){assert.ok(graphData.nodes[a]&&graphData.nodes[b]);assert.ok(m>0);}
});
for(const mood of ['mixed','architecture','nature','waterfront']){
 test(`real ${mood} route contains exact unique stops and continuous paths`,()=>{
 const route=planner.plan({mood,minutes:90,count:4,startId:'gamla',loop:true,seed:2});
 assert.equal(route.stops.length,4);assert.equal(new Set(route.stops.map(p=>p.id)).size,4);
 assert.deepEqual(route.coords[0],route.coords.at(-1));assert.equal(route.legs.length,5);
 assert.ok(route.metres>0);assert.equal(route.minutes,route.metres/SPEED);
 if(mood!=='mixed')assert.ok(route.stops.every(p=>p.categories.includes(mood)));
 const coordIndex=new Map(graphData.nodes.map((p,i)=>[p.join(','),i]));
 const edges=new Set(graphData.edges.map(([a,b])=>[a,b].sort((a,b)=>a-b).join(':')));
 for(let i=1;i<route.coords.length;i++){const a=coordIndex.get(route.coords[i-1].join(',')),b=coordIndex.get(route.coords[i].join(','));assert.ok(a===b||edges.has([a,b].sort((a,b)=>a-b).join(':')),'route must follow a mapped edge');}
 });
}
test('one-way route does not add a return leg',()=>{
 const route=planner.plan({mood:'mixed',minutes:60,count:3,startId:'djurgarden',loop:false,seed:1});assert.equal(route.legs.length,3);assert.notDeepEqual(route.coords[0],route.coords.at(-1));
});
test('unreasonable input is rejected explicitly',()=>{
 assert.throws(()=>planner.plan({minutes:1}),/30–180/);assert.throws(()=>planner.plan({count:9}),/2–8/);assert.throws(()=>planner.plan({startId:'unknown'}),/starting/);
});
