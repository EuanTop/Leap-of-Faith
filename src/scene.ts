import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {createLightDesign} from './lighting.ts';
import {createArchitecture} from './inverted/architecture.ts';
import {createSwimmer,createResident} from './inverted/actors.ts';
import {createLake} from './inverted/water.ts';
import {wrap,type ArtState} from './story.ts';

export function createArtwork(){
 const scene=new T.Scene();scene.background=new T.Color('#1b1231');
 const atmosphere=new T.Mesh(new T.SphereGeometry(900,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 direction;void main(){vec3 n=normalize(direction);float haze=pow(1.-abs(n.y),12.);vec3 c=vec3(.010,.005,.027)+vec3(.035,.020,.055)*haze;gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}));scene.add(atmosphere);
 const camera=new T.PerspectiveCamera(43,.75,.10,2400),renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.localClippingEnabled=true;renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;
 const errors:string[]=[];renderer.debug.onShaderError=(gl,p,v,f)=>{errors.push((gl.getProgramInfoLog(p)||'')+(gl.getShaderInfoLog(v)||'')+(gl.getShaderInfoLog(f)||''));};
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.info.autoReset=false;
 const lighting=createLightDesign(scene,renderer);scene.remove(lighting.glows);lighting.sun.intensity=2.5;lighting.sun.shadow.mapSize.set(2048,2048);const front=new T.DirectionalLight('#b7a3ed',1.2);front.position.set(5,12,28);scene.add(front);
 const studio=new T.Scene();studio.background=new T.Color('#514160');
 for(const [colour,at,size,power] of [ ['#ffcd89',[-10,24,12],[8,13,10],2.5],['#bba2fa',[14,15,-12],[9,11,13],1.7],['#f5d6ae',[3,25,-13],[7,9,10],2.] ] as [string,number[],number[],number][]){const m=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshBasicMaterial({color:new T.Color(colour).multiplyScalar(power)}));m.position.set(...at as [number,number,number]);m.scale.set(...size as [number,number,number]);studio.add(m);}
 const pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(studio,.12);pmrem.dispose();studio.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose();}});scene.environment=env.texture;scene.environmentIntensity=.60;
 const house=createArchitecture(scene),duck=createSwimmer(scene),ghost=createResident(scene),lake=createLake(scene);
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4}),composer=new EffectComposer(renderer,target);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(720,960),.06,.25,2.5);composer.addPass(bloom);const output=new OutputPass();composer.addPass(output);
 let width=0,height=0,frameCount=0,frameMs=0;
 function render(time:number,w:number,h:number,state:ArtState){const begin=performance.now(),t=wrap(time);renderer.info.reset();
  if(w!==width||h!==height){renderer.setSize(w,h,false);composer.setSize(w,h);lake.resize(w,h);width=w;height=h;}
  camera.aspect=w/h;camera.fov=state.cameraFov+8;const angle=(12+(state.cameraTilt-40)*.35)*Math.PI/180;
  const focus=new T.Vector3(0,2.8,0),distance=48*Math.max(1,.75/(w/h));camera.position.set(Math.sin(angle)*distance,2.8,Math.cos(angle)*distance);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  (scene.background as T.Color).set(state.palette==='nocturne'?'#1b1231':state.palette==='ultraviolet'?'#3a2051':'#3a2b50');
  lighting.update(t);house.update(t,state.motion);duck.update(t,state.motion);ghost.update(t,duck.root.position,state.motion);lake.update(t,state.river,state.trail);
  renderer.shadowMap.needsUpdate=true;composer.render(0);frameCount++;frameMs=performance.now()-begin;if(errors.length)throw Error('Shader compilation: '+errors.join('\n'));
  return {canvas:renderer.domElement,story:{t},renderer};
 }
 function dispose(){const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>();scene.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);if(o.customDepthMaterial)mats.add(o.customDepthMaterial);}if(o instanceof T.DirectionalLight||o instanceof T.SpotLight||o instanceof T.PointLight)o.shadow.dispose();});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());lake.water.dispose();env.dispose();bloom.dispose();output.dispose();composer.dispose();renderer.dispose();}
 return {render,renderer,scene,camera,dispose,diagnostics(){return {frameCount,frameMs,shaderErrors:errors,...house.diagnostics(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
}
