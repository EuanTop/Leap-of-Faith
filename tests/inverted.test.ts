import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {gallery} from '../src/inverted/geometry.ts';
import {createArchitecture,GHOST_HOME} from '../src/inverted/architecture.ts';
import {createSwimmer,duckPose} from '../src/inverted/actors.ts';
import {DURATION} from '../src/story.ts';

test('curved galleries expose upward floors and downward undersides',()=>{
 const g=gallery(5,0,Math.PI,12,12,2,.4),n=g.attributes.normal!,p=g.attributes.position!;
 for(let i=4;i<156*4;i+=4){assert.ok(n.getY(i+2)>0,`floor faces inward at ${i}`);assert.ok(n.getY(i)<0,`underside faces inward at ${i}`);}
 for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(p.getX(i)+p.getY(i)+p.getZ(i)));
 g.dispose();
});

test('suspended architecture leaves open air above the entire duck route',()=>{
 const scene=new T.Scene(),house=createArchitecture(scene);house.root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(house.root);
 assert.ok(bounds.min.y>3,'no architectural solid should touch the lake');assert.ok(bounds.max.y>22);
 for(let i=0;i<360;i++){const a=duckPose(i/360*DURATION),b=duckPose(i/360*DURATION+DURATION);assert.ok(a.position.distanceTo(b.position)<1e-8);assert.ok(a.position.y<0);assert.ok(a.position.y+1.4<bounds.min.y);}
 assert.ok(GHOST_HOME.y>bounds.min.y&&GHOST_HOME.y<bounds.max.y);
});

test('the reused swimmer hides feet and closes its pose without a seam',()=>{
 const scene=new T.Scene(),duck=createSwimmer(scene);
 for(let t=0;t<DURATION;t+=.2){duck.update(t,1.6);duck.root.traverse(o=>{if(o instanceof T.Mesh)assert.ok(o.position.toArray().every(Number.isFinite));});assert.ok(duck.root.position.y<-.13);}
 const matrices=(time:number)=>{duck.update(time,1);duck.root.updateMatrixWorld(true);const a:number[][]=[];duck.root.traverse(o=>a.push(o.matrixWorld.elements.slice()));return a;};
 const a=matrices(.001),b=matrices(DURATION-.001);for(let i=0;i<a.length;i++)for(let j=0;j<16;j++)assert.ok(Math.abs(a[i]![j]!-b[i]![j]!)<.02);
 const feet=duck.root.children.filter(o=>!o.visible);assert.equal(feet.length,2);
});
