import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Standard-library synthesis module.
import {createScore,inspectScore,encodeWav,DURATION,VERSION,BAR} from '../scripts/compose.mjs';
const score=createScore(),metrics=inspectScore(score);
const original=(track:string)=>score.events.filter((e:any)=>e.track===track&&!e.continuationOf);

test('the contemplative score is exact, finite, deterministic stereo PCM',()=>{
 assert.equal(DURATION,28.8);assert.equal(BAR,7.2);assert.equal(score.version,VERSION);
 assert.equal(score.left.length,1382400);assert.equal(score.left.length,score.right.length);
 for(let i=0;i<score.left.length;i++)assert.ok(Number.isFinite(score.left[i])&&Number.isFinite(score.right[i]));
 const repeat=createScore();assert.deepEqual(score.left,repeat.left);assert.deepEqual(score.right,repeat.right);assert.deepEqual(score.events,repeat.events);
});

test('both sides of the loop retain energy, headroom and mono-compatible spatial depth',()=>{
 assert.ok(metrics.peak>.25&&metrics.peak<.9,`peak ${metrics.peak}`);
 assert.ok(metrics.rms>.06&&metrics.rms<.30,`rms ${metrics.rms}`);
 assert.ok(metrics.sideToMidRms>.12&&metrics.sideToMidRms<.6);
 assert.ok(metrics.monoRetention>.90);assert.ok(metrics.stereoCorrelation>.55&&metrics.stereoCorrelation<.98);
 assert.ok(metrics.seamJump<.012,`seam ${metrics.seamJump}`);assert.ok(metrics.seamJump<=metrics.maxAdjacentStep*1.1);
 for(const start of [0,score.left.length-4800]){
  let sum=0;for(let i=start;i<start+4800;i++)sum+=score.left[i]**2+score.right[i]**2;
  assert.ok(Math.sqrt(sum/9600)>.025);
 }
 for(const bar of metrics.bars)assert.ok(bar.rms>.04);
});

test('duck and swan voices form four overlapping harmonic duets, not a percussion pattern',()=>{
 const duck=original('duck-voice'),swan=original('swan-voice');assert.equal(duck.length,4);assert.equal(swan.length,4);
 for(let i=0;i<4;i++){
  assert.ok(duck[i].end-duck[i].start>2.4);assert.ok(swan[i].end-swan[i].start>4);
  assert.ok(swan[i].start<duck[i].end);assert.ok([3,4].includes(swan[i].pitch-duck[i].pitch));
 }
 assert.ok(!score.events.some((e:any)=>/kick|snare|shaker|electric-bass/.test(e.track)));
 assert.equal(original('gravity').length,4);assert.equal(original('tidal-harmony').length,20);
 assert.ok(original('tidal-harmony').every((e:any)=>score.events.filter((tail:any)=>tail.continuationOf===e.id).reduce((n:number,t:any)=>n+t.end-t.start,e.end-e.start)>12));
});

test('one common tone spans the complete loop while harmony and roots change slowly',()=>{
 assert.deepEqual(score.harmony,['Dm9','Bbmaj9','Fmaj9/A','C6/9']);
 assert.ok(original('orbital-air').every((e:any)=>e.start===0&&e.end===DURATION&&e.pitch%12===9));
 assert.equal(original('orbital-air').length,2);
 assert.deepEqual(new Set(original('gravity').map((e:any)=>e.pitch%12)),new Set([2,10,9,0]));
});

test('event IDs and wrapped tails describe the actual complete audio',()=>{
 const ids=new Set();
 for(const e of score.events){
  assert.ok(!ids.has(e.id));ids.add(e.id);assert.ok(e.start>=0&&e.end<=DURATION&&e.end>e.start);
  if(e.continuationOf)assert.ok(score.events.some((head:any)=>head.id===e.continuationOf));
  else{const onset=Math.round((e.start-(e.bar-1)*BAR)*1e6);assert.equal(e.id,`${e.track}-b${String(e.bar).padStart(2,'0')}-t${String(onset).padStart(7,'0')}-p${e.pitch}`);}
 }
 assert.ok(score.events.some((e:any)=>e.continuationOf));
});

test('WAV encodes exact 48 kHz stereo PCM16 and accepts a lower synthesis rate',()=>{
 const wav=encodeWav(score);assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt16LE(20),1);
 assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt16LE(34),16);
 assert.equal(wav.length,44+1382400*4);const low=createScore({sampleRate:8000});assert.equal(low.left.length,230400);
 assert.throws(()=>createScore({sampleRate:0}),RangeError);
});
