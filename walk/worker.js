import {makePlanner} from './planner.js';
let planner;
self.onmessage=async ({data})=>{
 try {
  if(data.type==='init'){
   const [graph,places]=await Promise.all(['data/graph.json','data/places.json'].map(async p=>{const r=await fetch(new URL(p,import.meta.url));if(!r.ok)throw Error('Walking data could not be loaded. Reload to try again.');return r.json();}));
   planner=makePlanner(graph,places.places);postMessage({type:'ready',places:places.places,meta:places.meta});
  } else if(data.type==='plan'){
   if(!planner)throw Error('Walking paths are still loading.');
   postMessage({type:'route',id:data.id,route:planner.plan(data.options)});
  }
 } catch(error){postMessage({type:'error',id:data.id,message:error.message});}
};
