import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {createDuck,poseDuck} from '../src/duck.ts';
import {createGhosts} from '../src/ghosts.ts';
import {story,DURATION} from '../src/story.ts';
import {BAY_TIMES,interactionTargets,interactionPose,reaction} from '../src/interactions.ts';

test('the posed duck actually reaches the cup, hanging cloth and drawer pull',()=>{
 const duck=createDuck(),targets=interactionTargets();
 BAY_TIMES.forEach((time,index)=>{
  poseDuck(duck,story(time),1,targets);
  const distance=duck.billTip.getWorldPosition(new Vector3()).distanceTo(targets[index]);
  assert.ok(distance<.22,`Bay ${index}: beak misses its prop by ${distance}`);
 });
});

test('prop reactions follow contact, settle, and respect zero expression',()=>{
 const contact=BAY_TIMES[0]+.04;
 assert.equal(reaction(contact-.10,contact),0);
 assert.ok(reaction(contact+.10,contact)>.4);
 assert.ok(Math.abs(reaction(contact+6,contact))<1e-6);
 assert.equal(interactionPose(BAY_TIMES[2],1).drawer,0);
 assert.ok(interactionPose(BAY_TIMES[2]+.6,1).drawer>.9);
 assert.equal(interactionPose(BAY_TIMES[2]+3.5,1).drawer,0);
 for(const center of BAY_TIMES){const pose=interactionPose(center+.5,0);assert.deepEqual(pose.weights,[0,0,0]);assert.equal(pose.drawer,0);assert.equal(pose.surprise,0);assert.equal(pose.cup,0);assert.equal(pose.cloth,0);}
});

test('actor poses and the giant watcher loop and repeat when scrubbing',()=>{
 const duck=createDuck(),targets=interactionTargets(),ghosts=createGhosts(new Scene());
 assert.equal(ghosts.population,1);assert.equal(ghosts.root.children.length,1);
 function snapshot(time:number,motion:number){
  poseDuck(duck,story(time),motion,targets);ghosts.update(story(time).t,duck.root.position,motion);
  return [duck.root.position.toArray(),duck.root.quaternion.toArray(),duck.neck.position.toArray(),duck.neck.quaternion.toArray(),
   ...duck.wings.map(w=>w.quaternion.toArray()),...ghosts.root.children.flatMap(g=>[g.position.toArray(),g.quaternion.toArray()]),
   ...ghosts.eyes.flatMap(eye=>[eye.pupil.position.toArray(),eye.pupil.quaternion.toArray()])].flat();
 }
 for(const motion of [0,.7,1,2])for(const time of [0,2.9,12.55,22.6]){
  const a=snapshot(time,motion),b=snapshot(time+DURATION,motion);
  a.forEach((x,i)=>assert.ok(Number.isFinite(x)&&Math.abs(x-b[i])<1e-8));
  snapshot(17.3,motion);assert.deepEqual(snapshot(time,motion),a);
 }
 const before=snapshot(DURATION-1/30,1),seam=snapshot(0,1),after=snapshot(1/30,1);
 const difference=(a:number[],b:number[])=>Math.sqrt(a.reduce((sum,x,i)=>sum+(x-b[i])**2,0));
 assert.ok(difference(before,seam)<difference(seam,after)*2+.1);
});
