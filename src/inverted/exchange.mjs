export const EXCHANGE_CENTERS=[12,26.4];
const DURATION=28.8,TAU=Math.PI*2;
const wrap=t=>(t%DURATION+DURATION)%DURATION;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const pulse=(t,start,duration)=>{const u=(t-start)/duration;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
export function exchangeAngle(time,delay=0,width=3.0){
 const t=wrap(time);return Math.PI*EXCHANGE_CENTERS.reduce((n,c)=>n+smooth((t-c-delay+width/2)/width),0);
}
function arc(d){
 const keys=[[-1.65,0,0],[-1.30,.98,.15],[-.95,1.04,0],[-.73,.94,-.9],[-.45,0,-3.8],[.18,-1.85,0],[.48,-1.76,.65],[1.35,0,0]];
 for(let i=0;i<keys.length-1;i++){
  const [a,p,m]=keys[i],[b,q,n]=keys[i+1];if(d<a||d>b)continue;
  const u=(d-a)/(b-a),u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*p+(u3-2*u2+u)*m*(b-a)+(-2*u3+3*u2)*q+(u3-u2)*n*(b-a);
 }return 0;
}
function forwardAdvance(time){
 const t=wrap(time);
 return EXCHANGE_CENTERS.reduce((total,center)=>{
  const d=((t-center+DURATION*1.5)%DURATION)-DURATION*.5;
  const launch=2.3*smooth((d+1.95)/.60),hang=.25*smooth((d+1.35)/.50);
  const dive=1.9*smooth((d+.80)/.80),emerge=.15*smooth((d-.05)/.50);
  const recover=1-smooth((d-1.0)/6.0);
  return total+(launch-hang+dive-emerge)*recover;
 },0);
}
/** Positions never reset: the two permanent characters cross the actual water plane. */
export function exchangeAt(time){
 const t=wrap(time),index=Math.abs(t-12)<Math.abs(t-26.4)?0:1,d=t-EXCHANGE_CENTERS[index];
 const fromDay=index===1,toDay=!fromDay,progress=smooth((d+1.5)/3),transition=Math.abs(d)<1.7;
 const actorAngle=exchangeAngle(t,0,.90),worldAngle=exchangeAngle(t),daylight=(1-Math.cos(actorAngle))*.5;
 const sign=fromDay?-1:1,height=arc(d),duckHeight=height*sign;
 const pitch=(.82*smooth((d+.82)/.32)*(1-smooth((d-.35)/.95))-.18*pulse(d,-1.65,.80))*sign;
 const weave=(d+1.8)/3.4,envelope=pulse(d,-1.8,3.4);
 return {time:t,activeDay:daylight>.5,daylight,transition,progress,fromDay,toDay,direction:fromDay?-1:1,height,pitch,
  actorAngle,worldAngle,backgroundAngle:exchangeAngle(t,.24,3.2),duckHeight,swanHeight:-duckHeight,
  routeOffset:forwardAdvance(t),separation:1.05*envelope*Math.cos(TAU*(weave-.40)),
  weaveAdvance:.12*envelope*Math.sin(TAU*weave),
  heroFocus:Math.max(pulse(d,-1.5,.80),pulse(d,-.05,.75)),
  duckFlap:Math.max(pulse(d,.10,.9),pulse(d,-2.10,1.0),pulse(t,3.0,.85),pulse(t,17.4,.85)),
  swanFlap:Math.max(pulse(d,.12,1.0),pulse(d,-1.96,1.08),pulse(t,4.0,1.05),pulse(t,18.4,1.05)),
  flapClock:t*TAU,submerged:Math.abs(d)<.35};
}
