import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function arch(w:number,h:number){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.closePath();return s;}
export function block(g:T.Object3D,size:number[],at:number[],mat:T.Material){const m=new T.Mesh(new RoundedBoxGeometry(size[0]!,size[1]!,size[2]!,2,Math.min(.045,...size.map(v=>v*.12))),mat);m.position.set(at[0]!,at[1]!,at[2]!);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function rod(g:T.Object3D,a:T.Vector3,b:T.Vector3,r:number,mat:T.Material){const d=b.clone().sub(a),m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),8),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());m.castShadow=true;g.add(m);return m;}
export function cylinder(g:T.Object3D,r:number,h:number,y:number,mat:T.Material){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,64),mat);m.position.y=y;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function batch(root:T.Group){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map<T.Material,T.BufferGeometry[]>(),remove:T.Mesh[]=[];
 root.traverse(o=>{if(!(o instanceof T.Mesh)||Array.isArray(o.material)||o.userData.dynamic||o.material.transparent)return;let p=o.parent;while(p&&p!==root){if(p.userData.dynamic)return;p=p.parent;}
  let g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(g.index)g=g.toNonIndexed();for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position!.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material)!.push(g);remove.push(o);
 });remove.forEach(m=>m.removeFromParent());for(const [mat,parts] of groups){const geo=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;root.add(m);}
}
export function gallery(radius:number,start:number,sweep:number,y0:number,y1:number,width:number,depth:number){
 const pos:number[]=[],ids:number[]=[],n=160;
 for(let i=0;i<=n;i++){const a=start+sweep*i/n,y=T.MathUtils.lerp(y0,y1,i/n);for(const yy of [y-depth,y])for(const rr of [radius-width/2,radius+width/2])pos.push(Math.sin(a)*rr,yy,Math.cos(a)*rr);}
 for(let i=0;i<n;i++){const a=i*4,b=a+4;ids.push(a+2,b+2,a+3,a+3,b+2,b+3,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1,a,b+1,b,a,a+1,b+1);}
 for(let i=0;i<ids.length;i+=3){const b=ids[i+1]!;ids[i+1]=ids[i+2]!;ids[i+2]=b;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();return g;
}
