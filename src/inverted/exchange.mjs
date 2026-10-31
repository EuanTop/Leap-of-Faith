export const EXCHANGE_CENTERS=[12,26.4];
const DURATION=28.8,TAU=Math.PI*2;
const wrap=t=>(t%DURATION+DURATION)%DURATION;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const pulse=(t,start,duration)=>{const u=(t-start)/duration;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
export function exchangeAngle(time,delay=0,width=3.0){
 const t=wrap(time);return Math.PI*EXCHANGE_CENTERS.reduce((n,c)=>n+smooth((t-c-delay+width/2)/width),0);
}
function arc(d){
 const keys=[[-1.65,0,0],[-1.2,.43,0],[-.45,0,-1.4],[.15,-1.15,0],[1.35,0,0]];
 for(let i=0;i<keys.length-1;i++){
  const [a,p,m]=keys[i],[b,q,n]=keys[i+1];if(d<a||d>b)continue;
  const u=(d-a)/(b-a),u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*p+(u3-2*u2+u)*m*(b-a)+(-2*u3+3*u2)*q+(u3-u2)*n*(b-a);
 }return 0;
}
/** Positions never reset: the two permanent characters cross the actual water plane. */
export function exchangeAt(time){
 const t=wrap(time),index=Math.abs(t-12)<Math.abs(t-26.4)?0:1,d=t-EXCHANGE_CENTERS[index];
 const fromDay=index===1,toDay=!fromDay,progress=smooth((d+1.5)/3),transition=Math.abs(d)<1.7;
 const actorAngle=exchangeAngle(t,0,.90),worldAngle=exchangeAngle(t),daylight=(1-Math.cos(actorAngle))*.5;
 const sign=fromDay?-1:1,height=arc(d),duckHeight=height*sign;
 const pitch=(.68*smooth((d+1.15)/.6)*(1-smooth((d-.25)/.9))-.12*pulse(d,-1.65,.75))*sign;
 return {time:t,activeDay:daylight>.5,daylight,transition,progress,fromDay,toDay,direction:fromDay?-1:1,height,pitch,
  actorAngle,worldAngle,backgroundAngle:exchangeAngle(t,.24,3.2),duckHeight,swanHeight:-duckHeight,
  routeOffset:.66*pulse(d,-1.9,3.5),separation:.86*pulse(d,-1.8,3.4),
  duckFlap:Math.max(pulse(d,.10,.9),pulse(d,-2.10,1.0),pulse(t,3.0,.85),pulse(t,17.4,.85)),
  swanFlap:Math.max(pulse(d,.12,1.0),pulse(d,-1.96,1.08),pulse(t,4.0,1.05),pulse(t,18.4,1.05)),
  flapClock:t*TAU,submerged:Math.abs(d)<.35};
}
