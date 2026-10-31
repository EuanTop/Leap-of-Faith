import * as THREE from 'three';
import {DURATION,TAU,wrap} from './story.ts';
import {habitatFrame} from './habitat-path.ts';

export const DISPLAY_PIVOT=new THREE.Vector3(0,6.9,0);
// A full turn presents all three living bays, with gentle counter-tilt. Every component,
// including the duck, its interaction targets and the glass lights, shares it.
export function displayPose(time:number,motion=1){
 const phase=wrap(time)/DURATION*TAU,m=Math.min(motion,1.5);
 return {rotation:new THREE.Euler(.045*Math.sin(phase*2)*m,phase,.025*Math.sin(phase)*m,'YXZ'),
  lift:.16*Math.sin(phase*2)*m};
}
export function applyDisplayPose(group:THREE.Group,time:number,motion=1){
 const pose=displayPose(time,motion);group.position.copy(DISPLAY_PIVOT);group.position.y+=pose.lift;group.rotation.copy(pose.rotation);group.updateMatrixWorld(true);
}
export const SUPPORT_POINTS=[.25,11/12].map(t=>{const f=habitatFrame(t);return f.center.clone().addScaledVector(f.up,-f.radius-.03)});

// The fabric cradles the rotating object from the foreground. Back-side keel
// points guide only a small sideways response; they must not pull the sheet
// through the building or turn it into a stretched tether.
export function reachAtPhase(phase:number,index:number){return Math.pow(.5+.5*Math.cos(phase*3-.6+index*Math.PI),4)}
export function clothHoldTargets(supports:THREE.Vector3[],time:number,motion=1){
 const angle=THREE.MathUtils.degToRad(28),side=new THREE.Vector3(Math.cos(angle),0,-Math.sin(angle)),forward=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
 const phase=wrap(time)/DURATION*TAU,m=Math.min(motion,1.5);
 return supports.map((p,i)=>{
  const sign=i===0?-1:1,reach=reachAtPhase(phase,i)*m;
  const lateral=sign*(9.1+THREE.MathUtils.clamp(Math.abs(p.dot(side))-6,-3,3)*.055*m-.65*reach+.22*Math.sin(phase*2+sign*.65)*m);
  return side.clone().multiplyScalar(lateral).addScaledVector(forward,4.5-.80*reach).setY(.45+.16*Math.sin(phase*2)*m+.95*reach);
 });
}
