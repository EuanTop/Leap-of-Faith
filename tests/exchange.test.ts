import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeAt,EXCHANGE_CENTERS} from '../src/inverted/exchange.mjs';
import {duckPose,swimPosition} from '../src/inverted/actors.ts';

test('two world crossings close at the scene loop and retain their identities',()=>{
 assert.equal(exchangeAt(2).activeDay,false);assert.equal(exchangeAt(16).activeDay,true);assert.equal(exchangeAt(28).activeDay,false);
 for(let t=0;t<28.8;t+=.013){const a=exchangeAt(t),b=exchangeAt(t+28.8);
  for(const key of ['daylight','height','pitch','flightTravel','duckFlap','swanFlap'] as const)assert.ok(Math.abs(a[key]-b[key])<1e-8);
  assert.equal(a.activeDay,b.activeDay);assert.ok(a.daylight>=0&&a.daylight<=1);
 }
});
test('each crossing has an airborne jump, full immersion and a smooth emergence',()=>{
 for(const t of EXCHANGE_CENTERS){assert.ok(exchangeAt(t-1.2).height>.9);assert.ok(exchangeAt(t+.15).height< -1.7);assert.ok(Math.abs(exchangeAt(t+1.35).height)<1e-9);
  assert.ok(exchangeAt(t-.3).height<0);assert.ok(exchangeAt(t+.5).height<0);assert.ok(exchangeAt(t).transition);
  let previous=exchangeAt(t-2).height;
  for(let u=t-1.999;u<t+1.5;u+=.001){const next=exchangeAt(u).height;assert.ok(Math.abs(next-previous)<.006);previous=next;}
 }
});
test('the two characters have separate wing gestures and a common exchange envelope',()=>{
 assert.ok(exchangeAt(3.4).duckFlap>.8);assert.equal(exchangeAt(3.4).swanFlap,0);
 assert.ok(exchangeAt(18.9).swanFlap>.8);assert.equal(exchangeAt(18.9).duckFlap,0);
 assert.equal(exchangeAt(12).direction,1);assert.equal(exchangeAt(26.4).direction,-1);
});


test('the slow-motion route advances without reversing or jumping at the loop',()=>{
 let previous=exchangeAt(0).routeOffset;
 for(let time=.005;time<=28.8;time+=.005){const current=time+exchangeAt(time).routeOffset;assert.ok(current>previous,'forward momentum reverses');previous=current;}
 assert.ok(Math.abs(exchangeAt(0).routeOffset-exchangeAt(28.8).routeOffset)<1e-9);
});

test('both swimmers keep the common route heading and do not weave across it',()=>{
 for(const center of EXCHANGE_CENTERS){
  for(let t=center-1.8;t<center+1.6;t+=.01)for(const kind of ['duck','swan'] as const){
   const a=swimPosition(t-.001,kind),b=swimPosition(t+.001,kind),base=duckPose(t);
   const forward=(b.position.x-a.position.x)*Math.sin(base.yaw)+(b.position.z-a.position.z)*Math.cos(base.yaw);
   assert.ok(forward>0,'a curved leap reverses along the shared route');
   assert.equal(swimPosition(t,kind).yaw,base.yaw);
   assert.ok(exchangeAt(t).separation>=0);
   assert.ok(swimPosition(t,kind).position.distanceTo(swimPosition(t+28.8,kind).position)<1e-8);
  }
 }
});

test('leaps travel forward through broad arcs without a pre-takeoff impulse',()=>{
 for(const center of EXCHANGE_CENTERS){
  const takeoff=duckPose(center-1.65),entry=duckPose(center-.45),landing=duckPose(center+1.35);
  assert.ok(takeoff.position.distanceTo(entry.position)>1.3);
  assert.ok(entry.position.distanceTo(landing.position)>2.8);
  assert.equal(exchangeAt(center-1.66).flightTravel,0);
  assert.ok(exchangeAt(center-1.64).flightTravel<.0001);
 }
 for(let t=0;t<28.8;t+=.01){
  const a=duckPose(t-.001),b=duckPose(t+.001),p=duckPose(t);
  const advance=(b.position.x-a.position.x)*Math.sin(p.yaw)+(b.position.z-a.position.z)*Math.cos(p.yaw);
  assert.ok(advance>0,'the longer arc or its recovery reverses a swimmer');
 }
});
