// Mobile scrolling is the default. Map gestures are an explicit, reversible mode.
export function initMobileMapNavigation(map){
 const media=matchMedia('(max-width: 720px)'),panel=document.querySelector('.map-panel'),nav=document.querySelector('#mobile-map-nav'),toggle=document.querySelector('#map-interaction');
 let exploring=false,frame=0;
 function setExploring(value){
  exploring=media.matches&&value;
  map?.setInteraction(!media.matches||exploring);
  toggle.setAttribute('aria-pressed',String(exploring));toggle.textContent=exploring?'Done exploring':'Explore map';
  document.body.classList.toggle('exploring-map',exploring);
 }
 function visibility(){
  frame=0;const rect=panel.getBoundingClientRect(),overlap=Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0);
  nav.hidden=!media.matches||overlap<Math.min(160,innerHeight*.25);
  if(nav.hidden&&exploring)setExploring(false);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(visibility);}
 toggle.addEventListener('click',()=>setExploring(!exploring));
 document.querySelector('#back-to-planner').addEventListener('click',async()=>{
  setExploring(false);
  // Also handle a browser/native fullscreen session, if one is active.
  if(document.fullscreenElement&&document.exitFullscreen){try{await document.exitFullscreen();}catch{/* Scrolling back still works if the browser declines. */}}
  document.querySelector('.planner').scrollIntoView({behavior:'instant',block:'start'});
  document.querySelector('#planner-heading').focus({preventScroll:true});visibility();
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&exploring)setExploring(false);});
 media.addEventListener('change',()=>{setExploring(false);visibility();});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 setExploring(false);visibility();
}
