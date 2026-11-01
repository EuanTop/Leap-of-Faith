import * as T from 'three';
import {castleCue,alarmAt} from './choreography.ts';
import {GHOST_HOME} from './architecture.ts';
import type {createArchitecture} from './architecture.ts';
import type {createResident} from './actors.ts';
// Corresponding rooms exchange their actual centres. Separate depth corridors
// let the two castles pass one another without intersecting at the water.
const PATHS=[
 {x:0,z:0,yaw:0,delay:0,swap:false}, // shared supporting crown
 {x:0,z:11,yaw:.10,delay:.07,swap:true},
 {x:-4.5,z:4.6,yaw:-.10,delay:0,swap:true},
 {x:4.0,z:4.6,yaw:.10,delay:.13,swap:true},
 {x:0,z:-5.2,yaw:-.08,delay:.24,swap:true},
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
 const inverse=new T.Matrix4(),previousMatrix=new T.Matrix4(),lag=new T.Vector3(),ahead=new T.Vector3();
 const homeRig=rigs.find(r=>r.node===house.home)!;
 function pose(r:typeof rigs[number],time:number,motion:number){
  const {turn,pivot,base,path,start,target:destination}=r,amount=Math.min(1.35,Math.max(0,motion)),side=day?-1:1;
  const cue=castleCue(time,path.delay+(day?.08:0)),q=path.swap&&motion>0?cue.q:0,arc=Math.sin(Math.PI*q),index=rigs.indexOf(r),sway=Math.sin(Math.PI*2*cue.u+index*.83);
  turn.position.copy(destination).sub(start).multiplyScalar(q);
  turn.position.x+=path.x*arc*(1+.07*sway)+.22*arc*sway;
  turn.position.z+=side*path.z*arc*(1+.065*Math.sin(Math.PI*2*cue.u+index));
  turn.position.y+=.35*arc*sway;
  pivot.rotation.set(.035*arc*sway*amount,side*path.yaw*arc*(.7+.3*sway)*amount,Math.PI*q+.045*arc*sway);
  pivot.scale.setScalar(1-(path===PATHS[1] ? .14 : 0)*arc);
  base.updateWorldMatrix(true,true);return cue;
 }
 return {rigs,pairWith(other:{rigs:{start:T.Vector3}[]}){
  if(other.rigs.length!==rigs.length)throw Error('Castle module pairs do not match');
  rigs.forEach((r,i)=>r.target.copy(other.rigs[i]!.start));
 },update(time:number,target:T.Vector3,motion:number){
  rigs.forEach(r=>pose(r,time,motion));
  // Sample the earlier room pose rather than integrating mutable follower state.
  // This keeps its small reaction delay repeatable while scrubbing and exporting.
  pose(homeRig,time-.16,motion);previousMatrix.copy(ghostBase!.matrixWorld);
  const cue=pose(homeRig,time,motion);inverse.copy(ghostBase!.matrixWorld).invert();
  lag.copy(GHOST_HOME).applyMatrix4(previousMatrix).applyMatrix4(inverse).sub(GHOST_HOME).clampLength(0,.65);
  const panic=cue.active?alarmAt(cue.u)*Math.min(1,motion):0;
  ahead.copy(GHOST_HOME).addScaledVector(lag,-5);ahead.z+=8;ahead.y+=2;
  const look=target.clone().applyMatrix4(inverse).lerp(ahead,panic*.8);
  ghost.update(time,look,motion,{reach:0,lean:-lag.x*.14,stretch:panic*.22,squint:0,lag,panic});
  clips.forEach(({plane,rest})=>plane.copy(rest).applyMatrix4(ghostBase!.matrixWorld));
 }};
}
