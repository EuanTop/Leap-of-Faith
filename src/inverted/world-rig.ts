import * as T from 'three';
import {exchangeAngle} from './exchange.mjs';
import type {createArchitecture} from './architecture.ts';
import type {createResident} from './actors.ts';
// Corresponding rooms exchange their actual centres. Separate depth corridors
// let the two castles pass one another without intersecting at the water.
const PATHS=[
 {x:0,z:0,yaw:0,delay:0,swap:false}, // shared supporting crown
 {x:0,z:11,yaw:.10,delay:-.30,swap:true},
 {x:-4.5,z:4.6,yaw:-.10,delay:-.16,swap:true},
 {x:4.0,z:4.6,yaw:.10,delay:.18,swap:true},
 {x:0,z:-5.2,yaw:-.08,delay:.38,swap:true},
];
/** A module turns about its own centre while translating to its counterpart. */
export function createWorldRig(scene:T.Scene,house:ReturnType<typeof createArchitecture>,ghost:ReturnType<typeof createResident>,day:boolean){
 scene.updateMatrixWorld(true);
 const pieces=[house.root,house.ring,...house.towers],rests=pieces.map(node=>node.parent!.matrixWorld.clone());
 let ghostBase:T.Group|undefined;
 const rigs=pieces.map((node,i)=>{
  const turn=new T.Group(),pivot=new T.Group(),offset=new T.Group(),base=new T.Group(),anchor=new T.Group();
  turn.name=`${day?'Day':'Night'} exchanging module ${i}`;
  scene.add(turn);turn.add(pivot);pivot.add(offset);offset.add(base);base.add(anchor);
  anchor.matrix.copy(rests[i]!);anchor.matrixAutoUpdate=false;anchor.add(node);
  if(node===house.home){base.add(ghost.root);ghostBase=base;}
  base.scale.y=day?-1:1;
  return {node,turn,pivot,offset,base,path:PATHS[i]!,start:new T.Vector3(),target:new T.Vector3()};
 });
 // Measure after every child module has been detached from the supporting frame.
 scene.updateMatrixWorld(true);
 rigs.forEach(r=>{
  new T.Box3().setFromObject(r.node).getCenter(r.start);
  r.target.copy(r.start);r.target.y*=-1;
  r.pivot.position.copy(r.start);r.offset.position.copy(r.start).negate();
 });
 if(!ghostBase)throw Error('The resident requires the central tower transform');
 const clips:{plane:T.Plane;rest:T.Plane}[]=[];
 ghost.root.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const mat of [o.material,o.customDepthMaterial].flat())if(mat?.clippingPlanes)for(const plane of mat.clippingPlanes)clips.push({plane,rest:plane.clone()});});
 const inverse=new T.Matrix4();
 return {rigs,pairWith(other:{rigs:{start:T.Vector3}[]}){
  if(other.rigs.length!==rigs.length)throw Error('Castle module pairs do not match');
  rigs.forEach((r,i)=>r.target.copy(other.rigs[i]!.start));
 },update(time:number,target:T.Vector3,motion:number){
  const amount=Math.min(1.35,Math.max(0,motion)),side=day?-1:1;
  rigs.forEach(({turn,pivot,base,path,start,target:destination})=>{
   const q=path.swap&&motion>0?(1-Math.cos(exchangeAngle(time,path.delay+(day?.18:0),3.2)))*.5:0;
   const arc=Math.sin(Math.PI*q);
   turn.position.copy(destination).sub(start).multiplyScalar(q);
   turn.position.x+=path.x*arc;
   turn.position.z+=side*path.z*arc;
   // Local reorientation keeps windows and residents upright in the arrival realm;
   // no group rotates around the centre of the whole composition.
   pivot.rotation.set(0,side*path.yaw*arc*amount,Math.PI*q);
   pivot.scale.setScalar(1-(path===PATHS[1] ? .18 : 0)*arc);
   base.updateWorldMatrix(true,true);
  });
  ghostBase!.updateWorldMatrix(true,false);
  inverse.copy(ghostBase!.matrixWorld).invert();ghost.update(time,target.clone().applyMatrix4(inverse),motion);
  clips.forEach(({plane,rest})=>plane.copy(rest).applyMatrix4(ghostBase!.matrixWorld));
 }};
}
