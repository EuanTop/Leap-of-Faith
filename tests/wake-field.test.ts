import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLake} from '../src/inverted/water.ts';
import {surfaceSample,contactEvents,surfaceTrailFade} from '../src/inverted/wake-field.ts';
import {exchangeAt} from '../src/inverted/exchange.mjs';

test('an emitted wake retains its world-space anchor through the character exchange',()=>{
 const scene=new T.Scene(),lake=createLake(scene),birth=9.6;
 const find=(t:number)=>{lake.update(t,1,1);return lake.root.children.find(o=>o.visible&&Math.abs((o.userData.birth??-1)-birth)<1e-8)?.userData.surfaceCenter;};
 const a=find(10.4),b=find(10.7);assert.ok(a&&b);assert.deepEqual(a,b);assert.equal(lake.root.parent,scene);
 assert.ok(surfaceSample(birth).position.distanceTo(surfaceSample(birth+28.8).position)<1e-8);
});

test('old swimming trails dissolve quickly after takeoff without fading newly emitted trails',()=>{
 assert.equal(surfaceTrailFade(10.30,9.6),1);
 assert.ok(surfaceTrailFade(10.95,9.6)<.04);
 assert.equal(surfaceTrailFade(14.0,13.9),1);
 assert.ok(Math.abs(surfaceTrailFade(10.95,9.6)-surfaceTrailFade(10.95+28.8,9.6+28.8))<1e-8);
});
test('entry and emergence rings retain their contact point instead of following either bird',()=>{
 const a=contactEvents(12.9),b=contactEvents(13.4);
 for(let i=0;i<a.length;i++)if(Math.abs(a[i]!.birth-b[i]!.birth)<1e-8){assert.ok(a[i]!.position.distanceTo(b[i]!.position)<1e-8);assert.equal(a[i]!.owner,b[i]!.owner);}
 assert.equal(a.length,8);
 assert.deepEqual(a.slice(0,4).map(e=>[e.kind,e.owner]),[['takeoff','duck'],['dive','duck'],['emerge','swan'],['landing','swan']]);
});

test('jump rings are emitted at the actual water crossings and loop with the scene',()=>{
 for(const event of contactEvents(28.7)){
  const ex=exchangeAt(event.birth);
  assert.ok(Math.abs(event.owner==='duck'?ex.duckHeight:ex.swanHeight)<1e-8);
 }
 const a=contactEvents(12.9),b=contactEvents(12.9+28.8);
 a.forEach((event,i)=>{assert.ok(event.position.distanceTo(b[i]!.position)<1e-8);assert.ok(Math.abs(event.age-b[i]!.age)<1e-8);});
});
