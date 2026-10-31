import * as T from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {DURATION,TAU} from '../story.ts';
import {LAKE_VERTEX,LAKE_FRAGMENT} from './lake-shader.ts';
import {surfaceSample,emitsSurfaceTrail,contactEvents} from './wake-field.ts';
export function createLake(scene:T.Scene){
 const root=new T.Group();root.name="Shared water surface";scene.add(root);
 const rippleHistory=Array.from({length:8},()=>new T.Vector4());
 const pass=new ShaderPass({uniforms:{
  tDiffuse:{value:null},belowWorld:{value:null},phase:{value:0},wind:{value:1},trail:{value:1},
  swimmer:{value:new T.Vector2()},wakes:{value:rippleHistory},viewportHeight:{value:1200},aspect:{value:.75},
  backgroundAngle:{value:0},inverseProjectionView:{value:new T.Matrix4()},cameraWorld:{value:new T.Vector3()}
 },vertexShader:LAKE_VERTEX,fragmentShader:LAKE_FRAGMENT});
 const wakes:T.Mesh<T.BufferGeometry,T.ShaderMaterial>[]=[];const count=25,segments=36,interval=DURATION/180,life=3.8;
 const mat=new T.ShaderMaterial({clipping:true,transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{opacity:{value:1}},vertexShader:`
#include <clipping_planes_pars_vertex>
attribute float alpha,across;varying float a,x;void main(){a=alpha;x=across;vec4 mvPosition=modelViewMatrix*vec4(position,1.);
#include <clipping_planes_vertex>
gl_Position=projectionMatrix*mvPosition;}`,fragmentShader:`
#include <clipping_planes_pars_fragment>
uniform float opacity;varying float a,x;void main(){
#include <clipping_planes_fragment>
gl_FragColor=vec4(1.,.73,.43,a*exp(-x*x*3.)*opacity);
 #include <colorspace_fragment>
 }`});
 for(let i=0;i<count;i++){const g=new T.BufferGeometry(),ids:number[]=[],alpha=new Float32Array((segments+1)*2),across=alpha.slice();g.setAttribute('position',new T.BufferAttribute(new Float32Array((segments+1)*6),3));
  for(let j=0;j<=segments;j++){alpha[j*2]=alpha[j*2+1]=Math.sin(j/segments*Math.PI)**.8;across[j*2]=-1;across[j*2+1]=1;if(j<segments){const k=j*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}}
  g.setAttribute('alpha',new T.BufferAttribute(alpha,1));g.setAttribute('across',new T.BufferAttribute(across,1));g.setIndex(ids);const m=new T.Mesh(g,mat.clone());m.frustumCulled=false;m.renderOrder=2;wakes.push(m);root.add(m);
 }
 const contacts=Array.from({length:12},()=>{const source=wakes[0]!,g=source.geometry.clone();g.getAttribute('alpha').array.fill(1);const m=new T.Mesh(g,mat.clone());m.frustumCulled=false;m.renderOrder=2;root.add(m);return m;});
 return {root,pass,setView(camera:T.PerspectiveCamera,w:number,h:number,below:T.Texture,backgroundAngle:number){
  pass.uniforms.viewportHeight!.value=h;pass.uniforms.aspect!.value=w/h;pass.uniforms.belowWorld!.value=below;
  pass.uniforms.backgroundAngle!.value=backgroundAngle;pass.uniforms.inverseProjectionView!.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).invert();
  pass.uniforms.cameraWorld!.value.copy(camera.position);
 },update(time:number,wind:number,trail:number){const shader=pass.material;shader.uniforms.phase!.value=time/DURATION*TAU;shader.uniforms.wind!.value=wind;shader.uniforms.trail!.value=trail;
  const swimmer=surfaceSample(time).position;shader.uniforms.swimmer!.value.set(swimmer.x,swimmer.z);
  const history=shader.uniforms.wakes!.value as T.Vector4[];
  history.forEach((v,i)=>{const born=(Math.floor(time/.48)-i)*.48,age=time-born,sample=surfaceSample(born);v.set(sample.position.x-Math.sin(sample.yaw)*.45,sample.position.z-Math.cos(sample.yaw)*.45,sample.yaw,emitsSurfaceTrail(born)?age:100);});
  wakes.forEach((m,i)=>{const born=(Math.floor(time/interval)-i)*interval,age=time-born;m.visible=age>.02&&age<life&&trail>0&&emitsSurfaceTrail(born);if(!m.visible)return;const sample=surfaceSample(born),tangent=new T.Vector3(Math.sin(sample.yaw),0,Math.cos(sample.yaw)),center=sample.position.clone().addScaledVector(tangent,-.45),r=.14+age*.42,width=.035+age*.012,p=m.geometry.attributes.position;
   for(let j=0;j<=segments;j++){const a=(j/segments-.5)*Math.PI*.94;for(let k=0;k<2;k++){const radius=r+(k?width:-width),back=-Math.cos(a)*radius,side=Math.sin(a)*radius;p.setXYZ(j*2+k,center.x+tangent.x*back-tangent.z*side,.006,center.z+tangent.z*back+tangent.x*side);}}
   m.userData.birth=born;m.userData.surfaceCenter=[center.x,center.z];
   p.needsUpdate=true;m.material.uniforms.opacity!.value=(1-age/life)**1.5*Math.min(1,age/.15)*.34*trail;
  });
  const impacts=contactEvents(time);
  contacts.forEach((m,i)=>{const event=impacts[Math.floor(i/3)]!,age=event.age-(i%3)*.13;m.visible=age>.01&&age<2.6&&trail>0;if(!m.visible)return;
   const radius=.13+age*.48,width=.015+age*.008,p=m.geometry.attributes.position;
   for(let j=0;j<=segments;j++){const angle=j/segments*TAU;for(let k=0;k<2;k++){const r=radius+(k?width:-width);p.setXYZ(j*2+k,event.position.x+Math.cos(angle)*r,.006,event.position.z+Math.sin(angle)*r);}}
   m.userData.birth=event.birth;m.userData.surfaceCenter=[event.position.x,event.position.z];p.needsUpdate=true;m.material.uniforms.opacity!.value=(1-age/2.6)**1.6*.17*trail;
  });}};
}
