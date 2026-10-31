import {DURATION,smooth} from './story.ts';
import {PODS,habitatArcAt} from './habitat-path.ts';
import {Vector3} from 'three';
import {habitatFrame} from './habitat-path.ts';

export const BAY_TIMES=PODS.map(t=>habitatArcAt(t)*DURATION);
export const LOCAL_TARGETS=[new Vector3(1.25,1.13,.82),new Vector3(-1.03,1.45,.52),new Vector3(1.22,.67,.55)];
export function interactionTargets(){return LOCAL_TARGETS.map((v,i)=>{const f=habitatFrame(PODS[i]);return v.clone().applyQuaternion(f.quaternion).add(f.floor)})}
export function relativeTime(time:number,center:number){const d=time-center;return d-Math.round(d/DURATION)*DURATION;}
const reach=(t:number)=>smooth((t+1.35)/.75)*(1-smooth((t-.30)/.85));
export function reaction(time:number,contact:number,frequency=15,decay=2.8){
 const age=relativeTime(time,contact);return age<0?0:Math.sin(age*frequency)*Math.exp(-age*decay)*smooth(age/.045);
}
export function interactionPose(time:number,motion=1){
 const ages=BAY_TIMES.map(center=>relativeTime(time,center));
 const strength=Math.min(motion,1.5);
 const weights=ages.map(age=>reach(age)*strength);
 const active=weights.indexOf(Math.max(...weights));
 const cup=Math.max(0,reaction(time,BAY_TIMES[0]+.04,13,2.3))*strength;
 const cloth=Math.max(0,reaction(time,BAY_TIMES[1]+.02,7,1.5))*strength;
 const drawer=smooth((ages[2]-.12)/.32)*(1-smooth((ages[2]-2.1)/1.25))*strength;
 const surprise=Math.exp(-Math.pow((ages[2]-.53)/.24,2))*strength;
 return {ages,weights,active:Math.max(...weights)>.001?active:-1,
  side:(weights[0]*.12+weights[1]*.06+weights[2]*.14),
  crouch:weights[2]*.25,cup,cloth,drawer,surprise};
}
