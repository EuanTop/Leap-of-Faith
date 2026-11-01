import {duckPose,swimPosition} from './actors.ts';
import {EXCHANGE_CENTERS,exchangeAt} from './exchange.mjs';
import {DURATION} from '../story.ts';
// The ordinary trail has one surface clock, with no active-character/realm switch.
export function surfaceSample(birth:number){return duckPose(birth);}
export function emitsSurfaceTrail(birth:number){const ex=exchangeAt(birth);return !ex.transition&&Math.abs(ex.height)<.09;}
export function surfaceTrailFade(time:number,birth:number){
 let fade=1;
 for(const center of EXCHANGE_CENTERS){
  const base=center-1.65,takeoff=base+Math.floor((time-base)/DURATION)*DURATION;
  if(birth<=takeoff)fade*=Math.exp(-(time-takeoff)/.18);
 }
 return fade;
}
export function contactEvents(time:number){
 return EXCHANGE_CENTERS.flatMap((center,index)=>[
  {offset:-1.65,kind:'takeoff',outgoing:true,strength:.85},
  {offset:-.45,kind:'dive',outgoing:true,strength:1.15},
  {offset:-.45,kind:'emerge',outgoing:false,strength:1.},
  {offset:1.35,kind:'landing',outgoing:false,strength:1.20},
 ].map(({offset,kind,outgoing,strength})=>{
  const base=center+offset,birth=base+Math.floor((time-base)/DURATION)*DURATION;
  const owner=(index===0)===outgoing?'duck':'swan';
  const sample=swimPosition(birth,owner);return {birth,age:time-birth,position:sample.position,owner,kind,strength};
 }));
}
