import test from 'node:test';
import assert from 'node:assert/strict';
import {LoopAudio} from '../src/loop-audio.ts';

class Parameter {
 value=1;
 setValueAtTime(value:number){this.value=value}
 linearRampToValueAtTime(value:number){this.value=value}
 setTargetAtTime(value:number){this.value=value}
 cancelAndHoldAtTime(){}
}
class Gain {gain=new Parameter();connect(){}disconnect(){}}
class Source {
 buffer:unknown;loop=false;loopStart=0;loopEnd=0;onended:unknown;offset=-1;stopped=false;
 connect(){}disconnect(){}start(_at:number,offset:number){this.offset=offset}stop(){this.stopped=true}
}
class Context {
 currentTime=0;state='running';sampleRate=48000;destination={};sources:Source[]=[];
 createGain(){return new Gain()}
 createBufferSource(){const source=new Source();this.sources.push(source);return source}
 async resume(){this.state='running'}
 async decodeAudioData(){return {duration:28.8,sampleRate:48000,length:1382400}}
}
async function player(t:{mock:{method:Function}}){
 const context=new Context();t.mock.method(globalThis,'fetch',async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));
 const audio=new LoopAudio(28.8,()=>context as unknown as AudioContext);
 await audio.load('http://localhost/score.wav','test-v1');return {audio,context};
}

test('polling across repeated loop boundaries never restarts or seeks the audio source',async t=>{
 const {audio,context}=await player(t);
 assert.ok(audio.play(28.70));
 context.currentTime=.20;assert.ok(Math.abs(audio.time!-.10)<1e-9);
 // Reproduce the previous failure: audio and page can straddle the end of a loop.
 audio.play(.04);assert.equal(context.sources.length,1);
 for(let tick=1;tick<50;tick++){
  context.currentTime=tick*4;audio.play(context.currentTime%28.8);
  assert.equal(context.sources.length,1);
  assert.ok(audio.time!>=0&&audio.time!<28.8);
 }
 assert.equal(context.sources[0].loop,true);assert.equal(context.sources[0].loopEnd,28.8);
 assert.equal(audio.diagnostics.starts,1);
});

test('explicit seeking, pause/resume, volume and score changes have distinct effects',async t=>{
 const {audio,context}=await player(t);audio.play(3);
 audio.setVolume(.4);assert.equal(context.sources.length,1);
 context.currentTime=1;audio.play(9,true);assert.equal(context.sources.length,2);assert.ok(Math.abs(audio.time!-9)<1e-9);
 audio.stop();assert.equal(audio.time,undefined);assert.equal(audio.diagnostics.playing,false);
 audio.play(9);assert.equal(context.sources.length,3);
 await audio.load('http://localhost/score.wav','test-v2');audio.play(10);assert.equal(context.sources.length,4);
 assert.equal(audio.version,'test-v2');
});

test('suspended browser audio never blocks artwork initialization',async t=>{
 const {audio,context}=await player(t);context.state='suspended';
 assert.equal(audio.play(0),false);assert.equal(context.sources.length,0);
 await audio.unlock();assert.ok(audio.play(0));assert.equal(context.sources.length,1);
});
