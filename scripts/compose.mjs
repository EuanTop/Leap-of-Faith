import { mkdir, realpath, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { diffuseSpace } from './cosmic.mjs';
import { exchangeAt } from '../src/inverted/exchange.mjs';

export const DURATION = 28.8;
export const VERSION = 'leap-of-faith-spatial-duet-3.1';
export const EVENT_ID_SCHEMA = 'track-bar-onset-us-pitch-v2';
export const BEAT = 1.2, BAR = 7.2;
const TAU = Math.PI * 2;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const noteName = midi => `${['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'][midi%12]}${Math.floor(midi/12)-1}`;
const roundTime = x => Math.round(x*1e6)/1e6;
const smooth = x => { x=Math.min(1,Math.max(0,x)); return x*x*(3-2*x); };
const breath = (t,d,a,r) => smooth(t/a)*smooth((d-t)/r);
function noiseGenerator(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/2147483648-1;};}

export function createScore({sampleRate=48000}={}) {
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('Invalid sampleRate');
 const length=Math.round(DURATION*sampleRate),dryL=new Float64Array(length),dryR=new Float64Array(length),sendL=new Float64Array(length),sendR=new Float64Array(length),events=[];
 function add({track,start,duration,pitch,pan=0,send=.5,voice}) {
  start=(start%DURATION+DURATION)%DURATION;
  const bar=Math.floor((start+1e-7)/BAR)+1,onset=Math.round((start-(bar-1)*BAR)*1e6);
  const id=`${track}-b${String(bar).padStart(2,'0')}-t${String(onset).padStart(7,'0')}-p${pitch}`;
  const event={id,track,start:roundTime(start),end:roundTime(Math.min(DURATION,start+duration)),pitch,note:noteName(pitch),bar};
  events.push(event);
  if(start+duration>DURATION)events.push({...event,id:id+'-tail',start:0,end:roundTime(start+duration-DURATION),continuationOf:id,bar:1});
  const first=Math.round(start*sampleRate),count=Math.round(duration*sampleRate);
  for(let j=0;j<count;j++) {
   const index=(first+j)%length,t=j/sampleRate,x=voice(t,j),clock=index/sampleRate;
   const at=typeof pan==='function'?pan(clock):pan,l=Math.cos((at+1)*Math.PI/4),r=Math.sin((at+1)*Math.PI/4);
   dryL[index]+=x*l;dryR[index]+=x*r;sendL[index]+=x*l*send;sendR[index]+=x*r*send;
  }
 }
 const harmony=[
  {name:'Dm9',root:38,notes:[50,57,60,64,65],duet:[62,65]},
  {name:'Bbmaj9',root:34,notes:[46,53,57,60,62],duet:[58,62]},
  {name:'Fmaj9/A',root:33,notes:[45,53,55,60,64],duet:[60,69]},
  {name:'C6/9',root:36,notes:[48,55,57,62,64],duet:[60,67]},
 ];
 for(let b=0;b<4;b++) {
  const start=b*BAR,h=harmony[b],f=frequency(h.root);
  // A slowly opening fundamental, centred and unpulsed; no bass riff or percussion.
  const rootDuration=b===2?3.9:b===3?5.1:7.8;
  add({track:'gravity',start:start-.3,duration:rootDuration,pitch:h.root,send:.08,voice:t=>{
   const env=breath(t,rootDuration,Math.min(1.8,rootDuration*.24),Math.min(2.0,rootDuration*.30)),a=TAU*f*t;
   return .105*env*(Math.sin(a)+.20*Math.sin(a*2)+.035*Math.sin(a*3));
  }});
  h.notes.forEach((pitch,i)=>{
   const f=frequency(pitch),duration=12.4;
   add({track:'tidal-harmony',start:start-.9+i*.045,duration,pitch,send:.68,
    pan:clock=>.55*Math.sin(TAU*clock/DURATION+i*.72+b*.25),voice:t=>{
     const env=breath(t,duration,3.0,4.6),a=TAU*f*t;
     const day=exchangeAt(start-.9+i*.045+t).daylight;
     const colour=.40+.65*day+.12*Math.sin(TAU*t/duration-.8);
     const tone=.78*Math.sin(a)+.14*Math.sin(a+TAU*.09*t+.4*i)+.10*colour*Math.sin(2*a+.2);
     return .038*tone*env;
    }});
  });
  const voice=(kind,pitch,start,duration,pan)=>{
   const f=frequency(pitch),random=noiseGenerator(9241+b*47+(kind==='duck'?0:1));let phase=0,air=0;
   add({track:kind==='duck'?'duck-voice':'swan-voice',start,duration,pitch,send:kind==='duck'?.62:.78,pan:clock=>pan+.13*Math.sin(TAU*clock/DURATION),voice:t=>{
    const duck=kind==='duck',u=t/duration,day=exchangeAt(start+t).daylight;
    // Gentle intonation inside one breath, without decorative note runs.
    const cents=2.8*Math.sin(TAU*5.1*t)*(smooth(t/.35)) - 13*Math.exp(-t/.10);
    phase+=TAU*f*2**(cents/1200)/sampleRate;
    const opening=Math.sin(Math.PI*u)**.8;
    const formant=duck?510+150*opening:430+120*opening+110*day;
    let tone=0,weights=0;
    for(let h=1;h<=14;h++) {
     const hz=f*h;if(hz>sampleRate*.45)continue;
     const weight=(duck?.30:.65)*Math.exp(-(((hz-f)/340)**2))
      +(duck?1:.55)*Math.exp(-(((hz-formant)/(duck?180:240))**2))
      +(duck?.48:.22)*Math.exp(-(((hz-(duck?1030:1080+140*day))/300)**2));
     tone+=weight*Math.sin(phase*h+.025*h);weights+=weight;
    }
    air+=(1-Math.exp(-TAU*1100/sampleRate))*(random()-air);
    const envelope=breath(t,duration,duck?.12:.62,duck?.48:1.15);
    const syllable=duck?(.79+.21*Math.cos(TAU*1.6*t)*opening):1;
    const focus=duck?(1-.55*day):(.48+.67*day);
    return (duck?.145:.135)*focus*envelope*syllable*(tone/Math.max(1,weights)+air*.014);
   }});
  };
  // A third apart, sharing one harmonic field. The longer swan answer overlaps the duck.
  const swanLeads=b>=2;
  voice('duck',h.duet[0],start+(swanLeads?1.55:.90),b===3?4.3:swanLeads?3.4:2.55,-.26);
  voice('swan',h.duet[1],start+(swanLeads?.90:1.55),4.25,.26);
 }
 // One common tone survives all four chords and closes its oscillator phase exactly.
 for(const [pitch,offset] of [[57,0],[69,Math.PI]]) {
  const f=Math.round(frequency(pitch)*DURATION)/DURATION;
  add({track:'orbital-air',start:0,duration:DURATION,pitch,send:.90,
   pan:clock=>.72*Math.sin(TAU*clock/DURATION+offset),voice:t=>{
    const orbit=TAU*t/DURATION,envelope=.72+.20*Math.sin(orbit+offset);
    return (pitch===57?.014:.004+.004*exchangeAt(t).daylight)*envelope*(Math.sin(TAU*f*t)+.08*Math.sin(TAU*f*2*t+offset));
   }});
 }
 const space=diffuseSpace(sendL,sendR,sampleRate,{decay:.31,stretch:1.65});
 const left=new Float32Array(length),right=new Float32Array(length);
 let peak=0;
 for(let i=0;i<length;i++) {
  let l=dryL[i]+space.left[i]*.82,r=dryR[i]+space.right[i]*.82;
  // Non-metric early returns widen the calls without creating a new rhythmic part.
  for(const [seconds,gain] of [[.73,.12],[1.31,.075],[2.17,.040]]) {
   const at=(i-Math.round(seconds*sampleRate)+length)%length;
   l+=sendR[at]*gain;r+=sendL[at]*gain;
  }
  left[i]=Math.tanh(l*1.1);right[i]=Math.tanh(r*1.1);peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
 }
 const gain=Math.min(2.4,.76/Math.max(peak,1e-9));
 for(let i=0;i<length;i++){left[i]*=gain;right[i]*=gain;}
 events.sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
 return {left,right,sampleRate,duration:DURATION,events,version:VERSION,eventIdSchema:EVENT_ID_SCHEMA,harmony:harmony.map(h=>h.name)};
}

export function inspectScore(score) {
  const { left, right, sampleRate } = score;
  let peak = 0, energy = 0, sideEnergy = 0, midEnergy = 0, crossEnergy = 0, energyL = 0, energyR = 0, maxStep = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    energy += left[i] ** 2 + right[i] ** 2;
    sideEnergy += (left[i] - right[i]) ** 2;
    midEnergy += (left[i] + right[i]) ** 2;
    crossEnergy += left[i] * right[i];
    energyL += left[i] ** 2; energyR += right[i] ** 2;
    const previous = (i + left.length - 1) % left.length;
    maxStep = Math.max(maxStep, Math.abs(left[i] - left[previous]), Math.abs(right[i] - right[previous]));
  }
  const windows = Array.from({ length: 4 }, (_, bar) => {
    let sum = 0;
    const a = Math.round(bar * BAR * sampleRate), b = Math.round((bar + 1) * BAR * sampleRate);
    for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
    return { bar: bar + 1, rms: Math.sqrt(sum / (2 * (b - a))) };
  });
  return { version: score.version, duration: score.duration, sampleRate, channels: 2, samplesPerChannel: left.length,
    peak, rms: Math.sqrt(energy / (left.length * 2)), sideToMidRms: Math.sqrt(sideEnergy / midEnergy),
    stereoCorrelation: crossEnergy / Math.sqrt(energyL * energyR),
    monoRetention: Math.sqrt(midEnergy / (2 * energy)),
    seamJump: Math.max(Math.abs(left[0] - left.at(-1)), Math.abs(right[0] - right.at(-1))),
    maxAdjacentStep: maxStep, bars: windows, listeningVerified: false };
}

export function encodeWav(score) {
  const { left, right, sampleRate } = score;
  const wav = Buffer.alloc(44 + left.length * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(left.length * 4, 40);
  for (let i = 0; i < left.length; i++) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return wav;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  // realpath fails when the external artifacts volume is absent, preserving its link.
  const artifacts = await realpath(path.join(projectRoot, 'artifacts'));
  const output = path.join(artifacts, 'audio');
  await mkdir(output, { recursive: true });
  const score = createScore();
  const validation = inspectScore(score);
  const { left, right, ...metadata } = score;
  const scoreMetadata = { ...metadata, bpm: 50, meter: '6/4', bars: 4,
    mode: 'D minor / F major shared field; Dm9, Bbmaj9, Fmaj9/A, C6/9',
    arrangement: { foundation: 'slow unpulsed roots, long overlapping harmony and a continuous A common tone; no percussion',
      voices: 'four harmonic duets: duck leads with swan thirds at night; swan leads with low duck sixth/fifth support in daylight; the same harmony and pulse continue through both crossings',
      space: 'circular 17-second diffuse field, non-metric early returns, slow stereo orbit, centred bass' },
    samplesPerChannel: left.length };
  const files = [['score.wav', encodeWav(score)], ['validation.json', JSON.stringify(validation, null, 2)],
    ['score.json', JSON.stringify(scoreMetadata, null, 2)]];
  // Publish complete files, with the version metadata last. An already-playing
  // stream can finish reading its old inode while the next request gets the new WAV.
  try {
    for (const [name, content] of files) await writeFile(path.join(output, `.${name}.${process.pid}.tmp`), content);
    for (const [name] of files) await rename(path.join(output, `.${name}.${process.pid}.tmp`), path.join(output, name));
  } finally {
    for (const [name] of files) await rm(path.join(output, `.${name}.${process.pid}.tmp`), { force: true });
  }
  console.log(JSON.stringify({ output, ...validation }, null, 2));
}
