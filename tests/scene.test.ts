import test from 'node:test';
import assert from 'node:assert/strict';
import {story,DURATION,FRAME_FORMATS,routeArcAt,clockAtArc,DEFAULTS} from '../src/story.ts';
import {habitatCurve,habitatFrame,habitatArcAt,radiusAt,PODS} from '../src/habitat-path.ts';
import {validatePatch,profiles,defaults} from '../scripts/control.mjs';

test('preview and service share the artist-approved defaults',()=>{
 assert.deepEqual(defaults,DEFAULTS);
 assert.deepEqual(DEFAULTS,{time:0,paused:false,motion:.95,river:.9,trail:1.35,palette:'nocturne',cameraTilt:40,cameraFov:35,aspect:'3:4',music:true,volume:.8});
});

test('the duck and transported frame close without a seam',()=>{
 for(const time of [0,.01,3,8,12,20,27.9]){const a=story(time),b=story(time+DURATION);assert.ok(a.floor.distanceTo(b.floor)<1e-8);assert.ok(a.tangent.distanceTo(b.tangent)<1e-8);assert.ok(a.up.distanceTo(b.up)<1e-8)}
 const a=habitatFrame(0),b=habitatFrame(1);assert.ok(a.center.distanceTo(b.center)<1e-8);assert.ok(a.tangent.distanceTo(b.tangent)<1e-8);
});
test('nonadjacent branches have clearance for the full circular sections',()=>{
 let minimum=Infinity;
 for(let i=0;i<240;i++)for(let j=i+1;j<240;j++){const distance=Math.min((j-i)/240,1-(j-i)/240);if(distance<.14)continue;const gap=habitatCurve.getPoint(i/240).distanceTo(habitatCurve.getPoint(j/240))-radiusAt(i/240)-radiusAt(j/240);minimum=Math.min(minimum,gap)}
 assert.ok(minimum>.75,`Only ${minimum} units between nonadjacent shells`);
});
test('pacing slows at inhabited bays without reversing and the floor frame remains upright',()=>{
 const steps=[];for(let i=0;i<864;i++){const a=story(i/30),b=story((i+1)/30);steps.push(a.center.distanceTo(b.center));assert.ok(a.up.y>.35);assert.ok(Math.abs(a.side.dot(a.up))<1e-8);assert.ok(Math.abs(a.tangent.dot(a.up))<1e-8)}
 const nominal=habitatCurve.getLength()/864;
 assert.ok(Math.min(...steps)>.30*nominal);assert.ok(Math.max(...steps)<1.70*nominal);
 for(const pod of PODS){const center=habitatArcAt(pod),expected=habitatCurve.getUtoTmapping(center,0);assert.ok(story(center*DURATION).center.distanceTo(habitatFrame(expected).center)<1e-8)}
 for(let i=0;i<864;i++){const clock=i/864,d=Math.abs(clockAtArc(routeArcAt(clock))-clock);assert.ok(Math.min(d,1-d)<1e-8)}
});
test('living pockets are widened, level and outside the central swimming lane',()=>{
 for(const t of PODS){const f=habitatFrame(t);assert.ok(f.radius>2.65);assert.ok(Math.abs(f.tangent.y)<1e-8);assert.ok(Math.sqrt(f.radius**2-1.05**2)>2.4)}
});
test('the duck fits below the crown throughout the circuit',()=>{
 for(let i=0;i<360;i++){const f=habitatFrame(i/360);assert.ok(f.radius>1.8);assert.ok(-1.05+2.25<f.radius-.25);}
});
test('control updates reject unknown fields and invalid camera settings',()=>{
 assert.deepEqual(validatePatch({motion:0,river:1,paused:true}),{motion:0,river:1,paused:true});
 for(const patch of [{motion:3},{time:NaN},{palette:'unknown'},{paused:1},{cameraTilt:80},{cameraFov:5},{extra:1},null,[]])assert.throws(()=>validatePatch(patch));
});
test('each frame selects the matching image size and video profile',()=>{
 for(const [aspect,format] of Object.entries(FRAME_FORMATS)){const [a,b]=aspect.split(':').map(Number);assert.equal(format.image[0]/format.image[1],a/b);assert.deepEqual(profiles[format.profile],format.video)}
});

test('shader arc coordinates agree with the duck across the entire loop',()=>{
 for(let i=0;i<864;i++){const p=story(i/30);assert.ok(Math.abs(habitatArcAt(p.param)-p.routeU)<1e-8);const age=clockAtArc(p.routeU);const gap=Math.abs(age-p.u);assert.ok(Math.min(gap,1-gap)<1e-8)}
 assert.equal(habitatArcAt(0),0);assert.equal(habitatArcAt(1),1);
 assert.throws(()=>validatePatch({trail:2.1}));assert.deepEqual(validatePatch({trail:0}),{trail:0});
});
