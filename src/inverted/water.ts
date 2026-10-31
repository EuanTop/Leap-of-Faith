import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {DURATION,TAU} from '../story.ts';
import {duckPose} from './actors.ts';
import {LAKE_VERTEX,LAKE_FRAGMENT} from './lake-shader.ts';
export function createLake(scene:T.Scene){
 const rippleHistory=Array.from({length:8},()=>new T.Vector4());
 const water=new Reflector(new T.PlaneGeometry(1200,1200),{
  textureWidth:900,textureHeight:1200,clipBias:.003,multisample:2,color:'#eedfbd',
  shader:{name:'Inverted house water',uniforms:{
   color:{value:new T.Color('#eedfbd')},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},
   viewportHeight:{value:1200},phase:{value:0},wind:{value:1},trail:{value:1},swimmer:{value:new T.Vector2()},wakes:{value:rippleHistory}
  },vertexShader:LAKE_VERTEX,fragmentShader:LAKE_FRAGMENT}
 });
 water.rotation.x=-Math.PI/2;water.position.y=-.025;scene.add(water);
 const wakes:T.Mesh<T.BufferGeometry,T.ShaderMaterial>[]=[];const count=25,segments=36,interval=DURATION/180,life=3.8;
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{opacity:{value:1}},vertexShader:`attribute float alpha,across;varying float a,x;void main(){a=alpha;x=across;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float opacity;varying float a,x;void main(){gl_FragColor=vec4(1.,.73,.43,a*exp(-x*x*3.)*opacity);
 #include <colorspace_fragment>
 }`});
 for(let i=0;i<count;i++){const g=new T.BufferGeometry(),ids:number[]=[],alpha=new Float32Array((segments+1)*2),across=alpha.slice();g.setAttribute('position',new T.BufferAttribute(new Float32Array((segments+1)*6),3));
  for(let j=0;j<=segments;j++){alpha[j*2]=alpha[j*2+1]=Math.sin(j/segments*Math.PI)**.8;across[j*2]=-1;across[j*2+1]=1;if(j<segments){const k=j*2;ids.push(k,k+1,k+2,k+1,k+3,k+2);}}
  g.setAttribute('alpha',new T.BufferAttribute(alpha,1));g.setAttribute('across',new T.BufferAttribute(across,1));g.setIndex(ids);const m=new T.Mesh(g,mat.clone());m.frustumCulled=false;m.renderOrder=2;wakes.push(m);scene.add(m);
 }
 return {water,resize(w:number,h:number){(water.material as T.ShaderMaterial).uniforms.viewportHeight!.value=h;water.getRenderTarget().setSize(Math.min(w,1440),Math.min(h,1920));},update(time:number,wind:number,trail:number){const shader=water.material as T.ShaderMaterial;shader.uniforms.phase!.value=time/DURATION*TAU;shader.uniforms.wind!.value=wind;shader.uniforms.trail!.value=trail;
  const swimmer=duckPose(time).position;shader.uniforms.swimmer!.value.set(swimmer.x,swimmer.z);
  const history=shader.uniforms.wakes!.value as T.Vector4[];
  history.forEach((v,i)=>{const born=(Math.floor(time/.48)-i)*.48,age=time-born,sample=duckPose(born);v.set(sample.position.x-Math.sin(sample.yaw)*.45,sample.position.z-Math.cos(sample.yaw)*.45,sample.yaw,age);});
  wakes.forEach((m,i)=>{const born=(Math.floor(time/interval)-i)*interval,age=time-born;m.visible=age>.02&&age<life&&trail>0;if(!m.visible)return;const sample=duckPose(born),tangent=new T.Vector3(Math.sin(sample.yaw),0,Math.cos(sample.yaw)),center=sample.position.clone().addScaledVector(tangent,-.45),r=.14+age*.42,width=.035+age*.012,p=m.geometry.attributes.position;
   for(let j=0;j<=segments;j++){const a=(j/segments-.5)*Math.PI*.94;for(let k=0;k<2;k++){const radius=r+(k?width:-width),back=-Math.cos(a)*radius,side=Math.sin(a)*radius;p.setXYZ(j*2+k,center.x+tangent.x*back-tangent.z*side,.006,center.z+tangent.z*back+tangent.x*side);}}
   p.needsUpdate=true;m.material.uniforms.opacity!.value=(1-age/life)**1.5*Math.min(1,age/.15)*.34*trail;
  });}};
}
