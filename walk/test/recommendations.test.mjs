import test from 'node:test';
import assert from 'node:assert/strict';
import {recommend,RECOMMENDATIONS} from '../recommendations.js';
import {STARTS} from '../planner.js';
test('every mood automatically selects an existing Stockholm start',()=>{
 for(const mood of ['mixed','architecture','nature','waterfront']){
  const r=recommend(mood);assert.ok(STARTS.some(s=>s.id===r.startId));assert.ok(r.name&&r.reason);assert.equal(r,RECOMMENDATIONS[mood]);
 }
 assert.equal(recommend('architecture').startId,'gamla');assert.equal(recommend('nature').startId,'djurgarden');assert.equal(recommend('waterfront').startId,'slussen');
});
test('unknown moods have a safe default recommendation',()=>assert.equal(recommend('unknown'),RECOMMENDATIONS.mixed));
