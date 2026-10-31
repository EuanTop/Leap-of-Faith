import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createArchitecture} from './architecture.ts';
import {wall,trim,edge,iron,glass,glow} from './materials.ts';
import {createResident,duckPose} from './actors.ts';
import {DURATION,TAU,wrap} from '../story.ts';

/** A second scene shares the viewpoint, never the duck or the warm house materials. */
export async function createMirrorWorld(source:T.Scene){
 const scene=new T.Scene();
 scene.background=new T.Color('#f8e7bf');
 scene.environment=source.environment;
 scene.environmentIntensity=.8;
 // Daylight shares the light direction, while reversing the night palette.
 for(const child of source.children)if(child instanceof T.Light){
  const light=child.clone();scene.add(light);
  if(light instanceof T.DirectionalLight){light.intensity*=.95;light.color.set('#fff4dc');light.castShadow=false;scene.add(light.target);}
 }
 scene.add(new T.HemisphereLight('#fff9e9','#a58464',1.3));
 const house=createArchitecture(scene,true),ghost=createResident(scene);
 const materials=new Map<T.Material,T.Material>();
 house.root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const convert=(m:T.Material)=>{
   if(materials.has(m))return materials.get(m)!;
   const copy=m.clone();copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;
   if(copy instanceof T.ShaderMaterial){
    copy.fragmentShader=copy.fragmentShader.replace('vec3(.21,.030,.020),vec3(1.9,.62,.10)','vec3(.20,.23,.17),vec3(.83,1.04,.80)');
   }else if('color' in copy && copy.color instanceof T.Color){
    const tone=m===wall?'#eedfb9':m===trim?'#c4936d':m===edge?'#fff0ce':m===iron?'#80644b':m===glass?'#e3f0da':m===glow?'#fff7de':'#dea15c';
    copy.color.set(tone);
    if(copy instanceof T.MeshPhysicalMaterial&&m===glass){copy.opacity=.44;copy.roughness=.18;}
   }
   materials.set(m,copy);return copy;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });
 // The reflected cloth reverses value: dark skin and luminous, pale eyes.
 ghost.root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  if(o.material instanceof T.MeshPhysicalMaterial){o.material.color.set('#34243f');o.material.emissive.set('#000000');o.material.emissiveIntensity=0;o.material.sheenColor.set('#786188');}
  if(o.material instanceof T.MeshBasicMaterial)o.material.color.set('#fff8e8');
 });

 // Reuse the original, authored series swan rather than deforming the duck into one.
 const gltf=await new GLTFLoader().loadAsync(new URL('../../public/models/swan.glb',import.meta.url).href);
 const swan=new T.Group(),model=gltf.scene;model.name='The swan inside the reflection';swan.add(model);scene.add(swan);
 model.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
 const scale=1.85/size.z;model.scale.setScalar(scale);
 model.position.set(-(bounds.min.x+bounds.max.x)*scale*.5,-.19, -(bounds.min.z+bounds.max.z)*scale*.5);
 const wings:T.Object3D[]=[];
 model.traverse(o=>{
  if(/^wing_(left|right)_/.test(o.name))wings.push(o);
  if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=false;
   o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
   for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat instanceof T.MeshStandardMaterial){mat.roughness=.55;mat.envMapIntensity=.8;}
  }
 });
 const restWings=wings.map(o=>o.rotation.clone());
 return {scene,swan,house,ghost,update(time:number,motion:number){
  const phase=wrap(time)/DURATION*TAU,p=duckPose(time);
  house.update(time,motion);
  for(const m of materials.values())if(m instanceof T.ShaderMaterial&&m.uniforms.phase)m.uniforms.phase.value=phase*3;
  // The ghost is a synchronous reflection; the duck alone has another identity.
  ghost.update(time,p.position,motion);
  swan.position.copy(p.position);swan.position.y=.014*Math.sin(phase*8)*motion;
  swan.rotation.set(.012*Math.sin(phase*6)*motion,p.yaw,.016*Math.sin(phase*8)*motion);
  wings.forEach((w,i)=>{w.rotation.copy(restWings[i]!);w.rotation.z+=.018*Math.sin(phase*4)*motion;});
 }};
}
