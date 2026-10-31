import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,Vector3,PerspectiveCamera,MathUtils} from 'three';
import {applyDisplayPose,DISPLAY_PIVOT,SUPPORT_POINTS,clothHoldTargets,reachAtPhase} from '../src/display-motion.ts';
import {DURATION,story} from '../src/story.ts';
import {createDuck,poseDuck} from '../src/duck.ts';
import {createGhosts} from '../src/ghosts.ts';
import {BAY_TIMES,interactionTargets} from '../src/interactions.ts';

test('the rotating habitat preserves the duck-to-prop contacts in world coordinates',()=>{
 const display=new Group(),content=new Group(),duck=createDuck(),targets=interactionTargets();
 display.add(content);content.position.copy(DISPLAY_PIVOT).negate();content.add(duck.root);
 for(const [index,time] of BAY_TIMES.entries())for(const offset of [0,DURATION]){
  applyDisplayPose(display,time+offset);poseDuck(duck,story(time+offset),1,targets);
  display.updateMatrixWorld(true);
  const beak=duck.billTip.getWorldPosition(new Vector3()),prop=content.localToWorld(targets[index].clone());
  assert.ok(beak.distanceTo(prop)<.22);
 }
});

test('the sheet cradles the presentation from below and closes its loop',()=>{
 const display=new Group(),content=new Group(),ghosts=createGhosts(new Scene());display.add(content);content.position.copy(DISPLAY_PIVOT).negate();
 function sample(time:number){
  applyDisplayPose(display,time);const supports=SUPPORT_POINTS.map(p=>content.localToWorld(p.clone()));
  const duck=content.localToWorld(story(time).floor.clone());ghosts.update(time,duck,1,supports);
  ghosts.arms.forEach((arm,i)=>assert.ok(arm.tip.distanceTo(clothHoldTargets(supports,time)[i])<1e-8));
  return [...display.matrixWorld.elements,...ghosts.root.children[0].quaternion.toArray(),...ghosts.eyes.flatMap(eye=>eye.pupil.position.toArray())];
 }
 for(let i=0;i<120;i++){
  const a=sample(i/120*DURATION),b=sample(i/120*DURATION+DURATION);
  a.forEach((value,j)=>assert.ok(Number.isFinite(value)&&Math.abs(value-b[j])<1e-8));
 }
 const before=sample(DURATION-1/30),start=sample(0),after=sample(1/30);
 const diff=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
 assert.ok(diff(before,start)<2*diff(start,after)+.01);
 assert.ok(diff(sample(7.2),sample(21.6))>1);
});

test('the cradling cloth stays low and stable through the complete turn',()=>{
 const camera=new PerspectiveCamera(38,.75,.1,180),aim=new Vector3(0,.9,0);
 camera.position.setFromSphericalCoords(56,MathUtils.degToRad(56),MathUtils.degToRad(28)).add(aim);camera.lookAt(aim);camera.updateMatrixWorld();
 const display=new Group(),content=new Group();display.add(content);content.position.copy(DISPLAY_PIVOT).negate();
 for(let i=0;i<96;i++){
  const t=i/96*DURATION;applyDisplayPose(display,t);
  const old=SUPPORT_POINTS.map(p=>content.localToWorld(p.clone())),lowered=clothHoldTargets(old,t);
  lowered.forEach(p=>{const y=(1-p.clone().project(camera).y)*800;assert.ok(y>840&&y<1020)});
 }
});


test('the hands alternate reaching with a visible lift and inward movement',()=>{
 for(let i=0;i<240;i++){
  const phase=i/240*Math.PI*2,left=reachAtPhase(phase,0),right=reachAtPhase(phase,1);
  assert.ok(left+right<=1.000001);
 }
 const time=.6/3/(Math.PI*2)*DURATION;
 const moving=clothHoldTargets(SUPPORT_POINTS,time,1),still=clothHoldTargets(SUPPORT_POINTS,time,0);
 assert.ok(moving[0].y-still[0].y>.9);
 assert.ok(moving[0].distanceTo(still[0])>1.1);
 assert.ok(Math.abs(moving[1].y-still[1].y)<.2);
});
