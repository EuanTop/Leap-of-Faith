const loopTime=(time:number,duration:number)=>(time%duration+duration)%duration;

/** One decoded PCM buffer, looping on the audio clock. UI polling never seeks it. */
export class LoopAudio {
 private context:AudioContext|undefined;
 private output:GainNode|undefined;
 private buffer:AudioBuffer|undefined;
 private source:AudioBufferSourceNode|undefined;
 private voice:GainNode|undefined;
 private startedAt=0;
 private offset=0;
 private sourceVersion='';
 private loadedVersion='';
 private pendingVersion='';
 private loading:Promise<void>|undefined;
 private volume=.8;
 private starts=0;
 private readonly duration:number;
 private readonly makeContext:()=>AudioContext;
 constructor(duration:number,makeContext=()=>new AudioContext({sampleRate:48000,latencyHint:'interactive'})){this.duration=duration;this.makeContext=makeContext;}
 private ensure(){
  if(!this.context){this.context=this.makeContext();this.output=this.context.createGain();this.output.gain.value=this.volume;this.output.connect(this.context.destination)}
  return this.context;
 }
 unlock(){const context=this.ensure();return context.state==='suspended'?context.resume():Promise.resolve()}
 async load(url:string,version:string){
  if(this.buffer&&this.loadedVersion===version)return;
  if(this.loading&&this.pendingVersion===version)return this.loading;
  const context=this.ensure();this.pendingVersion=version;
  const pending=(async()=>{
   const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Audio download failed: '+response.status);
   const decoded=await context.decodeAudioData(await response.arrayBuffer());
   if(Math.abs(decoded.duration-this.duration)>1/context.sampleRate)throw Error('Score duration differs from scene loop');
   if(this.pendingVersion===version){this.buffer=decoded;this.loadedVersion=version;}
  })();
  this.loading=pending;
  try{await pending}finally{if(this.loading===pending)this.loading=undefined}
 }
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));if(this.context&&this.output)this.output.gain.setTargetAtTime(this.volume,this.context.currentTime,.025)}
 play(time:number,seek=false){
  const context=this.context;
  if(!context||!this.buffer||context.state!=='running')return false;
  // A normal state/version poll must leave the existing source and its phase alone,
  // even when the scene and audio clock straddle the 28.8 -> 0 second boundary.
  if(this.source&&!seek&&this.sourceVersion===this.loadedVersion)return true;
  this.stop();
  const source=context.createBufferSource(),voice=context.createGain();
  source.buffer=this.buffer;source.loop=true;source.loopStart=0;source.loopEnd=this.duration;
  voice.gain.setValueAtTime(0,context.currentTime);voice.gain.linearRampToValueAtTime(1,context.currentTime+.018);
  source.connect(voice);voice.connect(this.output!);
  source.onended=()=>{source.disconnect();voice.disconnect()};
  this.startedAt=context.currentTime;this.offset=loopTime(time,this.duration);this.sourceVersion=this.loadedVersion;
  source.start(this.startedAt,this.offset);this.source=source;this.voice=voice;this.starts++;return true;
 }
 stop(){
  if(!this.source||!this.context)return;
  const now=this.context.currentTime;
  this.voice!.gain.cancelAndHoldAtTime(now);this.voice!.gain.linearRampToValueAtTime(0,now+.018);
  this.source.stop(now+.020);this.source=undefined;this.voice=undefined;
 }
 get time(){return this.source&&this.context?.state==='running'?loopTime(this.offset+this.context.currentTime-this.startedAt,this.duration):undefined}
 get version(){return this.loadedVersion}
 get diagnostics(){return {version:this.loadedVersion,playing:!!this.source,state:this.context?.state??'uninitialized',
  sampleRate:this.buffer?.sampleRate,frames:this.buffer?.length,duration:this.buffer?.duration,starts:this.starts,time:this.time,
  loopStart:0,loopEnd:this.duration};}
}
