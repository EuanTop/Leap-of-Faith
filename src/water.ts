import * as THREE from 'three';
import {PACE_CENTER,PACE_AMOUNT} from './story.ts';
export const riverWidth=(z:number)=>1.48+.24*Math.sin(z*.66+.7)+.13*Math.sin(z*1.35);
const field=`
 float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+3.7)+.15*noise(p*4.11-2.3);}
 float heightAt(vec2 p,float ph){vec2 orbit=vec2(cos(ph),sin(ph));vec2 q=vec2(fbm(p*.63+orbit*.7),fbm(p*.63+8.1-orbit*.6));return fbm(p*1.6+q*2.4+orbit*.9);}
 vec2 cells(vec2 p){vec2 cell=floor(p),f=fract(p);float a=10.,b=10.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(hash(cell+g),hash(cell+g+17.1));float d=length(g+o-f);if(d<a){b=a;a=d;}else if(d<b)b=d;}return vec2(a,b);}
 float starfield(vec2 p,float phase){vec2 cell=floor(p),f=fract(p);float result=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));float h=hash(cell+g);vec2 offset=vec2(hash(cell+g+2.1),hash(cell+g+12.7));vec2 v=g+offset-f;float r=length(v);float twinkle=.65+.35*sin(phase*3.+h*30.);float core=exp(-r*r*(650.+h*2100.));float cross=(exp(-abs(v.x)*300.-abs(v.y)*28.)+exp(-abs(v.y)*300.-abs(v.x)*28.))*step(.95,h);result+=(core+cross*.35)*twinkle*step(.55,h);}return result;}

`;
export function createGalaxyMaterial(){
 const uniforms={uDuckArc:{value:0},uDuckClock:{value:0},uTrailStrength:{value:1},uTime:{value:0},uFront:{value:10},uGrowth:{value:0},uMotion:{value:1},uStrength:{value:1},uDuck:{value:new THREE.Vector2()},uMint:{value:new THREE.Color('#e8d4b4')},uInk:{value:new THREE.Color('#27113e')}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:true,vertexShader:`
 attribute float aArc;varying float vArc;uniform float uTime,uMotion;varying vec2 vUv,vWorld;varying vec3 vEye;
 void main(){vArc=aArc;vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xz+vec2(world.y*.13,0.);vEye=cameraPosition-world.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}

 `,fragmentShader:field+`
 uniform float uTime,uFront,uGrowth,uMotion,uStrength,uDuckArc,uDuckClock,uTrailStrength;varying float vArc;uniform vec2 uDuck;
 float clockForArc(float arc){float u=arc;for(int i=0;i<7;i++){float a=18.84955592*(u-${PACE_CENTER.toFixed(12)});u-=(u-${PACE_AMOUNT.toFixed(8)}*sin(a)-arc)/(1.-${(PACE_AMOUNT*Math.PI*6).toFixed(12)}*cos(a));}return fract(u+1.);}
 varying vec2 vUv,vWorld;varying vec3 vEye;
 void main(){float reveal=uStrength;if(reveal<.01)discard;
 float ph=uTime*6.2831853/28.8;vec2 p=vWorld*1.18,orbit=vec2(cos(ph),sin(ph));
 // Clean amethyst depth, with stars and the duck's white trace only.
 vec3 col=vec3(.024,.003,.047);
 col+=starfield(p*2.8+orbit*.08,ph)*vec3(1.,.57,.17)+starfield(p*5.2-orbit*.06,ph+2.)*vec3(.68,.37,1.)*.55;
 float edge=abs(vUv.x-.5)*2.,rim=smoothstep(.97,1.,edge);col=mix(col,vec3(.34,.19,.49),rim*.35);
 // Evaluate elapsed time since the duck passed this exact section of the pipe.
 // Wrapping arc distance preserves the previous circuit at the loop seam.
 float age=fract(uDuckClock-clockForArc(vArc)+1.)*28.8;
 if(age<3.8&&uTrailStrength>.001){
  float fade=(1.-smoothstep(1.65,3.8,age))*exp(-age*.40);
  float birthPhase=ph-age*6.2831853/28.8;
  float bend=.025*sin(vArc*6.2831853*17.-birthPhase*3.);
  float x=vUv.x-.5-bend,spread=.115+.065*sqrt(age+.04);
  float halo=exp(-pow(x/spread,2.)*1.5);
  float core=exp(-pow(x/(.038+.018*age),2.))*exp(-age*.58);
  float ridge=exp(-pow((abs(x)-(.07+.035*age))/(.012+.008*age),2.));
  float broken=.55+.45*noise(vec2(vArc*195.,vUv.x*13.)+vec2(birthPhase*.12,0.));
  float shimmer=.70+.30*sin(age*11.+vArc*170.);
  float glow=(halo*.52+core*.95+ridge*broken*.36)*fade*uTrailStrength;
  col=mix(col,vec3(1.,.82,.56),clamp(glow*.90,0.,.96));
  col+=vec3(.23,.21,.28)*glow*shimmer;
 }
 gl_FragColor=vec4(col,reveal);
 #include <colorspace_fragment>
 }`});
 return {material,uniforms};
}
