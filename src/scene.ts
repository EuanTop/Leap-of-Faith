import * as THREE from 'three';
import {createHabitat} from './habitat.ts';
import {createDuck,poseDuck} from './duck.ts';
import {createGhosts} from './ghosts.ts';
import {createLightDesign} from './lighting.ts';
import {applyDisplayPose,DISPLAY_PIVOT,SUPPORT_POINTS} from './display-motion.ts';
import {story,type ArtState} from './story.ts';

export function createArtwork(){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#36204e');
 const camera=new THREE.PerspectiveCamera(38,.75,.1,180);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{throw Error('GLSL compilation failed: '+gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(vertex)+' '+gl.getShaderInfoLog(fragment))};
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const lighting=createLightDesign(scene,renderer);
 const habitat=createHabitat(scene,renderer),character=createDuck(),duck=character.root,ghosts=createGhosts(scene);
 const display=new THREE.Group(),content=new THREE.Group();scene.add(display);display.add(content);content.position.copy(DISPLAY_PIVOT).negate();content.add(habitat.root,duck,lighting.glows);
 let width=0,height=0;
 function render(time:number,w:number,h:number,state:ArtState){
  const st=story(time),motion=state.motion;
  if(w!==width||h!==height){renderer.setSize(w,h,false);width=w;height=h}
  camera.aspect=w/h;camera.fov=state.cameraFov??38;camera.updateProjectionMatrix();
  const target=new THREE.Vector3(0,.9,0),distance=56*Math.max(1,.70/(w/h));camera.position.setFromSphericalCoords(distance,THREE.MathUtils.degToRad(90-(state.cameraTilt??34)),THREE.MathUtils.degToRad(28));camera.position.add(target);camera.lookAt(target);
  const background=state.palette==='nocturne'?'#170d2b':state.palette==='ultraviolet'?'#5b2783':'#36204e';(scene.background as THREE.Color).set(background);
  lighting.update(st.t);const acting=habitat.update(st.t,motion);habitat.galaxy.uniforms.uStrength.value=state.river;habitat.galaxy.uniforms.uDuckArc.value=st.routeU;habitat.galaxy.uniforms.uDuckClock.value=st.u;habitat.galaxy.uniforms.uTrailStrength.value=state.trail??1;
  poseDuck(character,st,motion,habitat.targets,acting);
  applyDisplayPose(display,st.t,motion);
  const worldDuck=duck.getWorldPosition(new THREE.Vector3());
  const supports=SUPPORT_POINTS.map(p=>content.localToWorld(p.clone()));
  ghosts.update(st.t,worldDuck,motion,supports);renderer.render(scene,camera);return {canvas:renderer.domElement,story:st,renderer};
 }
 return {render,renderer,scene,camera};
}
