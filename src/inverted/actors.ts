import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createDuck} from '../duck.ts';
import {ghostGeometry,warpGhost,GHOST_WARP_GLSL} from '../ghost-model.ts';
import {DURATION,TAU,wrap} from '../story.ts';
import {GHOST_HOME} from './architecture.ts';
import {exchangeAt} from './exchange.mjs';

export function duckPose(time:number){const phase=wrap(time+exchangeAt(time).routeOffset)/DURATION*TAU;return {phase,position:new T.Vector3(6.0+4.0*Math.sin(phase),-.175,28.0+2.6*Math.cos(phase)),yaw:Math.atan2(4.0*Math.cos(phase),-2.6*Math.sin(phase))};}
export function swimPosition(time:number,kind:'duck'|'swan'='duck'){
 const p=duckPose(time),separation=exchangeAt(time).separation*(kind==='duck'?1:-1);
 p.position.x+=Math.sin(p.yaw)*separation;p.position.z+=Math.cos(p.yaw)*separation;return p;
}
export function createSwimmer(scene:T.Scene){
 const c=createDuck();c.root.scale.setScalar(.40);c.feet.forEach(f=>f.visible=false);scene.add(c.root);
 return {root:c.root,update(time:number,motion:number){const p=swimPosition(time),ex=exchangeAt(time);c.root.position.copy(p.position);c.root.position.y=-.065*Math.cos(ex.actorAngle)+.014*Math.sin(p.phase*8)*motion+ex.duckHeight;c.root.rotation.set(ex.pitch+.018*Math.sin(p.phase*6)*motion,p.yaw,0,'YXZ');c.root.rotateZ(ex.actorAngle+.025*Math.sin(p.phase*8)*motion);
  c.neck.rotation.y=.08*Math.sin(p.phase*3)*motion;c.neck.rotation.x=.045*Math.sin(p.phase*4)*motion;c.body.bend.value=.020*Math.sin(p.phase*6)*motion;c.forms.forEach(f=>f.time.value=wrap(time));
  c.wings.forEach((w,i)=>{w.rotation.z=(i?1:-1)*(.04+.05*Math.sin(p.phase*8+i)*motion+ex.duckFlap*(.15+.80*Math.sin(ex.flapClock*4.3)**2)*Math.min(1.4,motion));});
  const blink=Math.max(...[3.2,10.4,17.1,25].map(t=>{let d=wrap(time)-t;d-=Math.round(d/DURATION)*DURATION;return Math.exp(-Math.pow(d/.075,4));}));c.eyes.forEach(e=>e.mesh.scale.y=1-blink*.92);c.glints.forEach(e=>e.mesh.visible=blink<.5);
 }};
}
function residentGeometry(){
 const original=ghostGeometry(),p=original.attributes.position,n=original.attributes.normal,out:number[]=[],normals:number[]=[];
 // Reuse the previous work's continuous crown and draped robe, leaving sleeves
 // out of this resident. The open bottom is hidden behind a solid parapet.
 for(let i=0;i<p.count;i+=3){const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,y=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;if(Math.abs(x)>5.8||y< -13.0)continue;for(let k=0;k<3;k++){const yy=p.getY(i+k),xx=p.getX(i+k),zz=p.getZ(i+k),fold=1+.085*T.MathUtils.smoothstep(-yy,2,12)*Math.cos(Math.atan2(xx,zz/.70)*5+.3);out.push(xx*fold,yy,zz*fold);normals.push(n.getX(i+k),n.getY(i+k),n.getZ(i+k));}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));const smooth=mergeVertices(g);smooth.computeVertexNormals();smooth.computeBoundingSphere();g.dispose();return smooth;
}
export function createResident(scene:T.Scene){
 const root=new T.Group(),bodyRig=new T.Group();root.position.copy(GHOST_HOME);root.scale.setScalar(.23);root.add(bodyRig);scene.add(root);
 const shifts=[new T.Vector3(),new T.Vector3()],uniforms={uPhase:{value:0},uMotion:{value:1},uHeadPitch:{value:.16},uHeadYaw:{value:0},uLeftShift:{value:shifts[0]},uRightShift:{value:shifts[1]}};
 const mat=new T.MeshPhysicalMaterial({color:'#f5e8ee',roughness:.62,sheen:.45,sheenColor:new T.Color('#bca5d9'),sheenRoughness:.8,clippingPlanes:[new T.Plane(new T.Vector3(0,1,0),-7.32)],clipShadows:true});
 function deformShader(s:any){Object.assign(s.uniforms,uniforms);s.vertexShader=GHOST_WARP_GLSL+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=warpGhost(position);');s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>',`vec3 axis=abs(normal.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.);vec3 tangent=normalize(cross(normal,axis)),bi=cross(normal,tangent),base=warpGhost(position);vec3 objectNormal=normalize(cross(warpGhost(position+tangent*.01)-base,warpGhost(position+bi*.01)-base));`);}
 mat.onBeforeCompile=deformShader;mat.customProgramCacheKey=()=> 'resident-cloth-v1';const body=new T.Mesh(residentGeometry(),mat);body.castShadow=true;body.receiveShadow=true;bodyRig.add(body);
 const depth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,clippingPlanes:[new T.Plane(new T.Vector3(0,1,0),-7.32)],clipShadows:true});depth.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=GHOST_WARP_GLSL+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=warpGhost(position);');};body.customDepthMaterial=depth;
 const eyes=[-1,1].map(sign=>{
  const eye=new T.Mesh(new T.SphereGeometry(1,28,20),new T.MeshBasicMaterial({color:'#25152f'}));eye.scale.set(.54,.72,.13);bodyRig.add(eye);
  const x=sign*1.30,y=-.20,z=4.2*Math.sqrt(1-(x/6)**2-((y+4)/6)**2);return {eye,rest:new T.Vector3(x,y,z)};
 });
 return {root,update(time:number,duck:T.Vector3,motion:number,reaction={reach:0,lean:0,stretch:0,squint:0}){const phase=wrap(time)/DURATION*TAU;
  root.position.copy(GHOST_HOME);root.position.y+=(.09*Math.sin(phase*2)+.28*reaction.reach)*motion;
  root.position.z+=.30*reaction.reach*motion;
  root.rotation.z=(.045*Math.sin(phase*2)+reaction.lean)*motion;
  root.scale.set(.23*(1-.05*reaction.stretch),.23*(1+.15*reaction.stretch),.23);
  bodyRig.rotation.x=(.10*reaction.reach+.025*Math.sin(phase*3))*motion;
  bodyRig.rotation.z=.05*Math.sin(phase*2+.8)*motion;
  const aim=duck.clone().sub(root.position);uniforms.uHeadYaw.value=T.MathUtils.clamp(Math.atan2(aim.x,Math.max(3,aim.z)),-.42,.42)*motion;uniforms.uHeadPitch.value=.18+(.075*Math.sin(phase*2)+.14*reaction.reach)*motion;uniforms.uPhase.value=phase;uniforms.uMotion.value=motion;
  const blink=1-.88*Math.pow(Math.max(0,Math.cos(phase*3+.5)),28)*Math.min(motion,1);
  eyes.forEach(({eye,rest})=>{const point=warpGhost(rest,phase,motion,uniforms.uHeadPitch.value,uniforms.uHeadYaw.value,shifts);eye.position.copy(point);eye.position.z+=.28;eye.rotation.set(.18,uniforms.uHeadYaw.value,0);eye.scale.y=.72*blink*(1+.20*reaction.reach-.24*reaction.squint);});
 }};
}
