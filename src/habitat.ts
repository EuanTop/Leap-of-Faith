import * as THREE from 'three';
import {habitatFrame,habitatArcAt,habitatCurve,radiusAt,PODS,HABITAT_GLSL} from './habitat-path.ts';
import {createGalaxyMaterial} from './water.ts';
import {refractedFloor} from './lighting.ts';
import {smooth} from './story.ts';
import {addHalloween} from './halloween.ts';
import {BAY_TIMES,interactionPose,reaction,interactionTargets,relativeTime} from './interactions.ts';

export function createHabitat(scene:THREE.Scene,renderer:THREE.WebGLRenderer){
 const root=new THREE.Group();scene.add(root);
 const lensPhase={value:0};
 const propUpdates:Array<(time:number,motion:number,pose:ReturnType<typeof interactionPose>)=>void>=[];
 // Rounded studio sources give glass flowing highlights, without rigid light bars.
 const environmentScene=new THREE.Scene();environmentScene.background=new THREE.Color('#9f83bb');
 for(const [color,position,scale,power] of [
  ['#fff0bf',[-12,18,8],[9,14,10],2.5],
  ['#dbc1ff',[15,8,-10],[12,10,14],1.8],
  ['#ffd9b1',[5,20,-18],[7,12,9],2.0],
 ] as [string,number[],number[],number][]){
  const light=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(power)}));
  light.position.set(...position as [number,number,number]);light.scale.set(...scale as [number,number,number]);environmentScene.add(light);
 }
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromScene(environmentScene,.10);pmrem.dispose();
 environmentScene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose()}});
 scene.environment=environment.texture;scene.environmentIntensity=.45;
 const geometry=new THREE.PlaneGeometry(1,1,64,600);
 const glass=new THREE.MeshPhysicalMaterial({color:'#e8c6ff',roughness:.095,metalness:0,transmission:.87,thickness:.24,ior:1.46,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide,envMap:environment.texture,envMapIntensity:1.05,clearcoat:1,clearcoatRoughness:.06});
 const pipeUniforms={uStart:{value:0},uSweep:{value:Math.PI*2}};
 glass.onBeforeCompile=(s:any)=>{
  Object.assign(s.uniforms,pipeUniforms);
  s.vertexShader=HABITAT_GLSL+'\nvarying vec3 vGlassN,vGlassP;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <beginnormal_vertex>','vec3 p0=pipeAt(uv);vec3 objectNormal=normalize(cross(pipeAt(uv+vec2(.0001,0.))-p0,pipeAt(uv+vec2(0.,.0001))-p0));');
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed=pipeAt(uv);vGlassN=normalize(mat3(modelMatrix)*objectNormal);vGlassP=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader='varying vec3 vGlassN,vGlassP;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 glassN=normalize(vGlassN),glassEye=normalize(cameraPosition-vGlassP);
   float rim=pow(1.-abs(dot(glassN,glassEye)),3.2);
   float key=max(0.,dot(glassN,normalize(vec3(-.62,.70,.35))));
   outgoingLight+=rim*mix(vec3(.08,.025,.16),vec3(.66,.40,.085),key);
   vec3 reflected=reflect(-glassEye,glassN);
   float gold=pow(max(0.,dot(reflected,normalize(vec3(-.48,.76,.44)))),18.);
   float lilac=pow(max(0.,dot(reflected,normalize(vec3(.7,.5,-.45)))),24.);
   outgoingLight+=vec3(.95,.67,.24)*gold*.48+vec3(.22,.10,.43)*lilac*.22;
   #include <opaque_fragment>
  `);
 };
 glass.customProgramCacheKey=()=> 'trefoil-habitat-glass-warm-rim-v2';
 const shell=new THREE.Mesh(geometry,glass);shell.frustumCulled=false;shell.renderOrder=5;root.add(shell);
 // Opaque lower shell provides a structural keel, with a clear glass crown.
 function surface(start:number,sweep:number){
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let j=0;j<=600;j++){const f=habitatFrame(j/600);for(let i=0;i<=24;i++){const beta=Math.asin(1.05/f.radius),a=Math.PI+beta+i/24*(Math.PI-2*beta),p=f.center.clone().addScaledVector(f.side,Math.cos(a)*f.radius).addScaledVector(f.up,Math.sin(a)*f.radius);positions.push(p.x,p.y,p.z);uvs.push(i/24,j/600);if(j<600&&i<24){const k=j*25+i;indices.push(k,k+1,k+25,k+1,k+26,k+25)}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const keel=new THREE.Mesh(surface(Math.PI*1.12,Math.PI*.76),new THREE.MeshStandardMaterial({color:'#3c195b',roughness:.52,side:THREE.DoubleSide}));keel.castShadow=true;keel.receiveShadow=true;root.add(keel);
 function floorGeometry(halfWidth:number,full=false){
  const positions:number[]=[],uvs:number[]=[],arcs:number[]=[],indices:number[]=[],sides:number[]=[],ups:number[]=[],lens:number[]=[];
  for(let j=0;j<=600;j++){const f=habitatFrame(j/600),arc=habitatArcAt(j/600),width=full?Math.sqrt(f.radius*f.radius-1.05*1.05)*.96:halfWidth;for(let i=0;i<=8;i++){const x=(i/8-.5)*width*2,p=f.floor.clone().addScaledVector(f.side,x);positions.push(p.x,p.y+.018,p.z);uvs.push(i/8,j/600);arcs.push(arc);sides.push(f.side.x,f.side.y,f.side.z);ups.push(f.up.x,f.up.y,f.up.z);lens.push(x,f.radius);if(j<600&&i<8){const k=j*9+i;indices.push(k,k+9,k+1,k+1,k+9,k+10)}}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('aArc',new THREE.Float32BufferAttribute(arcs,1));g.setAttribute('aLensSide',new THREE.Float32BufferAttribute(sides,3));g.setAttribute('aLensUp',new THREE.Float32BufferAttribute(ups,3));g.setAttribute('aLensCoord',new THREE.Float32BufferAttribute(lens,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const floor=new THREE.Mesh(floorGeometry(0,true),refractedFloor(lensPhase));floor.receiveShadow=true;root.add(floor);
 const galaxy=createGalaxyMaterial(),canal=new THREE.Mesh(floorGeometry(.88),galaxy.material);canal.position.y=.025;canal.renderOrder=2;root.add(canal);
 // Rails and collars expose the continuity of the inhabited knot.
 const trim=new THREE.MeshStandardMaterial({color:'#e6d5bc',roughness:.4,metalness:.18});
 for(const t of Array.from({length:15},(_,i)=>i/15)){
  const f=habitatFrame(t),ring=new THREE.Mesh(new THREE.TorusGeometry(f.radius+.015,.024,7,72),trim);ring.position.copy(f.center);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),f.tangent);root.add(ring);
 }
 for(const sign of [-1,1]){
  const rail=Array.from({length:361},(_,i)=>{const f=habitatFrame(i/360),width=Math.sqrt(f.radius*f.radius-1.05*1.05)*.94;return f.floor.clone().addScaledVector(f.side,width*sign).addScaledVector(f.up,.16)});
  root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail,true),480,.025,7,true),trim));
 }
 // Habitation pockets sit at the three horizontal crests of the curve.
 const pockets=PODS.map((t,i)=>{const f=habitatFrame(t),g=new THREE.Group();g.position.copy(f.floor);g.quaternion.copy(f.quaternion);root.add(g);addHome(g,i);return g});
 function rounded(parent:THREE.Object3D,color:string,size:[number,number,number],p:[number,number,number],r=.06){
  const shape=new THREE.Shape(),w=size[0],h=size[1];r=Math.min(r,w*.45,h*.45);shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:size[2],bevelEnabled:true,bevelSegments:3,bevelSize:r*.4,bevelThickness:r*.4,steps:1,curveSegments:10});geo.translate(0,0,-size[2]/2);const mesh=new THREE.Mesh(geo,new THREE.MeshToonMaterial({color}));mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 function rod(parent:THREE.Object3D,color:string,a:THREE.Vector3,b:THREE.Vector3,r=.022){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),12),new THREE.MeshToonMaterial({color}));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());m.castShadow=true;parent.add(m);return m;}
 function cup(parent:THREE.Object3D,x:number,y:number,z:number){
  const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
  const porcelain=new THREE.MeshStandardMaterial({color:'#f4dfc3',roughness:.35,side:THREE.DoubleSide});
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.13,.105,.20,24,1,true),porcelain));
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,20),porcelain);handle.rotation.y=Math.PI/2;handle.position.x=.14;g.add(handle);
  const tea=new THREE.Mesh(new THREE.CircleGeometry(.115,24),new THREE.MeshStandardMaterial({color:'#98745e',roughness:.22}));tea.rotation.x=-Math.PI/2;tea.position.y=.075;g.add(tea);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.13,.012,8,24),porcelain);rim.rotation.x=Math.PI/2;rim.position.y=.10;g.add(rim);return g;
 }
 function plant(parent:THREE.Object3D,x:number,z:number,scale=1){
  const g=new THREE.Group();g.position.set(x,.04,z);g.scale.setScalar(scale);parent.add(g);const pot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.16,.35,24),new THREE.MeshToonMaterial({color:'#e5b4af'}));pot.position.y=.175;pot.castShadow=true;g.add(pot);
  for(let j=0;j<7;j++){const a=j*2.4,r=.11+j*.022,top=new THREE.Vector3(Math.sin(a)*r,.55+j*.055,Math.cos(a)*r);rod(g,'#7e8d80',new THREE.Vector3(0,.3,0),top,.013);const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),new THREE.MeshToonMaterial({color:j%3?'#b1bf8c':'#e7ba9e'}));leaf.scale.set(.085,.19,.025);leaf.position.copy(top);leaf.rotation.z=Math.sin(a)*.65;leaf.castShadow=true;g.add(leaf)}
 }
 function addHome(parent:THREE.Group,index:number){
  const rug=rounded(parent,index===0?'#764486':'#653675',[1.1,.025,2.35],[1.70,.02,0],.07);
  if(index===0){
   // A reading chair, folded blanket, side shelf and shaded lamp share one bay.
   const chairStart=parent.children.length;
   rounded(parent,'#ef9a3d',[.85,.24,.80],[1.63,.40,-.15]);rounded(parent,'#e28c34',[.88,.76,.19],[1.63,.79,-.53]);
   for(const x of [1.20,2.06])rounded(parent,'#e28c34',[.16,.40,.79],[x,.57,-.15]);
   rounded(parent,'#fff1d2',[.39,.035,.72],[1.95,.58,.06],.025);
   const chair=new THREE.Group();chair.position.set(1.63,.12,-.15);
   for(const part of parent.children.slice(chairStart)){part.position.sub(chair.position);chair.add(part)}parent.add(chair);
   propUpdates.push((time,motion)=>{chair.rotation.z=reaction(time,BAY_TIMES[0]+.40,6,1.4)*.16*Math.min(motion,1.5)});
   rounded(parent,'#eacbb7',[1.17,.08,.80],[1.66,.91,1.03]);rod(parent,'#8e6ca4',new THREE.Vector3(1.72,.05,1),new THREE.Vector3(1.72,.87,1),.045);
   const teacup=cup(parent,1.25,1.055,.82);
   rounded(parent,'#9270bb',[.53,.035,.43],[1.91,.98,1.12],.012);
   const pages=[-1,1].map(sign=>{const pivot=new THREE.Group();pivot.position.set(1.91,1.008,1.12);parent.add(pivot);const paper=new THREE.Mesh(new THREE.PlaneGeometry(.30,.40,5,2),new THREE.MeshStandardMaterial({color:'#fff0d3',roughness:.9,side:THREE.DoubleSide}));paper.rotation.x=-Math.PI/2;paper.position.x=sign*.15;pivot.add(paper);pivot.rotation.z=sign*.15;return pivot});
   propUpdates.push((time,motion)=>{
    const strength=Math.min(motion,1.5),r=reaction(time,BAY_TIMES[0]+.04,10,1.9)*strength;
    teacup.rotation.z=r*.33;teacup.rotation.x=r*.20;
    pages.forEach((p,i)=>{const age=relativeTime(time,BAY_TIMES[0]+.20+i*.18);
     const turn=smooth(age/.4)*(1-smooth((age-1.25)/.85));
     p.rotation.z=(i?1:-1)*(.15+(turn*1.35+Math.max(0,reaction(time,BAY_TIMES[0]+.22+i*.18,8,1.7))*.24)*strength);
    });
   });
   rod(parent,'#e6dfaf',new THREE.Vector3(2.05,.05,-1.0),new THREE.Vector3(2.05,1.62,-1.0),.025);
   const shade=new THREE.Mesh(new THREE.ConeGeometry(.27,.32,40,1,true),new THREE.MeshToonMaterial({color:'#ffcd76',side:THREE.DoubleSide}));shade.position.set(2.05,1.56,-1);parent.add(shade);
   plant(parent,-1.85,.1,1.15);
  }else if(index===1){
   // Fold-down sewing desk, cotton and paper patterns; the white hood is unfinished.
   rounded(parent,'#d5a06a',[.78,.10,1.55],[1.75,.86,-.18]);for(const z of [-.72,.38])rod(parent,'#b4a2ac',new THREE.Vector3(1.95,.05,z),new THREE.Vector3(1.95,.81,z),.035);
   rounded(parent,'#f9ebd1',[.50,.015,.65],[1.74,.93,-.35],.018);rounded(parent,'#f5e2ce',[.45,.025,.48],[1.75,.94,.28],.025);rounded(parent,'#e79f9b',[.12,.018,.14],[1.82,.965,.28],.009);
   for(const z of [-.63,-.42]){const spool=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.12,16),new THREE.MeshToonMaterial({color:'#b78daf'}));spool.position.set(1.98,.99,z);parent.add(spool)}
   rounded(parent,'#dfdf8b',[.61,.14,.51],[1.60,.42,1.11]);for(const x of [1.36,1.84])for(const z of [.91,1.31])rod(parent,'#b7aa9c',new THREE.Vector3(x,.03,z),new THREE.Vector3(x,.37,z),.025);
   rounded(parent,'#c7afcf',[.35,.10,2.0],[-1.85,.85,0]);for(let i=0;i<8;i++){const book=rounded(parent,['#ead1b4','#a886b9','#cba5c4'][i%3],[.19,.28+.04*(i%3),.32],[-1.83,1.05,-.78+i*.22],.01);book.rotation.x=.04*Math.sin(i);propUpdates.push((time,motion)=>{book.rotation.x=.04*Math.sin(i)+reaction(time,BAY_TIMES[1]+.25+i*.075,8,1.8)*.32*Math.min(motion,1.5)})}
  }else{
   // A breakfast ledge and a planted window turn this crest into a small kitchen.
   rounded(parent,'#c98660',[.78,.10,1.7],[1.75,.78,0]);rounded(parent,'#b797bd',[.72,.63,1.59],[1.75,.40,0]);
   for(const z of [-.42,.42])rounded(parent,'#d1b5cf',[.025,.40,.70],[1.34,.35,z],.015);
   const drawer=new THREE.Group();drawer.position.set(1.32,.665,0);parent.add(drawer);
   rounded(drawer,'#d9b9d2',[.035,.13,1.48],[0,0,0],.015);
   rounded(drawer,'#f4e0bf',[.45,.025,1.39],[.24,-.045,0],.01);
   for(const z of [-.68,.68])rounded(drawer,'#bca0bc',[.46,.12,.025],[.24,0,z],.01);
   const pull=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,20),new THREE.MeshStandardMaterial({color:'#e6d5bc',metalness:.4,roughness:.3}));pull.rotation.y=Math.PI/2;pull.position.set(-.10,0,.55);drawer.add(pull);
   propUpdates.push((_time,_motion,pose)=>{drawer.position.x=1.32-.43*pose.drawer;pull.rotation.x=pose.surprise*.35});
   cup(parent,1.59,.91,-.3);cup(parent,1.88,.91,-.3);
   const bowl=new THREE.Mesh(new THREE.SphereGeometry(.20,24,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshToonMaterial({color:'#d6a3a8',side:THREE.DoubleSide}));bowl.rotation.x=Math.PI;bowl.position.set(1.73,1.0,.40);parent.add(bowl);
   plant(parent,-1.75,-.65,1.25);plant(parent,-1.80,.7,.95);
   rounded(parent,'#e3a053',[.68,.20,.63],[-1.75,.28,1.55]);
  }
  // Warm ceiling practicals repeat throughout the inhabited pipe.
  rod(parent,'#cbb5d0',new THREE.Vector3(0,3.65,0),new THREE.Vector3(0,2.92,0),.008);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.11,16,10),new THREE.MeshBasicMaterial({color:'#fff1b8'}));bulb.position.set(0,2.85,0);parent.add(bulb);
  const light=new THREE.PointLight('#ffe1a2',3.5,5,2);light.position.set(0,2.5,0);parent.add(light);
  propUpdates.push((_time,_motion,pose)=>{light.intensity=3.5+4*Math.min(1,pose.weights[index]);bulb.scale.setScalar(1+.16*Math.min(1,pose.weights[index]))});
 }
 // A short laundry rail follows one side of the craft bay, outside the swimming lane.
 const f=habitatFrame(PODS[1]),laundry=new THREE.Group();laundry.position.copy(f.floor);laundry.quaternion.copy(f.quaternion);root.add(laundry);
 rod(laundry,'#dfcbd6',new THREE.Vector3(-1.04,1.88,-.95),new THREE.Vector3(-1.04,1.88,.95),.014);
 const cloths=Array.from({length:3},(_,i)=>{
  const geometry=new THREE.PlaneGeometry(.56,.85,12,18);geometry.rotateY(Math.PI/2);geometry.translate(0,-.425,0);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i===1?'#f7eedb':'#e1b3c2',roughness:.9,side:THREE.DoubleSide}));mesh.position.set(-1.04,1.86,-.55+i*.54);mesh.castShadow=true;laundry.add(mesh);
  return {mesh,rest:Float32Array.from(geometry.attributes.position.array)};
 });
 const halloween=addHalloween(root);root.updateMatrixWorld(true);const targets=interactionTargets();
 return {root,galaxy,targets,update(time:number,motion:number){
  const pose=interactionPose(time,motion);halloween.update(time);galaxy.uniforms.uTime.value=time;lensPhase.value=time/28.8*Math.PI*2;
  propUpdates.forEach(fn=>fn(time,motion,pose));
  cloths.forEach(({mesh,rest},i)=>{const position=mesh.geometry.attributes.position;const tug=reaction(time,BAY_TIMES[1]+.02+(2-i)*.11,7,1.5)*Math.min(motion,1.5);
   for(let j=0;j<position.count;j++){const y=rest[j*3+1],z=rest[j*3+2],fall=-y/.85;
    position.setXYZ(j,-fall*fall*(tug*.95+.075*Math.sin(time/28.8*Math.PI*4+i+fall*3))*motion,y+Math.abs(tug)*fall*.20,z+.045*tug*fall*Math.sin(fall*4));
   }position.needsUpdate=true;mesh.geometry.computeVertexNormals();
  });return pose;
 }};
}
