import * as T from 'three';
import {exchangeAngle,EXCHANGE_CENTERS} from './exchange.mjs';
import type {createArchitecture} from './architecture.ts';
import type {createResident} from './actors.ts';
/** Every piece keeps its geometry and parent-space animation; rotations happen in 3D. */
export function createWorldRig(scene:T.Scene,house:ReturnType<typeof createArchitecture>,ghost:ReturnType<typeof createResident>,day:boolean){
 scene.updateMatrixWorld(true);
 const pieces=[house.root,house.ring,...house.towers];
 const rests=pieces.map(node=>node.parent!.matrixWorld.clone());
 const delays=[0,0,0,0,0];
 const axis=new T.Vector3(.14,0,1).normalize();
 let ghostBase:T.Group|undefined;
 const rigs=pieces.map((node,i)=>{
  const turn=new T.Group(),base=new T.Group(),anchor=new T.Group();turn.name=`${day?'Day':'Night'} spatial turn ${i}`;
  scene.add(turn);turn.add(base);base.add(anchor);anchor.matrix.copy(rests[i]!);anchor.matrixAutoUpdate=false;
  anchor.add(node);
  if(node===house.home){base.add(ghost.root);ghostBase=base;}
  base.scale.y=day?-1:1;
  return {turn,base,delay:delays[i]!+(day?.18:0)};
 });
 if(!ghostBase)throw Error('The resident requires the central tower transform');
 const clips:{plane:T.Plane;rest:T.Plane}[]=[];
 ghost.root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const mat of [o.material,o.customDepthMaterial].flat())if(mat?.clippingPlanes)for(const plane of mat.clippingPlanes)clips.push({plane,rest:plane.clone()});});
 const inverse=new T.Matrix4();
 return {update(time:number,target:T.Vector3,motion:number){
  rigs.forEach(({turn,base,delay})=>{turn.quaternion.setFromAxisAngle(axis,exchangeAngle(time,delay,3.0));base.updateWorldMatrix(true,true);});
  ghostBase!.updateWorldMatrix(true,false);clips.forEach(({plane,rest})=>plane.copy(rest).applyMatrix4(ghostBase!.matrixWorld));
  inverse.copy(ghostBase!.matrixWorld).invert();
  const clock=(time-(day?.20:0)+28.8)%28.8;
  const delta=EXCHANGE_CENTERS.map(t=>clock-t).sort((a,b)=>Math.abs(a)-Math.abs(b))[0]!;
  const pulse=(a:number,width:number)=>{const u=(delta-a)/width;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;};
  const before=exchangeAngle(time-.02,day?.28:.20),after=exchangeAngle(time+.02,day?.28:.20);
  const velocity=Math.atan2(Math.sin(after-before),Math.cos(after-before))/.04;
  const settle=pulse(.65,1.4)*Math.sin((delta-.65)*7.5)*.08;
  ghost.update(time,target.clone().applyMatrix4(inverse),motion,{reach:pulse(-2.2,1.55),lean:-Math.min(.22,velocity*.13)+settle,stretch:Math.min(1,Math.abs(velocity)*.55)+pulse(-2.2,1.55)*.45,squint:Math.min(1,Math.abs(velocity)*.45)});
 },rigs};
}
