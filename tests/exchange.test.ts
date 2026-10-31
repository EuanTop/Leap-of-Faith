import test from 'node:test';
import assert from 'node:assert/strict';
import {exchangeAt,EXCHANGE_CENTERS} from '../src/inverted/exchange.mjs';

test('two world crossings close at the scene loop and retain their identities',()=>{
 assert.equal(exchangeAt(2).activeDay,false);assert.equal(exchangeAt(16).activeDay,true);assert.equal(exchangeAt(28).activeDay,false);
 for(let t=0;t<28.8;t+=.013){const a=exchangeAt(t),b=exchangeAt(t+28.8);
  for(const key of ['daylight','height','pitch','duckFlap','swanFlap'] as const)assert.ok(Math.abs(a[key]-b[key])<1e-8);
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


test('the stronger forward impulse recovers gradually without reversing or jumping at the loop',()=>{
 let previous=exchangeAt(0).routeOffset;
 for(let time=.005;time<=28.8;time+=.005){const current=time+exchangeAt(time).routeOffset;assert.ok(current>previous,'forward momentum reverses');previous=current;}
 assert.ok(exchangeAt(12).routeOffset>2.8);
 assert.ok(Math.abs(exchangeAt(0).routeOffset-exchangeAt(28.8).routeOffset)<1e-9);
});
