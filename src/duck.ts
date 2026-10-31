import * as THREE from 'three';
import {form,type Form} from './forms.ts';
import {TAU,type story} from './story.ts';
import {interactionPose} from './interactions.ts';

export function createDuck(){
 const root=new THREE.Group(),forms:Form[]=[];
 root.name='The little passenger — series character';
 const part=(parent:THREE.Object3D,color:string,size:[number,number,number],pos:[number,number,number],power=1)=>{
  const f=form(color,size,power);f.mesh.position.set(...pos);parent.add(f.mesh);forms.push(f);return f;
 };
 // The same proportions as the 29th's little passenger, scaled by 2.4.
 // A single round head and two oval wings carry its identity; no breast bib,
 // oversized bill or layered adult feathers change the silhouette.
 const body=part(root,'#ffce50',[.60,.60,.864],[0,.576,0]);
 const neck=new THREE.Group();neck.position.set(0,1.272,.432);root.add(neck);
 part(neck,'#ffce50',[.528,.528,.552],[0,0,0]);
 part(neck,'#ef772b',[.36,.132,.432],[0,-.096,.60]);
 part(neck,'#db6529',[.32,.035,.36],[0,-.151,.62]);
 const eyes:Form[]=[],glints:Form[]=[];
 for(const sign of [-1,1]){
  eyes.push(part(neck,'#2f2531',[.0648,.0792,.0528],[sign*.4176,.12,.288]));
  glints.push(part(neck,'#fff4d6',[.014,.017,.009],[sign*.432,.145,.333]));
 }
 const tail=part(root,'#f5b63b',[.15,.17,.27],[0,.61,-.77]);tail.mesh.rotation.x=-.28;
 const wings=[-1,1].map(sign=>{
  const pivot=new THREE.Group();pivot.position.set(sign*.504,.768,.12);root.add(pivot);
  part(pivot,'#f5b63b',[.216,.312,.576],[sign*.096,-.072,-.168]);return pivot;
 });
 const feet=[-1,1].map(sign=>{
  const foot=new THREE.Group();foot.position.set(sign*.24,.06,.168);root.add(foot);
  part(foot,'#ef772b',[.204,.06,.336],[0,0,0]);return foot;
 });
 root.scale.setScalar(1.18);
 const billTip=new THREE.Object3D();billTip.position.set(0,-.096,1.032);neck.add(billTip);
 return {root,body,neck,wings,feet,tail,forms,eyes,glints,billTip};
}

export function poseDuck(character:ReturnType<typeof createDuck>,st:ReturnType<typeof story>,motion:number,targets:THREE.Vector3[],acting=interactionPose(st.t,motion)){
 const phase=st.u*TAU,duck=character.root;
  const bob=.055*Math.sin(phase*12)*motion;
  duck.position.copy(st.floor).addScaledVector(st.up,.055+bob+acting.surprise*.10).addScaledVector(st.side,acting.side);duck.quaternion.copy(st.quaternion);duck.rotateX(.055*Math.sin(phase*8)*motion-acting.surprise*.10);duck.rotateZ(.055*Math.sin(phase*8+.4)*motion);
  character.neck.rotation.x=.13*Math.sin(phase*6)*motion;character.neck.rotation.y=.32*Math.sin(phase*3)*motion;character.tail.mesh.rotation.y=.13*Math.sin(phase*8)*motion;character.body.bend.value=.05*Math.sin(phase*6)*motion;
  character.neck.rotation.order='YXZ';character.neck.position.y=1.272-acting.crouch+acting.surprise*.12;
  if(acting.active>=0){
   duck.updateMatrixWorld(true);
   const aim=targets[acting.active].clone().sub(duck.position).applyQuaternion(duck.quaternion.clone().invert()).divide(duck.scale).sub(character.neck.position);
   const weight=Math.min(1,acting.weights[acting.active]);
   const yaw=THREE.MathUtils.clamp(Math.atan2(aim.x,aim.z),-1.8,1.8);
   const pitch=THREE.MathUtils.clamp(-Math.atan2(aim.y,Math.hypot(aim.x,aim.z)),-.35,.85);
   character.neck.rotation.y=THREE.MathUtils.lerp(character.neck.rotation.y,yaw,weight);
   character.neck.rotation.x=THREE.MathUtils.lerp(character.neck.rotation.x,pitch,weight)-acting.surprise*.30;
  }
  for(const f of character.forms)f.time.value=st.t;
  const burst=(center:number)=>{let d=st.t-center;d-=Math.round(d/28.8)*28.8;const u=(d+.44)/.88;return u>0&&u<1?Math.sin(Math.PI*u)*(.5+.5*Math.sin(u*TAU*4)):0};
  const flap=Math.min(1,burst(2.0)+burst(20.2)+acting.surprise*(.55+.45*Math.sin(phase*92)))*Math.min(motion,1.5);character.wings.forEach((wing,i)=>{wing.rotation.z=(i===0?-1:1)*(.05+flap*.95+acting.weights[1]*(i===0?.26:.04));wing.scale.x=1+flap*.18});
  const blink=(center:number)=>{let d=st.t-center;d-=Math.round(d/28.8)*28.8;return Math.exp(-Math.pow(d/.065,4))};
  const closed=Math.max(blink(3.2),blink(10.4),blink(17.1),blink(25.0));
  character.eyes.forEach(eye=>eye.mesh.scale.y=1-closed*.91);character.glints.forEach(glint=>glint.mesh.visible=closed<.5);
  character.feet.forEach((foot,i)=>{foot.visible=true;foot.rotation.x=Math.sin(phase*24+i*Math.PI)*.65*motion;});
 duck.updateMatrixWorld(true);
}
