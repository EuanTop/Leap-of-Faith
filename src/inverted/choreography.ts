import {DURATION,wrap} from '../story.ts';
import {EXCHANGE_CENTERS} from './exchange.mjs';
export const minimumJerk=(x:number)=>{const u=Math.max(0,Math.min(1,x));return u*u*u*(10+u*(-15+6*u));};
export function castleCue(time:number,delay=0){
 const t=wrap(time);let q=0,u=0,active=false,direction=1,velocity=0;
 EXCHANGE_CENTERS.forEach((center:number,index:number)=>{
  const duration=index===0?2.55:1.45,raw=(t-center-.40-delay)/duration,eased=minimumJerk(raw),sign=index===0?1:-1;
  q+=sign*eased;
  if(raw>0&&raw<1){u=raw;active=true;direction=sign;velocity=sign*30*raw*raw*(1-raw)*(1-raw)/duration;}
 });
 return {q,u,active,direction,velocity};
}
export function pigmentCue(time:number){
 const t=wrap(time);
 return minimumJerk((t-EXCHANGE_CENTERS[0]-.18)/2.95)-minimumJerk((t-EXCHANGE_CENTERS[1]-.18)/1.95);
}
export function alarmAt(u:number){return minimumJerk((u-.055)/.14)*(1-minimumJerk((u-.73)/.27));}
