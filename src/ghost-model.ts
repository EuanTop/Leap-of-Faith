import * as THREE from 'three';
import {reachAtPhase} from './display-motion.ts';
import {MarchingCubes} from 'three/addons/objects/MarchingCubes.js';

export const PALMS=[new THREE.Vector3(-9,4.8,0),new THREE.Vector3(9,4.8,0)];
export const HEAD_PIVOT=new THREE.Vector3(0,-7,0);
export function sleeveCurve(sign:number){return new THREE.CubicBezierCurve3(new THREE.Vector3(sign*4.8,-16,0),new THREE.Vector3(sign*13,-16,0),new THREE.Vector3(sign*14,1,0),new THREE.Vector3(sign*9,4.8,0))}
const segments=[-1,1].flatMap(sign=>{const curve=sleeveCurve(sign);return Array.from({length:18},(_,i)=>{
 const a=curve.getPoint(i/18),b=curve.getPoint((i+1)/18);a.z/=.70;b.z/=.70;
 const d=b.clone().sub(a);return {a,d,length:d.lengthSq(),radius:2.1-.85*(i+.5)/18};
})});
const union=(a:number,b:number,k:number)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25};
export function ghostDistance(x:number,y:number,z:number){
 const r=6+1.1*THREE.MathUtils.smoothstep(-y,7,28),dy=y-THREE.MathUtils.clamp(y,-33,-4);
 let distance=Math.hypot(x,dy,z/.70)-r;
 const zz=z/.50;
 for(const s of segments){
  const px=x-s.a.x,py=y-s.a.y,pz=zz-s.a.z,t=THREE.MathUtils.clamp((px*s.d.x+py*s.d.y+pz*s.d.z)/s.length,0,1);
  const d=Math.hypot(px-s.d.x*t,py-s.d.y*t,pz-s.d.z*t)-s.radius;
  distance=union(distance,d,.85);
 }
 // One broad hanging arc between the upper sleeve and the robe. Rounded
 // depth edges and a single wide bow replace the repeated vertical ridges.
 const t=THREE.MathUtils.clamp((Math.abs(x)-5.5)/6,0,1),sag=4*t*(1-t);
 const webTop=THREE.MathUtils.lerp(-4.7,-4.5,t)-3.5*sag;
 const webThickness=1.05+.25*sag,centerZ=.45*Math.sin(Math.PI*t)*THREE.MathUtils.smoothstep(-y,5,20);
 const dyEdge=y-webTop+.60,dzEdge=Math.abs(z-centerZ)-webThickness+.60;
 const roundedEdge=Math.hypot(Math.max(dyEdge,0),Math.max(dzEdge,0))+Math.min(Math.max(dyEdge,dzEdge),0)-.60;
 const web=Math.max(Math.abs(x)-11.8,roundedEdge);
 return union(distance,web,.85);
}
let cached:THREE.BufferGeometry|undefined;
export function ghostGeometry(){
 if(cached)return cached;
 const resolution=104,half=20,centerY=-12,temporary=new THREE.MeshBasicMaterial();
 const field=new MarchingCubes(resolution,temporary,false,false,120000);field.isolation=0;
 for(let k=0;k<resolution;k++)for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
  const x=(i/resolution*2-1)*half,y=(j/resolution*2-1)*half+centerY,z=(k/resolution*2-1)*half;
  field.field[i+j*resolution+k*resolution*resolution]=-ghostDistance(x,y,z);
 }
 field.update();
 const positions=field.positionArray.slice(0,field.count*3),normals=field.normalArray.slice(0,field.count*3);
 for(let i=0;i<positions.length;i+=3){positions[i]*=half;positions[i+1]=positions[i+1]*half+centerY;positions[i+2]*=half;}
 cached=new THREE.BufferGeometry();cached.setAttribute('position',new THREE.BufferAttribute(positions,3));cached.setAttribute('normal',new THREE.BufferAttribute(normals,3));cached.normalizeNormals();cached.computeBoundingSphere();
 field.geometry.dispose();temporary.dispose();return cached;
}
export function warpGhost(p:THREE.Vector3,phase:number,motion:number,pitch:number,yaw:number,shifts:THREE.Vector3[]){
 const m=Math.min(motion,1.5),head=THREE.MathUtils.smoothstep(p.y,-10,-3)*(1-THREE.MathUtils.smoothstep(Math.abs(p.x),5,7));
 const q=p.clone().sub(HEAD_PIVOT).applyAxisAngle(new THREE.Vector3(1,0,0),pitch*head).applyAxisAngle(new THREE.Vector3(0,1,0),yaw*head).add(HEAD_PIVOT);
 const index=p.x<0?0:1,sign=p.x<0?-1:1;
 const cuff=THREE.MathUtils.smoothstep(Math.abs(p.x),6,8.5)*THREE.MathUtils.smoothstep(p.y,-3,3.5);
 const curl=-sign*(.10*Math.sin(phase*2+index*1.7)+.14*reachAtPhase(phase,index))*cuff*m;
 q.sub(PALMS[index]).applyAxisAngle(new THREE.Vector3(0,0,1),curl).add(PALMS[index]);
 const sleeve=THREE.MathUtils.smoothstep(Math.abs(p.x),6,8.5)*THREE.MathUtils.smoothstep(p.y,-14,1);
 q.addScaledVector(shifts[index],sleeve);
 const fall=1-THREE.MathUtils.smoothstep(p.y,-18,-3);
 q.x+=.45*fall*Math.sin(phase*2+p.y*.18)*m;q.z+=.20*fall*Math.sin(phase+p.y*.21)*m;return q;
}
export const GHOST_WARP_GLSL=`
 uniform float uPhase,uMotion,uHeadPitch,uHeadYaw;
 uniform vec3 uLeftShift,uRightShift;
 vec3 warpGhost(vec3 p){
  float head=smoothstep(-10.,-3.,p.y)*(1.-smoothstep(5.,7.,abs(p.x)));
  vec3 q=p-vec3(0.,-7.,0.);float a=uHeadPitch*head,b=uHeadYaw*head;
  q=vec3(q.x,cos(a)*q.y-sin(a)*q.z,sin(a)*q.y+cos(a)*q.z);
  q=vec3(cos(b)*q.x+sin(b)*q.z,q.y,-sin(b)*q.x+cos(b)*q.z)+vec3(0.,-7.,0.);
  float index=p.x<0.?0.:1.,sign=p.x<0.?-1.:1.,cuff=smoothstep(6.,8.5,abs(p.x))*smoothstep(-3.,3.5,p.y);
  float reach=pow(.5+.5*cos(uPhase*3.-.6+index*3.14159265359),4.);
  float curl=-sign*(.10*sin(uPhase*2.+index*1.7)+.14*reach)*cuff*min(uMotion,1.5);
  vec3 palm=vec3(sign*9.,4.8,0.);q-=palm;q=vec3(cos(curl)*q.x-sin(curl)*q.y,sin(curl)*q.x+cos(curl)*q.y,q.z)+palm;
  float sleeve=smoothstep(6.,8.5,abs(p.x))*smoothstep(-14.,1.,p.y);
  q+=(p.x<0.?uLeftShift:uRightShift)*sleeve;
  float fall=1.-smoothstep(-18.,-3.,p.y),m=min(uMotion,1.5);
  q.x+=.45*fall*sin(uPhase*2.+p.y*.18)*m;q.z+=.20*fall*sin(uPhase+p.y*.21)*m;return q;
 }
`;
