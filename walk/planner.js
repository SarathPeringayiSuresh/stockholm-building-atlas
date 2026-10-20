// All route lengths and polylines follow the bundled OSM pedestrian graph.
export const SPEED = 75; // metres per minute, 4.5 km/h
export const STARTS = [
 {id:'gamla',name:'Gamla stan',coords:[59.3231,18.0676]},
 {id:'central',name:'Central station',coords:[59.3305,18.0583]},
 {id:'djurgarden',name:'Djurgårdsbron',coords:[59.3312,18.0943]},
 {id:'slussen',name:'Slussen',coords:[59.3200,18.0722]},
 {id:'ostermalm',name:'Östermalmstorg',coords:[59.3362,18.0785]},
 {id:'kungsholmen',name:'Rådhuset',coords:[59.3305,18.0422]},
 {id:'odenplan',name:'Odenplan',coords:[59.3428,18.0498]},
];
export function distance(a,b) {const r=Math.PI/180;const p=(a[0]+b[0])/2*r;return Math.hypot((a[0]-b[0])*111195,(a[1]-b[1])*111195*Math.cos(p));}
class Heap {
 constructor(){this.a=[];}
 push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p][0]<=v[0])break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const r=this.a[0],v=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1][0]<this.a[c][0])c++;if(this.a[c][0]>=v[0])break;this.a[i]=this.a[c];i=c;}this.a[i]=v;}return r;}
}
export function makeGraph(data){const adj=Array.from({length:data.nodes.length},()=>[]);for(const [a,b,m] of data.edges){adj[a].push([b,m]);adj[b].push([a,m]);}return {nodes:data.nodes,adj};}
export function shortestPaths(graph,start){const dist=new Float64Array(graph.nodes.length).fill(Infinity),prev=new Int32Array(graph.nodes.length).fill(-1),heap=new Heap();dist[start]=0;heap.push([0,start]);while(heap.a.length){const [d,u]=heap.pop();if(d>dist[u])continue;for(const [v,m] of graph.adj[u]){const nd=d+m;if(nd<dist[v]){dist[v]=nd;prev[v]=u;heap.push([nd,v]);}}}return {dist,prev};}
export function nearestNode(graph,coords){let id=-1,min=Infinity;graph.nodes.forEach((p,i)=>{const d=distance(p,coords);if(d<min){min=d;id=i;}});return {id,distance:min};}
export function pathNodes(tree,from,to){if(!Number.isFinite(tree.dist[to]))throw Error('These places are not connected by the available walking paths.');const result=[to];while(to!==from){to=tree.prev[to];if(to<0)throw Error('Walking path is incomplete.');result.push(to);}return result.reverse();}
export function mapsLinks(points){const links=[];for(let i=0;i<points.length-1;i+=4){const part=points.slice(i,i+5);const url=new URL('https://www.google.com/maps/dir/');url.searchParams.set('api','1');url.searchParams.set('travelmode','walking');url.searchParams.set('origin',part[0].coords.join(','));url.searchParams.set('destination',part.at(-1).coords.join(','));if(part.length>2)url.searchParams.set('waypoints',part.slice(1,-1).map(p=>p.coords.join(',')).join('|'));links.push({url:url.href,from:part[0].name,to:part.at(-1).name});}return links;}
function rng(seed){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
export function makePlanner(data,places){
 const graph=makeGraph(data),cache=new Map();
 const tree=id=>{if(!cache.has(id))cache.set(id,shortestPaths(graph,id));return cache.get(id);};
 const starts=STARTS.map(s=>({...s,node:nearestNode(graph,s.coords).id}));
 function plan({mood='mixed',minutes=60,count=4,startId='gamla',loop=true,seed=1}){
  if(!Number.isFinite(minutes)||minutes<30||minutes>180||!Number.isInteger(count)||count<2||count>8)throw Error('Choose 30–180 minutes and 2–8 stops.');
  const start=starts.find(s=>s.id===startId);if(!start)throw Error('Choose a starting point.');
  if(!['mixed','nature','architecture','waterfront'].includes(mood))throw Error('Choose a walking mood.');
  const startTree=tree(start.node),target=minutes*SPEED,random=rng(seed),types=new Set();
  const candidates=places.filter(p=>(mood==='mixed'||p.categories.includes(mood))&&Number.isFinite(startTree.dist[p.node])&&startTree.dist[p.node]>45&&startTree.dist[p.node]<target*(loop?.65:1.15)).map(p=>({...p,random:random()}));
  if(candidates.length<count)throw Error(`Not enough ${mood==='mixed'?'':mood+' '}stops near ${start.name} for this time. Try a longer walk or another starting point.`);
  // Restrict the search to local stops; public graph paths determine every cost.
  candidates.sort((a,b)=>startTree.dist[a.node]-startTree.dist[b.node]);
  const pool=candidates.slice(0,60),all=[start,...pool],matrix=all.map(p=>{const t=tree(p.node);return all.map(q=>t.dist[q.node]);});
  // Beam search explores ordered stop sets while tracking distance and diversity.
  let beam=[{seq:[],mask:0n,length:0,last:0,rank:0}];
  for(let step=0;step<count;step++){
   const expanded=[];const partialTarget=target*(step+1)/(count+(loop?1:0));
   for(const route of beam)for(let j=1;j<all.length;j++){
    const bit=1n<<BigInt(j);if(route.mask&bit)continue;
    const len=route.length+matrix[route.last][j];if(!Number.isFinite(len)||len>target*1.8)continue;
    const seq=[...route.seq,j],seen=new Set(seq.flatMap(i=>all[i].categories));
    const crowd=seq.slice(0,-1).some(i=>matrix[i][j]<90)?target*.07:0;
    const finalLen=len+(loop?matrix[j][0]:0);
    const rank=step===count-1?Math.abs(finalLen-target)+(mood==='mixed'?(3-seen.size)*target*.045:0)+crowd:Math.abs(len-partialTarget)+crowd+(mood==='mixed'?(3-seen.size)*target*.025:0);
    expanded.push({seq,mask:route.mask|bit,length:len,last:j,rank:rank+all[j].random*target*.006});
   }
   expanded.sort((a,b)=>a.rank-b.rank);
   const dedup=new Set();beam=[];
   for(const route of expanded){const k=route.mask+':'+route.last;if(dedup.has(k))continue;dedup.add(k);beam.push(route);if(beam.length>=90)break;}
   if(!beam.length)throw Error('No suitable connected route was found. Try more time or fewer stops.');
  }
  // Re-score to discourage repeated streets, while keeping the requested duration close.
  let best=null;
  for(const route of beam.slice(0,25)){
   const sequence=[0,...route.seq,...(loop?[0]:[])],coords=[],legs=[],used=new Set();let total=0,retrace=0;
   for(let i=1;i<sequence.length;i++){
    const a=all[sequence[i-1]],b=all[sequence[i]],t=tree(a.node),nodes=pathNodes(t,a.node,b.node);const metres=t.dist[b.node];
    legs.push({metres,minutes:metres/SPEED});total+=metres;
    for(let k=1;k<nodes.length;k++){const key=[nodes[k-1],nodes[k]].sort((a,b)=>a-b).join(':');if(used.has(key))retrace+=distance(graph.nodes[nodes[k-1]],graph.nodes[nodes[k]]);used.add(key);}
    coords.push(...nodes.slice(i===1?0:1).map(n=>graph.nodes[n]));
   }
   const categories=new Set(route.seq.flatMap(i=>all[i].categories));
   const score=Math.abs(total-target)+retrace*.22+(mood==='mixed'?(3-categories.size)*target*.045:0);
   if(!best||score<best.score)best={score,coords,legs,metres:total,minutes:total/SPEED,stops:route.seq.map(i=>all[i]),retrace,loop,start:{...start,coords:graph.nodes[start.node]},targetMinutes:minutes};
  }
  const ordered=[best.start,...best.stops.map(p=>({...p,coords:graph.nodes[p.node]})),...(loop?[best.start]:[])];
  best.links=mapsLinks(ordered);best.mood=mood;return best;
 }
 return {plan,graph,starts};
}
