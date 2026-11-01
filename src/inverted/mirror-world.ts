import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createArchitecture} from './architecture.ts';
import {wall,trim,edge,iron,glass,glow} from './materials.ts';
import {createResident,duckPose,swimPosition} from './actors.ts';
import {DURATION,TAU,wrap} from '../story.ts';
import {exchangeAt} from './exchange.mjs';

/** A second scene shares the viewpoint, never the duck or the warm house materials. */
export async function createMirrorWorld(source:T.Scene){
 const scene=new T.Scene();
 scene.background=null;
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
 model.position.set(-(bounds.min.x+bounds.max.x)*scale*.5,-bounds.min.y*scale-.035, -(bounds.min.z+bounds.max.z)*scale*.5);
 const wingParts=[[],[]] as T.Object3D[][];
 model.traverse(o=>{
  if(/^wing_left_/.test(o.name))wingParts[0]!.push(o);
  if(/^wing_right_/.test(o.name))wingParts[1]!.push(o);
  if(o instanceof T.Mesh){o.castShadow=false;o.receiveShadow=false;
   o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
   for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat instanceof T.MeshStandardMaterial){mat.roughness=.55;mat.envMapIntensity=.8;}
  }
 });
 model.updateWorldMatrix(true,true);
 const wings=wingParts.map((parts,i)=>{
  const sign=i?1:-1,pivot=new T.Group();pivot.name='Swan shoulder hinge';pivot.position.set(sign*.23,.61,.30);model.add(pivot);pivot.updateWorldMatrix(true,false);parts.forEach(p=>pivot.attach(p));
  const feathers=parts.filter(p=>p.name.includes('_feather_')).map(part=>{const hinge=new T.Group();pivot.add(hinge);hinge.updateWorldMatrix(true,false);hinge.attach(part);return hinge;});
  return {pivot,sign,feathers};
 });
 const liftAxis=new T.Vector3(0,0,1),spreadAxis=new T.Vector3(0,1,0),spreadRotation=new T.Quaternion();
 return {scene,swan,house,ghost,update(time:number,motion:number){
  const phase=wrap(time)/DURATION*TAU,p=swimPosition(time,'swan'),ex=exchangeAt(time);
  house.update(time,motion);
  for(const m of materials.values())if(m instanceof T.ShaderMaterial&&m.uniforms.phase)m.uniforms.phase.value=phase*3;
  // The ghost is a synchronous reflection; the duck alone has another identity.
  ghost.update(time,p.position,motion);
  swan.position.copy(p.position);swan.position.y=.014*Math.sin(phase*8)*motion+ex.swanHeight;
  swan.rotation.set(-ex.pitch+.012*Math.sin(phase*6)*motion,p.yaw,0,'YXZ');swan.rotateZ(Math.PI-ex.actorAngle+.016*Math.sin(phase*8)*motion);
  // Folded feathers point aft. Open them sideways at the shoulder before lifting
  // the whole wing: a large flight silhouette, rather than a stronger swim twitch.
  const flight=T.MathUtils.smoothstep(Math.max(0,ex.swanHeight),.04,.62)*Math.min(1,motion);
  wings.forEach(({pivot,sign,feathers})=>{
   const burst=ex.swanFlap*(.12+.63*Math.sin(ex.flapClock*3.2)**2)*Math.min(1.4,motion);
   const lift=.018*Math.sin(phase*4)*motion+burst*(1-flight)+flight*(.88+sign*.12+.13*Math.sin(ex.flapClock*1.25));
   pivot.quaternion.setFromAxisAngle(liftAxis,sign*lift);
   pivot.quaternion.multiply(spreadRotation.setFromAxisAngle(spreadAxis,-sign*1.18*flight));
   pivot.rotateX(flight*.10+burst*.10*(1-flight));
   feathers.forEach((feather,index)=>{feather.rotation.y=-sign*flight*index*.09;});
  });
 }};
}
