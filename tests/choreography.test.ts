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

test('leaps retain a regular clock, rounded apices and forward motion throughout the air',()=>{
 const speed=(t:number)=>1+(exchangeAt(t+.0005).routeOffset-exchangeAt(t-.0005).routeOffset)/.001;
 for(const center of EXCHANGE_CENTERS){
  for(let d=-2.5;d<1.6;d+=.02)assert.ok(Math.abs(speed(center+d)-1)<1e-8,'the scene clock slows or accelerates');
  const slope=(d:number)=>(exchangeAt(center+d+.0001).height-exchangeAt(center+d-.0001).height)/.0002;
  assert.ok(slope(-1.20)>.2&&slope(-.96)<-.2,'the outgoing apex contains a hold');
  assert.ok(slope(.06)<-.2&&slope(.30)>.2,'the emerging apex contains a hold');
  const before=exchangeAt(center-1.20),after=exchangeAt(center-.96);
  assert.ok(before.pitch*before.direction<0&&after.pitch*after.direction>0,'body pitch must follow the arc in either world');
  assert.ok(Math.abs(slope(-.45)+3)<.01,'diving velocity must continue through the surface');
  const travelSpeed=(d:number)=>(exchangeAt(center+d+.0001).flightTravel-exchangeAt(center+d-.0001).flightTravel)/.0002;
  assert.ok(travelSpeed(-1.1)>.8);
  assert.ok(Math.abs(travelSpeed(-1.1)-travelSpeed(.18))<1e-7,'horizontal glide pauses at the apex');
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
