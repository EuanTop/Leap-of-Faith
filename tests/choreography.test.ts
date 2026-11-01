import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {castleCue,pigmentCue} from '../src/inverted/choreography.ts';
import {pigmentSource} from '../src/inverted/pigment.ts';
import {EXCHANGE_CENTERS,exchangeAt} from '../src/inverted/exchange.mjs';
import {createArchitecture} from '../src/inverted/architecture.ts';
import {createResident} from '../src/inverted/actors.ts';
import {createWorldRig} from '../src/inverted/world-rig.ts';

test('each hero apex precedes the architectural reaction, and both exchanges settle before the loop',()=>{
 EXCHANGE_CENTERS.forEach((center,index)=>{
  assert.equal(castleCue(center-1.10).q,index===0?0:1);
  assert.equal(castleCue(center+.18).q,index===0?0:1);
  assert.ok(castleCue(center+.85).active);
 });
 assert.equal(castleCue(28.7,.32).q,0);assert.equal(pigmentCue(28.7),0);
 for(let t=0;t<28.8;t+=.03){assert.ok(Math.abs(castleCue(t).q-castleCue(t+28.8).q)<1e-8);assert.ok(Math.abs(pigmentCue(t)-pigmentCue(t+28.8))<1e-8);}
});

test('the airborne hold slows forward travel while the dive accelerates without reversing',()=>{
 const speed=(t:number)=>1+(exchangeAt(t+.0005).routeOffset-exchangeAt(t-.0005).routeOffset)/.001;
 for(const center of EXCHANGE_CENTERS){
  assert.ok(speed(center-1.10)<.40);assert.ok(speed(center-1.10)>.15);
  assert.ok(speed(center-.40)>3);
  assert.ok(exchangeAt(center-1.30).height>.95&&exchangeAt(center-.95).height>1);
 }
});

test('material transport closes exactly and does not recolour the top before a pigment front arrives',()=>{
 for(let y=-1;y<=1;y+=.1)for(let x=-1;x<=1;x+=.1){
  const a=pigmentSource(x,y,0),b=pigmentSource(x,y,1);
  assert.ok(Math.hypot(a.x-x,a.y-y)<1e-6);assert.ok(Math.hypot(b.x+x,b.y+y)<1e-6);
  for(const q of [.2,.5,.8]){const p=pigmentSource(x,y,q);assert.ok(Number.isFinite(p.x+p.y));assert.ok(Math.abs(Math.max(Math.abs(p.x),Math.abs(p.y))-Math.max(Math.abs(x),Math.abs(y)))<1e-8);}
 }
 assert.ok(pigmentSource(0,1,.35).y>0);assert.ok(pigmentSource(0,-1,.35).y<0);
 assert.ok(pigmentSource(0,1,.75).y<0);
});

test('the resident reacts after its room starts and catches up instead of remaining in constant panic',()=>{
 const scene=new T.Scene(),house=createArchitecture(scene),ghost=createResident(scene),rig=createWorldRig(scene,house,ghost,false),target=new T.Vector3(6,0,28);
 rig.update(11.0,target,1);assert.equal(ghost.root.userData.panic,0);assert.ok(ghost.root.userData.followLag<1e-7);
 rig.update(13.3,target,1);assert.ok(ghost.root.userData.panic>.1);assert.ok(ghost.root.userData.followLag>.1&&ghost.root.userData.followLag<=.650001);
 rig.update(16,target,1);assert.equal(ghost.root.userData.panic,0);assert.ok(ghost.root.userData.followLag<1e-7);
});
