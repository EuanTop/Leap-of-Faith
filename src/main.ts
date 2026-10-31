import './style.css';
import {createArtwork} from './scene.ts';
import {LoopAudio} from './loop-audio.ts';
import {DEFAULTS,DURATION,wrap,FRAME_FORMATS,type ArtState} from './story.ts';

const artwork=createArtwork();
const canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx=canvas.getContext('2d',{alpha:false})!;
let state={...DEFAULTS},revision=0,frameTime=0,ready=false;
const audio=new LoopAudio(DURATION);
let nextMusicCheck=0,audioSync=0;
const offline=new URLSearchParams(location.search).has('render');
const menu=document.querySelector<HTMLButtonElement>('#menu')!;
const panel=document.querySelector<HTMLElement>('#panel')!;
if(offline){menu.hidden=true;document.body.classList.add('offline')}
await document.fonts.load('48px Artwork');

function draw(t:number,w:number,h:number,s:ArtState){
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
 const output=artwork.render(t,w,h,s);
 ctx.drawImage(output.canvas,0,0,w,h);
 const margin=w*.066;
 ctx.fillStyle=s.palette==='nocturne'?'#fff6d4':'#57219e';ctx.textBaseline='top';
 ctx.font=`${w*.069}px Artwork, Georgia, serif`;
 ctx.fillText('After Hours',margin,h*.046);
 ctx.font=`500 ${w*.013}px Inter, Helvetica, sans-serif`;
 ctx.letterSpacing=`${w*.0024}px`;
 ctx.fillStyle=s.palette==='nocturne'?'#fff6d4':'#67279f';ctx.fillText('OPEN AFTER DARK.',margin,h*.046+w*.074);
 ctx.letterSpacing='0px';
 ctx.font=`${w*.022}px Artwork, Georgia, serif`;
 ctx.fillStyle=s.palette==='nocturne'?'#f4e7cd':'#432274';
 ctx.textAlign='right';ctx.fillText('@EuanTop',w-margin,h*.062);ctx.textAlign='left';
 frameTime=wrap(t);
 const sound=audio.diagnostics;
 canvas.dataset.audioPlaying=String(sound.playing);canvas.dataset.audioStarts=String(sound.starts);
 canvas.dataset.audioTime=sound.time===undefined?'':String(sound.time);canvas.dataset.audioVersion=sound.version;
 canvas.dataset.audioFrames=String(sound.frames??'');canvas.dataset.audioSampleRate=String(sound.sampleRate??'');
 return canvas;
}
function size(){
 const ratio=state.aspect==='3:4'?3/4:state.aspect==='9:16'?9/16:16/9;
 const maxH=innerHeight,maxW=innerWidth;
 const w=Math.min(maxW,maxH*ratio),h=w/ratio;
 document.documentElement.style.setProperty('--art-w',`${w}px`);
 document.documentElement.style.setProperty('--art-h',`${h}px`);
 return {w:Math.round(w*Math.min(devicePixelRatio,1.6)),h:Math.round(h*Math.min(devicePixelRatio,1.6))};
}
const api=async(path:string,method='GET',body?:unknown)=>{
 const r=await fetch('/__art'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const data=await r.json();if(!r.ok)throw Error(data.error||JSON.stringify(data));return data;
};
async function patch(patch:Partial<ArtState>){const r=await api('/state','PATCH',{expectedRevision:revision,patch});state=r.state;revision=r.revision;baseT=state.time;baseNow=performance.now();syncPanel();await updateAudio(patch.time!==undefined)}
function syncPanel(){
 panel.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-key]').forEach(el=>{const key=el.dataset.key as keyof ArtState;const val=state[key];if(el instanceof HTMLInputElement&&el.type==='checkbox')el.checked=!!val;else el.value=String(val)});
 document.querySelector('#pause')!.textContent=state.paused?'Play':'Pause';
}
function sceneClock(){return wrap(state.paused?state.time:baseT+(performance.now()-baseNow)/1000)}
function previewTime(){return state.paused?state.time:(state.music?audio.time:undefined)??sceneClock()}
async function updateAudio(seek=false){
 const request=++audioSync;audio.setVolume(state.volume);
 if(!state.music||state.paused){audio.stop();return}
 const {version}=await api('/music/version');nextMusicCheck=performance.now()+4000;
 await audio.load('/__art/audio?v='+encodeURIComponent(version),version);
 if(request!==audioSync||!state.music||state.paused)return;
 if(!audio.play(sceneClock(),seek))message('Press Music to enable sound.');
}
// Unlock only from a real user gesture. Loading a score never waits on an
// autoplay permission promise, so a suspended audio device cannot block drawing.
function unlockMusic(){void audio.unlock().then(()=>{if(state.music&&!state.paused)audio.play(sceneClock())}).catch(e=>message(e.message))}
document.addEventListener('pointerdown',()=>{if(state.music)unlockMusic()});

function message(value:string){const el=document.querySelector('#status');if(el)el.textContent=value}
function controlMarkup(){return `<header><p>AFTER HOURS</p><button id="close" aria-label="Close controls">×</button></header>
 <label>Frame<select data-key="aspect"><option>3:4</option><option>9:16</option><option>16:9</option></select></label>
 <label>Palette<select data-key="palette"><option value="violet">Electric violet</option><option value="ultraviolet">Acid ultraviolet</option><option value="nocturne">Deep violet</option></select></label>
 <label>Camera elevation<input data-key="cameraTilt" type="range" min="22" max="58" step="1"></label>
 <label>Lens / field of view<input data-key="cameraFov" type="range" min="28" max="52" step="1"></label>
 <label>Expressiveness<input data-key="motion" type="range" min="0" max="2" step="0.05"></label>
 <label>Light trail<input data-key="trail" type="range" min="0" max="2" step="0.05"></label>
 <label>Starlight<input data-key="river" type="range" min="0" max="1" step="0.05"></label>
 <label class="row">Music<input data-key="music" type="checkbox"></label>
 <label>Volume<input data-key="volume" type="range" min="0" max="1" step="0.01"></label>
 <label>Scene time<input data-key="time" type="range" min="0" max="28.799" step="0.02"></label>
 <div class="actions"><button id="pause">Pause</button><button id="image">Save image</button></div>
 <button class="primary" id="export">Export 4K film + lossless master</button><button id="cancel" hidden>Cancel export</button><p id="status" role="status">28.8 seconds · Seamless loop · Original score</p>`}
panel.innerHTML=controlMarkup();
menu.onclick=()=>panel.hidden=!panel.hidden;document.querySelector<HTMLButtonElement>('#close')!.onclick=()=>panel.hidden=true;
panel.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-key]').forEach(el=>el.onchange=()=>{
 const key=el.dataset.key!;let value:unknown=el.value;
 if(el instanceof HTMLInputElement)value=el.type==='checkbox'?el.checked:Number(el.value);
 if(key==='music'&&value)unlockMusic();
 patch({[key]:value,...(key==='time'?{paused:true}:{})}).catch(e=>message(e.message));
});
document.querySelector<HTMLButtonElement>('#pause')!.onclick=()=>patch({paused:!state.paused}).catch(e=>message(e.message));
async function job(kind:string,body:unknown){
 const j=await api('/'+kind,'POST',body);message('Rendering…');
 const cancel=document.querySelector<HTMLButtonElement>('#cancel')!;cancel.hidden=false;cancel.onclick=()=>api('/jobs/'+j.jobId+'/cancel','POST',{});
 while(true){await new Promise(r=>setTimeout(r,1600));const result=await api('/jobs/'+j.jobId);message(`${result.stage||result.status} ${result.progress?Math.round(result.progress*100)+'%':''}`);if(['completed','failed','canceled'].includes(result.status)){cancel.hidden=true;if(result.status==='completed')message(result.files.map((f:{path:string})=>f.path).join(' · '));break}}
}
document.querySelector<HTMLButtonElement>('#image')!.onclick=()=>{const [width,height]=FRAME_FORMATS[state.aspect].image;job('capture',{time:frameTime,revision,width,height}).catch(e=>message(e.message))};
document.querySelector<HTMLButtonElement>('#export')!.onclick=()=>{panel.hidden=true;job('exports',{revision,profile:FRAME_FORMATS[state.aspect].profile}).catch(e=>message(e.message))};
// The service and panel share state. This acknowledgement follows an actual draw.
let baseT=0,baseNow=performance.now();
async function synchronize(){
 try{
  const r=await api('/state');const previous=state,previousRevision=revision;
  const expected=wrap(state.paused?state.time:baseT+(performance.now()-baseNow)/1000);
  const delta=Math.abs(r.state.time-expected);const seeked=r.revision!==previousRevision&&Math.min(delta,DURATION-delta)>.12;
  state=r.state;revision=r.revision;baseT=state.time;baseNow=performance.now();syncPanel();
  if(seeked||state.paused||!state.music)audio.stop();
  const {w,h}=size();draw(previewTime(),w,h,state);
  const drawnRevision=revision,drawnTime=frameTime;
  await api('/ack','POST',{revision:drawnRevision,frameTime:drawnTime});
  if(seeked||previous.paused!==state.paused||previous.music!==state.music||previous.volume!==state.volume||(state.music&&performance.now()>nextMusicCheck))await updateAudio(seeked);
 }catch(e){console.warn(e)}
}
if(!offline){await synchronize();setInterval(synchronize,700)}
let last=0;
function animate(now:number){
 if(!offline&&now-last>1000/40){const {w,h}=size();draw(previewTime(),w,h,state);last=now}
 requestAnimationFrame(animate);
}
draw(0,720,960,state);document.querySelector('#loader')?.remove();ready=true;requestAnimationFrame(animate);
Object.assign(window,{art:{get ready(){return ready},renderFrame(t:number,w:number,h:number,s:ArtState){draw(t,w,h,s);return canvas.toDataURL('image/png')},snapshot:()=>({revision,frameTime,state,musicVersion:audio.version,audio:audio.diagnostics,renderer:artwork.renderer.info})}});
