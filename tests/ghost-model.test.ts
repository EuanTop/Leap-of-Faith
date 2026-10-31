import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {createGhosts} from '../src/ghosts.ts';
import {ghostDistance,sleeveCurve,ghostGeometry} from '../src/ghost-model.ts';
import {displayPose} from '../src/display-motion.ts';
import {DURATION} from '../src/story.ts';

test('the crown is round, the curved sleeves connect, and both underarm gaps remain open',()=>{
 assert.ok(Math.abs(ghostDistance(0,2,0))<1e-6);
 assert.ok(Math.abs(ghostDistance(3,-4+Math.sqrt(27),0))<1e-6);
 assert.ok(ghostDistance(3,2,0)>.5);
 for(const sign of [-1,1]){
  const curve=sleeveCurve(sign);
  assert.ok(Math.abs(curve.getPoint(.5).x)>11.5);
  assert.ok(curve.getTangent(0).dot(curve.getTangent(1))<0);
  for(let i=0;i<=20;i++){const p=curve.getPoint(i/20);assert.ok(ghostDistance(p.x,p.y,p.z)<-.8);}
  assert.ok(ghostDistance(sign*7.4,-2,0)>.5);
 }
});

test('the entire upper head bends back, with finite normals on the connected mesh',()=>{
 const ghost=createGhosts(new Scene());ghost.update(3,new Vector3(0,10,0),1);
 const top=ghost.deform(new Vector3(0,2,0)),lower=ghost.deform(new Vector3(0,-20,4));
 assert.ok(top.z< -4,'The crown itself must bend back, not only the eye placement');
 assert.ok(top.distanceTo(new Vector3(0,2,0))>4);
 assert.ok(lower.distanceTo(new Vector3(0,-20,4))<.65);
 const geometry=ghostGeometry(),position=geometry.attributes.position,normal=geometry.attributes.normal;
 assert.ok(position.count>1000);
 for(let i=0;i<position.count;i++){
  assert.ok(Number.isFinite(position.getX(i)+position.getY(i)+position.getZ(i)));
  assert.ok(Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)<1e-5);
 }
});

test('the presentation turns through all 360 degrees',()=>{
 let total=0,previous=new Vector3(0,0,1).applyEuler(displayPose(0).rotation);
 for(let i=1;i<=120;i++){
  const current=new Vector3(0,0,1).applyEuler(displayPose(i/120*DURATION).rotation);
  total+=previous.angleTo(current);previous=current;
 }
 assert.ok(total>Math.PI*1.99&&total<Math.PI*2.02);
});
