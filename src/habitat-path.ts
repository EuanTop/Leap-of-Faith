import * as THREE from 'three';

export class HabitatCurve extends THREE.Curve<THREE.Vector3>{
 constructor(){super();this.arcLengthDivisions=1800;}
 getPoint(t:number,target=new THREE.Vector3()){
  const a=t*Math.PI*2,r=2+.62*Math.cos(a*3);
  return target.set(3.15*r*Math.cos(a),6.9+3.2*Math.sin(a*3),3.15*r*Math.sin(a));
 }
 getTangent(t:number,target=new THREE.Vector3()){
  const a=t*Math.PI*2,r=2+.62*Math.cos(a*3),dr=-1.86*Math.sin(a*3);
  return target.set(3.15*(dr*Math.cos(a)-r*Math.sin(a)),9.6*Math.cos(a*3),3.15*(dr*Math.sin(a)+r*Math.cos(a))).normalize();
 }
}
export const habitatCurve=new HabitatCurve();
export const PODS=[1/12,5/12,9/12];
export const radiusAt=(t:number)=>1.88+PODS.reduce((sum,p)=>{const d=Math.abs(((t-p+.5)%1+1)%1-.5);return sum+.80*Math.exp(-((d/.036)**2))},0);
// Arc coordinates keep shader traces aligned with constant-speed playback.
export function habitatArcAt(t:number){
 const lengths=habitatCurve.getLengths(),last=lengths.length-1,x=Math.max(0,Math.min(1,t))*last,i=Math.min(last-1,Math.floor(x)),f=x-i;
 return (lengths[i]*(1-f)+lengths[i+1]*f)/lengths[last];
}
export function habitatFrame(t:number){
 const center=habitatCurve.getPoint(t),tangent=habitatCurve.getTangent(t),side=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),tangent).normalize(),up=new THREE.Vector3().crossVectors(tangent,side).normalize();
 const matrix=new THREE.Matrix4().makeBasis(side,up,tangent),quaternion=new THREE.Quaternion().setFromRotationMatrix(matrix);
 return {center,tangent,side,up,quaternion,radius:radiusAt(t),floor:center.clone().addScaledVector(up,-1.05)};
}
export const HABITAT_GLSL=`
 vec3 centerAt(float t){float a=t*6.2831853,r=2.+.62*cos(a*3.);return vec3(3.15*r*cos(a),6.9+3.2*sin(a*3.),3.15*r*sin(a));}
 vec3 tangentAt(float t){float a=t*6.2831853,r=2.+.62*cos(a*3.),dr=-1.86*sin(a*3.);return normalize(vec3(3.15*(dr*cos(a)-r*sin(a)),9.6*cos(a*3.),3.15*(dr*sin(a)+r*cos(a))));}
 float radiusAt(float t){float r=1.88;for(int i=0;i<3;i++){float p=(1.+float(i)*4.)/12.;float d=abs(fract(t-p+.5)-.5);r+=.80*exp(-pow(d/.036,2.));}return r;}
 uniform float uStart,uSweep;
 vec3 pipeAt(vec2 q){float t=q.y,r=radiusAt(t),lower=asin(-1.05/r),a=lower+q.x*(3.14159265-2.*lower);vec3 tangent=tangentAt(t),side=normalize(cross(vec3(0.,1.,0.),tangent)),up=normalize(cross(tangent,side));return centerAt(t)+radiusAt(t)*(cos(a)*side+sin(a)*up);}
`;
