import './music-desk.css';
type Event={id:string;track:string;start:number;end:number;pitch:number;note:string;continuationOf?:string};
type Score={version:string;duration:number;bpm:number;meter:string;harmony:string[];events:Event[]};
const root=document.querySelector<HTMLElement>('#desk')!;
root.innerHTML='<p class="loading">Loading the current score…</p>';
const response=await fetch('/__art/music/score',{cache:'no-store'});
if(!response.ok)throw Error('The score could not be loaded');
const score:Score=await response.json();
const names:Record<string,string>={'gravity':'Low foundation','tidal-harmony':'Harmony','duck-voice':'Duck voice','swan-voice':'Swan voice','orbital-air':'Orbital air'};
const tracks=Object.keys(names).filter(track=>score.events.some(e=>e.track===track));
root.innerHTML=`<header><div><p class="eyebrow">MUSIC DESK</p><h1>Leap of Faith</h1><p class="meta"></p></div><a href="/">Artwork ↗</a></header>
<section class="transport"><audio controls preload="auto"></audio><span id="clock">0.000s</span></section>
<section class="selection"><div><p class="eyebrow">SELECTED NOTE</p><h2 id="note-title">Select a note below</h2><p id="note-detail">The timeline shows the actual synthesized score.</p></div><div class="actions"><button id="audition" disabled>Play range</button><label><input id="loop" type="checkbox">Loop range</label><button id="copy" disabled>Copy reference</button></div><textarea id="reference" readonly aria-label="Note reference" placeholder="Version · Event ID · Track · Time · Note"></textarea><p id="feedback" aria-live="polite">Range playback uses the complete mix.</p></section>
<section class="timeline-wrap"><div class="timeline"><div class="ruler-row"><span>TRACK / NOTE</span><div class="ruler"></div></div><div id="tracks"></div></div></section>
<footer>Click a note to select it. Copy reference includes the score version, event ID, track, time and pitch. No audio or arrangement edits are made here.</footer>`;
root.querySelector('.meta')!.textContent=`${score.duration}s · ${score.bpm} BPM · ${score.meter} · ${score.version}`;
const audio=root.querySelector<HTMLAudioElement>('audio')!;audio.src='/__art/audio?v='+encodeURIComponent(score.version);
const clock=root.querySelector<HTMLElement>('#clock')!,reference=root.querySelector<HTMLTextAreaElement>('#reference')!;
const audition=root.querySelector<HTMLButtonElement>('#audition')!,copy=root.querySelector<HTMLButtonElement>('#copy')!,loop=root.querySelector<HTMLInputElement>('#loop')!;
const feedback=root.querySelector<HTMLElement>('#feedback')!;
const ruler=root.querySelector<HTMLElement>('.ruler')!;
for(let t=0;t<=score.duration;t+=1.2){const tick=document.createElement('span');tick.style.left=`${t/score.duration*100}%`;tick.textContent=t.toFixed(1);ruler.append(tick);}
const lanes=root.querySelector<HTMLElement>('#tracks')!;
const playheads:HTMLElement[]=[];
let selected:Event|undefined,rangePlaying=false;
const buttons=new Map<string,HTMLButtonElement>();
function select(event:Event){
 selected=event;rangePlaying=false;
 buttons.forEach((button,id)=>{const active=id===event.id;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
 root.querySelector('#note-title')!.textContent=`${names[event.track]??event.track} · ${event.note}`;
 root.querySelector('#note-detail')!.textContent=`${event.start.toFixed(3)}–${event.end.toFixed(3)}s · ${event.id}${event.continuationOf?' · continued across loop':''}`;
 reference.value=`Leap of Faith · ${score.version}\n${event.id} | ${names[event.track]??event.track} (${event.track}) | ${event.start.toFixed(3)}–${event.end.toFixed(3)}s | ${event.note}`;
 audition.disabled=false;copy.disabled=false;feedback.textContent='Play range auditions this time span in the full mix.';
 audio.currentTime=event.start;
}
tracks.forEach((track,index)=>{
 const events=score.events.filter(e=>e.track===track),min=Math.min(...events.map(e=>e.pitch)),max=Math.max(...events.map(e=>e.pitch));
 const row=document.createElement('div');row.className='track-row';row.style.setProperty('--track',String(index));
 const label=document.createElement('div');label.className='track-label';label.innerHTML=`<strong>${names[track]}</strong><span>${events.length} events</span>`;
 const lane=document.createElement('div');lane.className='lane';
 const head=document.createElement('div');head.className='playhead';lane.append(head);playheads.push(head);
 events.forEach(event=>{
  const button=document.createElement('button');button.className='note';button.style.left=`${event.start/score.duration*100}%`;button.style.width=`${(event.end-event.start)/score.duration*100}%`;
  button.style.top=`${12+(max-event.pitch)/Math.max(1,max-min)*72}px`;button.textContent=event.note;button.title=`${event.id} · ${event.note} · ${event.start.toFixed(3)}–${event.end.toFixed(3)}s`;
  button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>select(event));buttons.set(event.id,button);lane.append(button);
 });
 row.append(label,lane);lanes.append(row);
});
audition.addEventListener('click',async()=>{if(!selected)return;audio.currentTime=selected.start;rangePlaying=true;try{await audio.play();}catch{feedback.textContent='Press the audio play button to enable playback.';}});
copy.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(reference.value);feedback.textContent='Reference copied. Paste it into the chat with your feedback.';}
 catch{reference.focus();reference.select();feedback.textContent='Reference selected. Press ⌘C / Ctrl+C to copy.';}
});
audio.addEventListener('seeking',()=>{if(rangePlaying&&selected&&(audio.currentTime<selected.start-.05||audio.currentTime>selected.end+.05))rangePlaying=false;});
audio.addEventListener('ended',()=>{if(rangePlaying&&loop.checked&&selected){audio.currentTime=selected.start;void audio.play();}});
function draw(){
 if(rangePlaying&&selected&&audio.currentTime>=selected.end){if(loop.checked)audio.currentTime=selected.start;else{audio.pause();rangePlaying=false;}}
 const t=audio.currentTime;clock.textContent=t.toFixed(3)+'s';playheads.forEach(head=>head.style.left=`${t/score.duration*100}%`);requestAnimationFrame(draw);
}
draw();
// The opened page must not silently point to an older arrangement after a revision.
setInterval(async()=>{try{const r=await fetch('/__art/music/version',{cache:'no-store'});if(!r.ok)return;const current=await r.json();if(current.version!==score.version){audio.pause();feedback.textContent='The score has changed. Reload this page before copying a reference.';copy.disabled=true;audition.disabled=true;}}catch{}},15000);
