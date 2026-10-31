export const DURATION=28.8;
export const TAU=Math.PI*2;
export const wrap=(t:number)=>((t%DURATION)+DURATION)%DURATION;
export const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
export {habitatFrame,habitatCurve} from './habitat-path.ts';
import {habitatFrame,habitatCurve,habitatArcAt,PODS} from './habitat-path.ts';
export const PACE_CENTER=habitatArcAt(PODS[0]);
export const PACE_AMOUNT=.034;
// Ease past each inhabited bay, then recover time in the empty connecting runs.
// The derivative stays positive, so there are no stops, reversals or phase jumps.
export function routeArcAt(clock:number){return ((clock-PACE_AMOUNT*Math.sin(TAU*3*(clock-PACE_CENTER)))%1+1)%1;}
export function clockAtArc(arc:number){let u=arc;for(let i=0;i<7;i++){const a=TAU*3*(u-PACE_CENTER);u-=(u-PACE_AMOUNT*Math.sin(a)-arc)/(1-PACE_AMOUNT*TAU*3*Math.cos(a));}return (u%1+1)%1;}
export function story(time:number){const t=wrap(time),u=t/DURATION,routeU=routeArcAt(u),param=habitatCurve.getUtoTmapping(routeU,0),frame=habitatFrame(param);return {t,u,routeU,param,...frame,x:frame.floor.x,y:frame.floor.y,z:frame.floor.z,swim:1,beat:t/.6};}
export type ArtState={time:number;paused:boolean;motion:number;river:number;trail:number;palette:'violet'|'ultraviolet'|'nocturne';cameraTilt:number;cameraFov:number;aspect:'3:4'|'9:16'|'16:9';music:boolean;volume:number;postStyle:'original'|'prism'|'film'|'etching';postStrength:number};
export const DEFAULTS:ArtState={time:0,paused:false,motion:.95,river:.9,trail:1.35,palette:'nocturne',cameraTilt:40,cameraFov:35,aspect:'3:4',music:true,volume:.8,postStyle:'etching',postStrength:.45};
export const FRAME_FORMATS={
 '3:4':{image:[1440,1920],video:[2880,3840],profile:'portrait-4k'},
 '9:16':{image:[1080,1920],video:[2160,3840],profile:'story-4k'},
 '16:9':{image:[1920,1080],video:[3840,2160],profile:'landscape-4k'},
} as const;
