export const EXCHANGE_CENTERS=[12,26.4];
const DURATION=28.8,TAU=Math.PI*2;
const wrap=t=>(t%DURATION+DURATION)%DURATION;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const pulse=(t,start,duration)=>{const u=(t-start)/duration;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
export function exchangeAngle(time,delay=0,width=3.0){
 const t=wrap(time);return Math.PI*EXCHANGE_CENTERS.reduce((n,c)=>n+smooth((t-c-delay+width/2)/width),0);
}
function arc(d){
 // One rounded apex per leap, with a continuous downward velocity through
 // the water. There are no hold keys or changes to the playback clock.
 const keys=[[-1.65,0,0],[-1.08,.92,0],[-.45,0,-3.0],[.18,-1.60,0],[1.35,0,0]];
 for(let i=0;i<keys.length-1;i++){
  const [a,p,m]=keys[i],[b,q,n]=keys[i+1];if(d<a||d>b)continue;
  const u=(d-a)/(b-a),u2=u*u,u3=u2*u;
  return {height:(2*u3-3*u2+1)*p+(u3-2*u2+u)*m*(b-a)+(-2*u3+3*u2)*q+(u3-u2)*n*(b-a),
   velocity:(6*u2-6*u)*(p-q)/(b-a)+(3*u2-4*u+1)*m+(3*u2-2*u)*n};
 }return {height:0,velocity:0};
}
const gentle=x=>{const u=Math.max(0,Math.min(1,x));return u*u*u*(10+u*(-15+6*u));};
function glideProgress(value){
 const u=Math.max(0,Math.min(1,value)),r=.08;
 const enter=x=>(x/2-r*Math.sin(Math.PI*x/r)/(2*Math.PI))/(1-r);
 return u<r?enter(u):u>1-r?1-enter(1-u):(u-r/2)/(1-r);
}
function flightTravel(time){
 const t=wrap(time);
 return EXCHANGE_CENTERS.reduce((distance,center)=>{
  const d=((t-center+DURATION*1.5)%DURATION)-DURATION*.5;
  // A nearly uniform forward glide, with brief soft joins at takeoff and
  // landing. Extra distance eases back during swimming, never in mid-air.
  const progress=glideProgress((d+1.65)/3);
  return distance+2.5*progress*(1-gentle((d-1.35)/8));
 },0);
}
/** Positions never reset: the two permanent characters cross the actual water plane. */
export function exchangeAt(time){
 const t=wrap(time),index=Math.abs(t-12)<Math.abs(t-26.4)?0:1,d=t-EXCHANGE_CENTERS[index];
 const fromDay=index===1,toDay=!fromDay,progress=smooth((d+1.5)/3),transition=Math.abs(d)<1.7;
 const actorAngle=exchangeAngle(t,0,.90),worldAngle=exchangeAngle(t),daylight=(1-Math.cos(actorAngle))*.5;
 const sign=fromDay?-1:1,{height,velocity}=arc(d),duckHeight=height*sign;
 const pitch=.58*Math.tanh(-velocity*sign/2.4);
 return {time:t,activeDay:daylight>.5,daylight,transition,progress,fromDay,toDay,direction:fromDay?-1:1,height,pitch,
  actorAngle,worldAngle,backgroundAngle:exchangeAngle(t,.24,3.2),duckHeight,swanHeight:-duckHeight,
  routeOffset:0,flightTravel:flightTravel(t),separation:.50*pulse(d,-1.8,3.4),
  duckFlap:Math.max(pulse(d,.10,.9),pulse(d,-2.10,1.0),pulse(t,3.0,.85),pulse(t,17.4,.85)),
  swanFlap:Math.max(pulse(d,.12,1.0),pulse(d,-1.96,1.08),pulse(t,4.0,1.05),pulse(t,18.4,1.05)),
  flapClock:t*TAU,submerged:Math.abs(d)<.35};
}
