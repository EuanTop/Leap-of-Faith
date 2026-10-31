import {duckPose,swimPosition} from './actors.ts';
import {EXCHANGE_CENTERS,exchangeAt} from './exchange.mjs';
import {DURATION} from '../story.ts';
// The ordinary trail has one surface clock, with no active-character/realm switch.
export function surfaceSample(birth:number){return duckPose(birth);}
export function emitsSurfaceTrail(birth:number){const ex=exchangeAt(birth);return !ex.transition&&Math.abs(ex.height)<.09;}
export function contactEvents(time:number){
 return EXCHANGE_CENTERS.flatMap((center,index)=>[-.45,.80].map((offset,event)=>{
  const base=center+offset,birth=base+Math.floor((time-base)/DURATION)*DURATION;
  const owner=(index===0)===(event===0)?'duck':'swan';
  const sample=swimPosition(birth,owner);return {birth,age:time-birth,position:sample.position,owner};
 }));
}
