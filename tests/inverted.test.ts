import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {gallery} from '../src/inverted/geometry.ts';
import {createArchitecture,GHOST_HOME} from '../src/inverted/architecture.ts';
import {createSwimmer,createResident,duckPose} from '../src/inverted/actors.ts';
import {DURATION} from '../src/story.ts';
import {exchangeAt} from '../src/inverted/exchange.mjs';
import {createWorldRig} from '../src/inverted/world-rig.ts';

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
 for(let t=0;t<DURATION;t+=.2){duck.update(t,1.6);duck.root.traverse(o=>{if(o instanceof T.Mesh)assert.ok(o.position.toArray().every(Number.isFinite));});assert.ok(Math.abs(duck.root.position.y-(-.065*Math.cos(exchangeAt(t).actorAngle)+exchangeAt(t).duckHeight))<.04);}
 const matrices=(time:number)=>{duck.update(time,1);duck.root.updateMatrixWorld(true);const a:number[][]=[];duck.root.traverse(o=>a.push(o.matrixWorld.elements.slice()));return a;};
 const a=matrices(.001),b=matrices(DURATION-.001);for(let i=0;i<a.length;i++)for(let j=0;j<16;j++)assert.ok(Math.abs(a[i]![j]!-b[i]![j]!)<.02);
 const feet=duck.root.children.filter(o=>!o.visible);assert.equal(feet.length,2);
});

test('the gallery and three spires move independently, retain lake clearance and close the loop',()=>{
 const scene=new T.Scene(),house=createArchitecture(scene);
 const poses:number[][]=[];
 for(const motion of [0,.95,2])for(let i=0;i<=48;i++){
  const time=i/48*DURATION;house.update(time,motion);house.root.updateMatrixWorld(true);
  assert.ok(new T.Box3().setFromObject(house.root).min.y>2.3,'a moving spire enters the lake');
  for(const node of [house.ring,...house.spires])assert.ok(node.matrixWorld.elements.every(Number.isFinite));
 }
 house.update(0,.95);const first=[house.ring,...house.spires].map(o=>[...o.position.toArray(),...o.rotation.toArray().slice(0,3) as number[],...o.scale.toArray()]);
 house.update(DURATION,.95);[house.ring,...house.spires].forEach((o,i)=>{
  const end=[...o.position.toArray(),...o.rotation.toArray().slice(0,3) as number[],...o.scale.toArray()];end.forEach((x,j)=>assert.ok(Math.abs(x-first[i]![j]!)<1e-9));
 });
 for(const time of [0,DURATION/4,DURATION/2]){
  house.update(time,1);poses.push([house.ring.rotation.y,...house.spires.map(s=>s.rotation.z)]);
 }
 assert.ok(Math.abs(poses[0]![0]!-poses[1]![0]!)>.8);
 assert.ok(new Set(poses[0]!.slice(1).map(x=>x.toFixed(4))).size===3);
 house.update(4,0);for(const spire of house.spires){assert.equal(Math.abs(spire.position.y),0);assert.equal(Math.abs(spire.rotation.z),0);assert.equal(spire.scale.y,1);}
});


test('the actual architectural geometry crosses the water while its ghost and floor clipping remain attached',()=>{
 const scene=new T.Scene(),house=createArchitecture(scene),ghost=createResident(scene),rig=createWorldRig(scene,house,ghost,false);
 const target=new T.Vector3(6,0,28),point=new T.Vector3();
 rig.update(2,target,1);scene.updateMatrixWorld(true);house.home.getWorldPosition(point);assert.ok(point.y>6);
 const beginning=point.clone();
 rig.update(16,target,1);scene.updateMatrixWorld(true);house.home.getWorldPosition(point);assert.ok(point.y< -6);
 ghost.root.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshPhysicalMaterial){const head=ghost.root.getWorldPosition(new T.Vector3());assert.ok(o.material.clippingPlanes![0]!.distanceToPoint(head)>0);}});
 rig.update(2+28.8,target,1);scene.updateMatrixWorld(true);house.home.getWorldPosition(point);assert.ok(point.distanceTo(beginning)<1e-8);
});
