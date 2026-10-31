import * as T from 'three';
import {arch,block,rod,cylinder,gallery,batch} from './geometry.ts';
import {wall,trim,edge,iron,glow,glass,stone} from './materials.ts';
import {DURATION,TAU} from '../story.ts';

export const GHOST_HOME=new T.Vector3(-.72,9.20,5.18);
export function createArchitecture(scene:T.Scene,mirror=false){
 const root=new T.Group();root.name='Inverted house / suspended from above';root.position.y=-3;root.scale.x=1.20;scene.add(root);
 const candles:{mesh:T.Mesh;phase:number;light?:T.PointLight}[]=[],pendants:{group:T.Group;phase:number}[]=[];
 const amber=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{phase:{value:0}},vertexShader:`varying vec2 q;void main(){q=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 q;uniform float phase;void main(){float hot=exp(-pow(q.x*.8,2.)-pow((q.y-1.5)*.3,2.));vec3 c=mix(vec3(.21,.030,.020),vec3(1.9,.62,.10),hot)*(.96+.04*sin(phase));gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 function candle(g:T.Object3D,x:number,y:number,z:number,index:number){
  const wax=new T.Mesh(new T.CylinderGeometry(.055,.061,.52,12),new T.MeshStandardMaterial({color:'#e4c5a0',roughness:.75}));wax.position.set(x,y+.26,z);g.add(wax);
  const fire=new T.Mesh(new T.SphereGeometry(1,12,8),glow);fire.userData.dynamic=true;fire.scale.set(.044,.11,.044);fire.position.set(x,y+.58,z);g.add(fire);candles.push({mesh:fire,phase:index*1.73});
 }
 function tower(at:T.Vector3,r:number,h:number,hasGlass:boolean,hero=false){
  const g=new T.Group();g.position.copy(at);root.add(g);
  const facadeShape=new T.Shape();facadeShape.moveTo(-r,0);facadeShape.lineTo(r,0);facadeShape.lineTo(r,h);facadeShape.lineTo(-r,h);facadeShape.closePath();
  const door=arch(r*1.30,h*.70);facadeShape.holes.push(new T.Path(door.getPoints(56).map(p=>p.add(new T.Vector2(0,.32)))));
  const geo=new T.ExtrudeGeometry(facadeShape,{depth:.24,bevelEnabled:false,curveSegments:40}),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,p.getZ(i)+Math.sqrt(Math.max(0,r*r-x*x)));}geo.computeVertexNormals();
  const facade=new T.Mesh(geo,wall);facade.castShadow=true;facade.receiveShadow=true;g.add(facade);
  const back=new T.Mesh(new T.CylinderGeometry(r,r,h,72,1,true,Math.PI/2,Math.PI),wall);back.position.y=h/2;back.castShadow=true;back.receiveShadow=true;g.add(back);
  cylinder(g,r+.20,.30,.08,trim);cylinder(g,r+.24,.10,.30,edge);cylinder(g,r+.13,.26,h-.12,trim);
  const ceiling=new T.Mesh(new T.CircleGeometry(r-.04,64),trim);ceiling.rotation.x=Math.PI/2;ceiling.position.y=h-.18;g.add(ceiling);
  // A front opening is actual empty geometry; its bright rear surface is recessed.
  const rear=new T.Mesh(new T.ShapeGeometry(arch(r*1.30,h*.70)),amber);rear.position.set(0,.32,-r*.35);g.add(rear);
  const floor=new T.Mesh(new T.CircleGeometry(r-.05,64),trim);floor.rotation.x=-Math.PI/2;floor.position.y=.26;floor.receiveShadow=true;g.add(floor);
  const rim=arch(r*1.30+.22,h*.70+.11);rim.holes.push(new T.Path(arch(r*1.30,h*.70).getPoints(56)));
  const rimGeo=new T.ExtrudeGeometry(rim,{depth:.16,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,curveSegments:40}),rp=rimGeo.attributes.position;
  for(let i=0;i<rp.count;i++){const x=rp.getX(i);rp.setZ(i,rp.getZ(i)+Math.sqrt(Math.max(0,r*r-x*x))+.04);}rimGeo.computeVertexNormals();
  const frame=new T.Mesh(rimGeo,trim);frame.position.y=.32;frame.castShadow=true;g.add(frame);
  const cone=new T.Mesh(new T.ConeGeometry(r*.90,r*1.6,48),wall);cone.rotation.z=Math.PI;cone.position.y=-r*.75;cone.castShadow=true;g.add(cone);
  cylinder(g,r*.78,.14,-r*.2,edge);
  const finial=new T.Mesh(new T.ConeGeometry(r*.14,.82,24),trim);finial.rotation.z=Math.PI;finial.position.y=-r*1.62-.22;g.add(finial);
  if(hasGlass){
   const shell=new T.Mesh(new T.CylinderGeometry(r+.04,r+.04,h-.7,64,1,true,-Math.PI*.34,Math.PI*.68),glass);shell.position.y=h*.5+.10;g.add(shell);
   for(let j=0;j<9;j++){const a=-Math.PI*.34+j/8*Math.PI*.68;rod(g,new T.Vector3(Math.sin(a)*(r+.08),.35,Math.cos(a)*(r+.08)),new T.Vector3(Math.sin(a)*(r+.08),h-.35,Math.cos(a)*(r+.08)),.025,iron);}
  }
  // Sparse railings expose the scale, leaving the ghost opening readable.
  if(!hero)for(let j=0;j<22;j++){const a=-Math.PI*.62+j/21*Math.PI*1.24;rod(g,new T.Vector3(Math.sin(a)*(r+.15),.33,Math.cos(a)*(r+.15)),new T.Vector3(Math.sin(a)*(r+.15),.88,Math.cos(a)*(r+.15)),.023,iron);}
  for(const x of[-.50,.50])candle(g,x,.30,-.1,at.x+x);
  const light=new T.PointLight('#ffb257',hero?8:13,12,2);light.position.set(0,2.4,.25);g.add(light);const spill=new T.PointLight('#ffae57',hero?3:7,10,2);spill.position.set(0,2.0,r+.65);g.add(spill);
  return g;
 }
 tower(new T.Vector3(-6.2,13.1,-1.0),mirror?1.95:1.75,mirror?9.3:8.6,true);
 tower(new T.Vector3(5.4,14.0,-2.4),mirror?1.85:2.05,mirror?7.5:8.0,true);
 const home=tower(new T.Vector3(-.6,10.0,4.2),1.90,8.4,false,true);
 // Low curved parapet hides the robe's cropped lower edge, while the head remains visible.
 const lip=new T.Mesh(gallery(2.0,-.9,1.8,.76,.76,.18,.45),trim);home.add(lip);
 // Upper supporting mass is visibly cropped above the frame, anchoring the inverted world.
 const ceiling=new T.Group();root.add(ceiling);cylinder(ceiling,7.5,1.4,22.4,wall);cylinder(ceiling,7.8,.22,21.65,trim);cylinder(ceiling,4.5,10.0,27.8,wall);
 const ramp=new T.Mesh(gallery(6.3,-.6,Math.PI*(mirror?2.55:2.15),20.6,14.9,1.85,.40),trim);ramp.castShadow=true;ramp.receiveShadow=true;root.add(ramp);
 const parapet=new T.Mesh(gallery(7.16,-.6,Math.PI*(mirror?2.55:2.15),21.12,15.42,.18,.65),wall);parapet.castShadow=true;parapet.receiveShadow=true;root.add(parapet);
 const insideEdge=new T.Mesh(gallery(5.43,-.6,Math.PI*(mirror?2.55:2.15),20.77,15.07,.12,.22),edge);root.add(insideEdge);
 // Inverted stepped termination below the central chamber.
 for(let i=0;i<8;i++)block(root,[1.75-i*.14,.28,1.20-i*.085],[-.6,9.60-i*.32,4.2+i*.04],i%2?wall:trim);
 // Hung lanterns are light sources, not repeating furniture props.
 const pumpkinGeometry=new T.SphereGeometry(1,32,20),pp=pumpkinGeometry.attributes.position;
 for(let i=0;i<pp.count;i++){const x=pp.getX(i),z=pp.getZ(i),r=1+.07*Math.cos(Math.atan2(z,x)*9);pp.setXYZ(i,x*r,pp.getY(i)*.82,z*r);}pumpkinGeometry.computeVertexNormals();
 const pumpkinMat=new T.MeshStandardMaterial({color:'#b95e19',roughness:.58}),stem=stone('#56483c');
 for(const [x,y,z,size] of [[-8.1,12.9,2.0,.43],[3.9,10.2,3.7,.52],[7.7,15.0,.8,.38]]){
  const pendant=new T.Group();pendant.userData.dynamic=true;pendant.position.set(x!,y!,z!);root.add(pendant);
  rod(pendant,new T.Vector3(),new T.Vector3(0,-1.5,0),.017,iron);
  const pumpkin=new T.Group();pumpkin.position.y=-1.9; pumpkin.scale.setScalar(size!);pendant.add(pumpkin);
  const fruit=new T.Mesh(pumpkinGeometry,pumpkinMat);fruit.castShadow=true;pumpkin.add(fruit);const stalk=new T.Mesh(new T.CylinderGeometry(.075,.11,.28,8),stem);stalk.position.y=.91;pumpkin.add(stalk);
  for(const side of[-1,1]){const s=new T.Shape();s.moveTo(0,.18);s.lineTo(-.15,-.09);s.lineTo(.15,-.09);s.closePath();const eye=new T.Mesh(new T.ShapeGeometry(s),glow);eye.position.set(side*.30,.12,.95);pumpkin.add(eye);}
  const smile=new T.Mesh(new T.TorusGeometry(.31,.055,6,20,Math.PI),glow);smile.rotation.z=Math.PI;smile.position.set(0,-.18,.95);pumpkin.add(smile);
  const halo=new T.PointLight('#ff9b32',3,4.8,2);halo.position.y=-1.9;pendant.add(halo);pendants.push({group:pendant,phase:x!*.7});
 }
 batch(root);
 return {root,home,update(time:number,motion:number){const phase=time/DURATION*TAU;amber.uniforms.phase!.value=phase*3;pendants.forEach(({group,phase:p})=>{group.rotation.z=.030*Math.sin(phase*2+p)*motion;group.rotation.x=.022*Math.sin(phase*3+p)*motion;});candles.forEach(({mesh,phase:p})=>{mesh.scale.y=.11*(.88+.12*Math.sin(phase*5+p)+.06*Math.sin(phase*9+p*2));});},diagnostics(){return {architecture:'suspended cylindrical house',rooms:3,duckCount:1,ghostCount:1};}};
}
