import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLake} from '../src/inverted/water.ts';
import {surfaceSample,contactEvents} from '../src/inverted/wake-field.ts';

test('an emitted wake retains its world-space anchor through the character exchange',()=>{
 const scene=new T.Scene(),lake=createLake(scene),birth=9.6;
 const find=(t:number)=>{lake.update(t,1,1);return lake.root.children.find(o=>o.visible&&Math.abs((o.userData.birth??-1)-birth)<1e-8)?.userData.surfaceCenter;};
 const a=find(11.2),b=find(12.3);assert.ok(a&&b);assert.deepEqual(a,b);assert.equal(lake.root.parent,scene);
 assert.ok(surfaceSample(birth).position.distanceTo(surfaceSample(birth+28.8).position)<1e-8);
});
test('entry and emergence rings retain their contact point instead of following either bird',()=>{
 const a=contactEvents(12.9),b=contactEvents(13.4);
 for(let i=0;i<a.length;i++)if(Math.abs(a[i]!.birth-b[i]!.birth)<1e-8){assert.ok(a[i]!.position.distanceTo(b[i]!.position)<1e-8);assert.equal(a[i]!.owner,b[i]!.owner);}
 assert.notEqual(a[0]!.owner,a[1]!.owner);
});
