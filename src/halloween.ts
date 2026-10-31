import * as T from 'three';
import {habitatFrame,PODS} from './habitat-path.ts';
import {TAU,DURATION} from './story.ts';

/** Small integrated lanterns; every base is placed on a living bay's floor. */
export function addHalloween(root:T.Group){
 const items:{root:T.Group;floor:number;size:number;phase:number;glow:T.MeshBasicMaterial}[]=[];
 const ribbed=new T.SphereGeometry(1,32,20),p=ribbed.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.075*Math.cos(Math.atan2(z,x)*9);p.setXYZ(i,x*r,y*.78,z*r);}ribbed.computeVertexNormals();
 const orange=new T.MeshStandardMaterial({color:'#e98c29',roughness:.50}),stemMat=new T.MeshStandardMaterial({color:'#514c36',roughness:1});
 function pumpkin(parent:T.Object3D,x:number,y:number,z:number,size:number,phase:number){
  const g=new T.Group();parent.add(g);g.position.set(x,y+size*.8,z);g.scale.setScalar(size);
  const fruit=new T.Mesh(ribbed,orange);fruit.castShadow=true;fruit.receiveShadow=true;g.add(fruit);
  const stem=new T.Mesh(new T.CylinderGeometry(.07,.11,.32,8),stemMat);stem.position.set(.03,.87,0);stem.rotation.z=-.18;g.add(stem);
  const glow=new T.MeshBasicMaterial({color:new T.Color('#ffcf60').multiplyScalar(2.2)});
  for(const side of[-1,1]){const s=new T.Shape();s.moveTo(0,.18);s.lineTo(-.15,-.10);s.lineTo(.15,-.10);s.closePath();const eye=new T.Mesh(new T.ShapeGeometry(s),glow);eye.position.set(side*.30,.13,.945);g.add(eye);}
  const smile=new T.Mesh(new T.TorusGeometry(.31,.055,6,18,Math.PI),glow);smile.rotation.z=Math.PI;smile.position.set(0,-.18,.95);g.add(smile);
  items.push({root:g,floor:y,size,phase,glow});return g;
 }
 const sweets=new T.MeshStandardMaterial({color:'#edaf65',roughness:.4});
 PODS.forEach((t,i)=>{
  const f=habitatFrame(t),g=new T.Group();g.position.copy(f.floor);g.quaternion.copy(f.quaternion);root.add(g);
  // Cluster lanterns at each entrance, beyond the clear central swimming lane.
  pumpkin(g,-1.48,.05,.9,.44,i);pumpkin(g,-1.88,.05,.30,.29,i+1.3);
  if(i===0)pumpkin(g,1.66,1.01,1.03,.20,i+.8);
  if(i===2){
   pumpkin(g,1.73,.87,.40,.28,i+.4);
   for(let j=0;j<6;j++){const sweet=new T.Mesh(new T.OctahedronGeometry(.065,0),sweets);sweet.position.set(1.55+(j%3)*.13,.91,-.70+Math.floor(j/3)*.15);sweet.rotation.set(j,.2,j*.3);g.add(sweet);}
  }
  // One pale hanging sheet mask replaces the central decorative laundry panel.
  if(i===1){
   const s=new T.Shape();s.moveTo(-.23,0);s.quadraticCurveTo(-.23,.52,0,.52);s.quadraticCurveTo(.23,.52,.23,0);s.lineTo(.27,-.23);s.quadraticCurveTo(.12,-.08,0,-.25);s.quadraticCurveTo(-.12,-.08,-.27,-.23);s.closePath();
   const cloth=new T.Mesh(new T.ShapeGeometry(s,16),new T.MeshStandardMaterial({color:'#f4dfec',roughness:.9,side:T.DoubleSide}));cloth.position.set(-1.03,1.43,0);cloth.rotation.y=Math.PI/2;g.add(cloth);
   for(const z of[-.09,.09]){const eye=new T.Mesh(new T.SphereGeometry(.045,12,8),new T.MeshBasicMaterial({color:'#38203e'}));eye.scale.set(.25,1,1);eye.position.set(-1.005,1.62,z);g.add(eye);}
  }
 });
 return {update(time:number){const ph=time/DURATION*TAU;for(const q of items){q.glow.color.set('#ffd07a').multiplyScalar(1.7+.3*Math.sin(ph*5+q.phase)+.12*Math.sin(ph*9+q.phase*2));q.root.rotation.z=.018*Math.sin(ph*2+q.phase);}}};
}
