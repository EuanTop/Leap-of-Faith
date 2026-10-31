import * as THREE from 'three';
import {SUPPORT_POINTS,clothHoldTargets} from './display-motion.ts';
import {TAU,DURATION,wrap} from './story.ts';
import {ghostGeometry,warpGhost,GHOST_WARP_GLSL,PALMS} from './ghost-model.ts';

export function createGhosts(scene:THREE.Scene){
 const root=new THREE.Group();root.name='The dreamer below';scene.add(root);
 const giant=new THREE.Group();root.add(giant);
 const angle=THREE.MathUtils.degToRad(28);
 const uniforms={uPhase:{value:0},uMotion:{value:1},uHeadPitch:{value:-.60},uHeadYaw:{value:0},uLeftShift:{value:new THREE.Vector3()},uRightShift:{value:new THREE.Vector3()}};
 const shifts=[uniforms.uLeftShift.value,uniforms.uRightShift.value];
 const material=new THREE.MeshPhysicalMaterial({color:'#f2e4ff',roughness:.40,metalness:0,sheen:.65,sheenColor:new THREE.Color('#b495f1'),sheenRoughness:.7,clearcoat:.12,clearcoatRoughness:.4,emissive:'#d8c1de',emissiveIntensity:.04});
 material.onBeforeCompile=(s:any)=>{
  Object.assign(s.uniforms,uniforms);s.vertexShader=GHOST_WARP_GLSL+'\nvarying vec3 vClothWorld,vClothNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`
   vec3 n=normalize(normal),axis=abs(n.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.);
   vec3 t=normalize(cross(n,axis)),b=cross(n,t),base=warpGhost(position);
   vec3 objectNormal=normalize(cross(warpGhost(position+t*.01)-base,warpGhost(position+b*.01)-base));
  `);
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=warpGhost(position);vClothWorld=(modelMatrix*vec4(transformed,1.)).xyz;vClothNormal=normalize(mat3(modelMatrix)*objectNormal);');
  s.fragmentShader='varying vec3 vClothWorld,vClothNormal;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 clothN=normalize(vClothNormal),eye=normalize(cameraPosition-vClothWorld);
   float edge=pow(1.-abs(dot(clothN,eye)),2.7),warm=max(0.,dot(clothN,normalize(vec3(-.62,.70,.35))));
   outgoingLight+=vec3(.35,.20,.055)*edge*(.24+.76*warm);
   #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=> 'rounded-ghost-sway-reach-and-wrist-v2';
 const body=new THREE.Mesh(ghostGeometry(),material);body.frustumCulled=false;giant.add(body);
 const ink=new THREE.MeshPhysicalMaterial({color:'#382050',roughness:.32,clearcoat:.35}),sparkle=new THREE.MeshBasicMaterial({color:'#fff4d6'});
 const arms=[-1,1].map(sign=>({sign,tip:new THREE.Vector3()}));
 const eyes=[-1,1].map(sign=>{
  const rig=new THREE.Group(),pupil=new THREE.Group();giant.add(rig);rig.add(pupil);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),ink);eye.scale.set(.54,.72,.10);pupil.add(eye);
  const glint=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),sparkle);glint.scale.set(.055,.070,.018);glint.position.set(-.10,.17,.10);pupil.add(glint);
  const x=sign*1.30,y=-.20,z=4.2*Math.sqrt(1-(x/6)**2-((y+4)/6)**2);
  const rest=new THREE.Vector3(x,y,z),normal=new THREE.Vector3(x/36,(y+4)/36,z/(4.2*4.2)).normalize();
  return {rig,pupil,rest,normal};
 });
 const deform=(p:THREE.Vector3)=>warpGhost(p,uniforms.uPhase.value,uniforms.uMotion.value,uniforms.uHeadPitch.value,uniforms.uHeadYaw.value,shifts);
 return {root,population:1,eyes,arms,body,deform,update(time:number,duck:THREE.Vector3,motion:number,buildingSupports=SUPPORT_POINTS){
  const phase=wrap(time)/DURATION*TAU,m=Math.min(motion,1.5),supports=clothHoldTargets(buildingSupports,time,motion);
  uniforms.uPhase.value=phase;uniforms.uMotion.value=motion;
  const sway=.60*Math.sin(phase*2)*m;
  giant.position.set(5.4*Math.sin(angle)+Math.cos(angle)*sway,-5.0+.30*Math.sin(phase*2)*m,5.4*Math.cos(angle)-Math.sin(angle)*sway);
  const toDuck=duck.clone().sub(giant.position).applyAxisAngle(new THREE.Vector3(0,1,0),-angle),attention=THREE.MathUtils.clamp(Math.atan2(toDuck.x,Math.max(9,toDuck.y)),-.8,.8);
  giant.rotation.set(.015*Math.sin(phase*2+.6)*m,angle+(attention*.12+.08*Math.sin(phase*2-.5))*m,(.060*Math.sin(phase*2)+.020*Math.sin(phase*3+.4))*m);
  uniforms.uHeadPitch.value=-.60-.035*Math.min(1,toDuck.y/14)*m+.045*Math.sin(phase*2+.3)*m;uniforms.uHeadYaw.value=attention*.32*m;
  giant.updateMatrixWorld(true);
  supports.forEach((p,i)=>shifts[i].copy(giant.worldToLocal(p.clone())).sub(PALMS[i]));
  for(const {rig,rest,normal} of eyes){
   const axis=Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0),tangent=normal.clone().cross(axis).normalize(),bitangent=normal.clone().cross(tangent);
   const p=deform(rest),n=deform(rest.clone().addScaledVector(tangent,.01)).sub(p).cross(deform(rest.clone().addScaledVector(bitangent,.01)).sub(p)).normalize();
   rig.position.copy(p).addScaledVector(n,.08);const up=new THREE.Vector3(0,1,0).addScaledVector(n,-n.y).normalize(),right=up.clone().cross(n).normalize();rig.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,n));
  }
  giant.updateMatrixWorld(true);
  arms.forEach((arm,i)=>{arm.tip.copy(deform(PALMS[i]));giant.localToWorld(arm.tip)});
  for(const {rig,pupil} of eyes){
   const target=rig.worldToLocal(duck.clone()).normalize();pupil.position.set(THREE.MathUtils.clamp(target.x*.35,-.25,.25),THREE.MathUtils.clamp(target.y*.25,-.10,.22),0);
   pupil.scale.y=1-.9*Math.pow(Math.max(0,Math.cos(phase*3+.4)),28)*Math.min(m,1);
  }
 }};
}
