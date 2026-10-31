import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createArchitecture} from './architecture.ts';
import {createResident,duckPose} from './actors.ts';
import {DURATION,TAU,wrap} from '../story.ts';

/** A second scene shares the viewpoint, never the duck or the warm house materials. */
export async function createMirrorWorld(source:T.Scene){
 const scene=new T.Scene();
 scene.background=source.background;
 scene.environment=source.environment;
 scene.environmentIntensity=source.environmentIntensity;
 // Keep the established light direction, with a cooler fill in the reflected world.
 for(const child of source.children)if(child instanceof T.Light){
  const light=child.clone();scene.add(light);
  if(light instanceof T.DirectionalLight){light.intensity*=1.05;light.castShadow=false;scene.add(light.target);}
 }
 const house=createArchitecture(scene,true),ghost=createResident(scene);
 const materials=new Map<T.Material,T.Material>();
 house.root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  const convert=(m:T.Material)=>{
   if(materials.has(m))return materials.get(m)!;
   const copy=m.clone();copy.onBeforeCompile=m.onBeforeCompile;copy.customProgramCacheKey=m.customProgramCacheKey;
   if(copy instanceof T.ShaderMaterial){
    copy.fragmentShader=copy.fragmentShader.replace('vec3(.21,.030,.020),vec3(1.9,.62,.10)','vec3(.16,.065,.19),vec3(1.35,.80,1.10)');
   }else if('color' in copy && copy.color instanceof T.Color){
    const c=copy.color;
    c.lerp(new T.Color(c.getHSL({h:0,s:0,l:0}).l>.55?'#f2d8df':'#ad86bf'),.62);
   }
   materials.set(m,copy);return copy;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });
 ghost.root.traverse(o=>{
  if(!(o instanceof T.Mesh))return;
  if(o.material instanceof T.MeshPhysicalMaterial){o.material.color.set('#ead9f2');o.material.emissive.set('#77517e');o.material.emissiveIntensity=.18;}
  if(o.material instanceof T.MeshBasicMaterial)o.material.color.set('#ffdfa0');
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
  for(const m of materials.values())if(m instanceof T.ShaderMaterial&&m.uniforms.phase)m.uniforms.phase.value=phase*3+Math.PI*.6;
  // The mirror resident breathes on a different phase, while still attending to the swimmer.
  ghost.update(wrap(time+DURATION*.18),p.position,motion);
  swan.position.copy(p.position);swan.position.y=.014*Math.sin(phase*8)*motion;
  swan.rotation.set(.012*Math.sin(phase*6)*motion,p.yaw,.016*Math.sin(phase*8)*motion);
  wings.forEach((w,i)=>{w.rotation.copy(restWings[i]!);w.rotation.z+=.018*Math.sin(phase*4)*motion;});
 }};
}
