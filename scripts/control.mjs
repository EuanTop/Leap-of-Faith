import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,writeFile,rename,rm,stat,statfs,copyFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {once} from 'node:events';
import {Renderer} from './renderer.mjs';
import {verifyShare} from './verify.mjs';
import {VERSION as MUSIC_VERSION} from './compose.mjs';
import {exportStamp,pointLatest} from './export-history.mjs';

const DURATION=28.8,FPS=30,FRAMES=864;
export const defaults={time:0,paused:false,motion:.95,river:.9,trail:1.35,palette:'nocturne',cameraTilt:40,cameraFov:35,aspect:'3:4',music:true,volume:.8,postStyle:'etching',postStrength:.45};
export const schema={time:{type:'number',min:0,max:28.8,unit:'seconds'},paused:{type:'boolean'},motion:{type:'number',min:0,max:2},river:{type:'number',min:0,max:1},trail:{type:'number',min:0,max:2},palette:{enum:['violet','ultraviolet','nocturne']},cameraTilt:{type:'number',min:22,max:58,unit:'degrees'},cameraFov:{type:'number',min:28,max:52,unit:'degrees'},aspect:{enum:['3:4','9:16','16:9']},music:{type:'boolean'},volume:{type:'number',min:0,max:1},postStyle:{enum:['original','prism','film','etching']},postStrength:{type:'number',min:0,max:1}};
export function validatePatch(patch){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Expected patch object');
 for(const [k,v] of Object.entries(patch)){
  const rule=schema[k];if(!rule)throw Error('Unknown parameter: '+k);
  if(rule.enum?!rule.enum.includes(v):typeof v!==rule.type||rule.type==='number'&&(!Number.isFinite(v)||v<rule.min||v>rule.max))throw Error('Invalid parameter: '+k);
 }return patch;
}
export const profiles={'portrait-4k':[2880,3840],'portrait-hd':[1440,1920],'story-4k':[2160,3840],'landscape-4k':[3840,2160]};
const stable=o=>JSON.stringify(o,Object.keys(o).sort());
export function trimJobHistory(jobs,keys,limit=100){
 for(const [id,job] of jobs){
  if(jobs.size<limit)break;
  if(!['completed','failed','canceled'].includes(job.status))continue;
  jobs.delete(id);
  for(const [key,entry] of keys)if(entry.id===id)keys.delete(key);
 }
 return jobs.size<limit;
}
export function shareEncoderArgs(wav,share,hardware=true){
 const codec=hardware?['-c:v','hevc_videotoolbox','-q:v','80']:['-c:v','libx265','-preset','medium','-crf','17','-x265-params','pools=4:frame-threads=2:log-level=error'];
 return ['-hide_banner','-loglevel','error','-y','-threads','4','-f','image2pipe','-vcodec','png','-framerate',String(FPS),'-i','pipe:0','-i',wav,'-map','0:v:0','-map','1:a:0','-frames:v',String(FRAMES),...codec,'-tag:v','hvc1','-pix_fmt','yuv420p','-g','30','-c:a','aac','-b:a','256k','-movflags','+faststart','-t',String(DURATION),share];
}
export function controlPlugin(){
 let server,root,origin,renderer;
 let state={...defaults},revision=0,appliedRevision=-1,frameTime=0,clock=performance.now();
 const jobs=new Map(),keys=new Map();let active=null;
 const current=()=>({...state,time:state.paused?state.time:(state.time+(performance.now()-clock)/1000)%DURATION});
 const error=(code,message)=>Object.assign(Error(message),{code});
 const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 const body=async req=>{const parts=[];let n=0;for await(const p of req){n+=p.length;if(n>65536)throw error(413,'JSON request too large');parts.push(p)}try{const v=JSON.parse(Buffer.concat(parts).toString()||'{}');if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v}catch{throw error(400,'Expected JSON object')}};
 const audioPath=()=>join(root,'artifacts/audio/score.wav');
 let audioRender;
 async function audio(){
  if(audioRender){await audioRender;return audioPath()}
  try{
   const [_,metadata]=await Promise.all([stat(audioPath()),readFile(join(root,'artifacts/audio/score.json'),'utf8')]);
   if(JSON.parse(metadata).version===MUSIC_VERSION)return audioPath();
  }catch{}
  if(!audioRender)audioRender=run(process.execPath,[join(root,'scripts/compose.mjs')],root);
  const pending=audioRender;
  try{await pending}finally{if(audioRender===pending)audioRender=null}return audioPath();
 }
 async function run(binary,args,cwd,job){
  const p=spawn(binary,args,{cwd,stdio:['ignore','ignore','pipe']});if(job)job.process=p;let log='';p.stderr.on('data',b=>log=(log+b).slice(-5000));const [code]=await once(p,'close');if(code!==0)throw Error(binary+' failed: '+log);
 }
 function publicJob(j){const {process,snapshot,cleanup,...rest}=j;return rest}
 function checkCancel(j){if(j.status==='canceled')throw Error('canceled');if(Date.now()>j.deadline)throw Error('Render exceeded 45 minute deadline')}
 async function task(j,fn){
  try{j.status='running';await fn();if(!j.published)checkCancel(j);j.status='completed';j.progress=1;j.stage='complete'}catch(e){j.process?.stdin?.destroy();j.process?.kill('SIGKILL');if(j.status!=='canceled'){j.status='failed';j.error=String(e.message)}if(j.cleanup)for(const p of j.cleanup)await rm(p,{force:true,recursive:true}).catch(()=>{})}finally{active=null;delete j.process;j.updatedAt=new Date().toISOString()}
 }
 async function capture(j,b){
  const w=b.width??1440,h=b.height??1920;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<64||h<64||w>3840||h>3840||w*h>2880*3840)throw Error('Unsupported capture size');
  const t=b.time??j.snapshot.time;if(!Number.isFinite(t)||t<0||t>DURATION)throw Error('Invalid capture time');
  j.stage='rendering';const renderState={...j.snapshot,...validatePatch(b.overrides??{})};const png=await renderer.frame(t,w,h,renderState);checkCancel(j);
  const path=join(root,'artifacts/images',`frame-${t.toFixed(2)}.png`);await mkdir(join(root,'artifacts/images'),{recursive:true});await writeFile(path,png);j.files=[{path,width:w,height:h,time:t}];j.frameTime=t;j.appliedRevision=j.revision;
 }
 async function video(j,b){
  const size=profiles[b.profile||'portrait-4k'];if(!size)throw Error('Unknown export profile');
  const [w,h]=size;const disk=await statfs(join(root,'artifacts'));if(Number(disk.bavail)*Number(disk.bsize)<4*1024**3)throw Error('At least 4 GiB free output storage required');
  const exports=join(root,'artifacts/exports'),dir=join(exports,`.job-${j.jobId}`);await mkdir(dir,{recursive:true});
  const share=join(dir,'share.mp4');j.cleanup=[dir];
  const sourceWav=await audio(),wav=join(dir,'source-audio.wav');await copyFile(sourceWav,wav);checkCancel(j);j.stage='rendering frames';
  let hardware=process.platform==='darwin';
  if(hardware)try{await run(process.env.FFMPEG_PATH||'ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`color=black:s=${w}x${h}:r=30`,'-frames:v','1','-c:v','hevc_videotoolbox','-pix_fmt','yuv420p','-f','null','-'],root,j)}catch{checkCancel(j);hardware=false}
  const encoder=spawn(process.env.FFMPEG_PATH||'ffmpeg',shareEncoderArgs(wav,share,hardware),{stdio:['pipe','ignore','pipe']});
  j.process=encoder;let encError;encoder.stdin.on('error',e=>encError=e);let log='';encoder.stderr.on('data',b=>log=(log+b).slice(-4000));const done=once(encoder,'close');
  const validation=join(dir,'source-frames');await mkdir(validation,{recursive:true});
  const hashes=[];
  for(let f=0;f<FRAMES;f++){
   checkCancel(j);if(encError)throw Error('Sharing encoder stopped: '+(log||encError.message));
   const png=await renderer.frame(f/FPS,w,h,{...j.snapshot,aspect:w/h===.75?'3:4':w/h<1?'9:16':'16:9'});
   if([0,216,432,648,863].includes(f)){const name=`source-${f}.png`;await writeFile(join(validation,name),png);hashes.push({frame:f,pngSha256:createHash('sha256').update(png).digest('hex'),name})}
   if(!encoder.stdin.write(png))await Promise.race([once(encoder.stdin,'drain'),done.then(([code])=>{throw Error('Sharing encoder stopped '+code+': '+log)})]);j.frame=f+1;j.progress=(f+1)/FRAMES*.90;
  }
  encoder.stdin.end();const [code]=await done;if(code!==0)throw Error('Sharing encoding failed: '+log);checkCancel(j);
  checkCancel(j);
  const manifest={project:'Leap of Faith',duration:DURATION,fps:FPS,frames:FRAMES,width:w,height:h,revision:j.revision,snapshot:j.snapshot,sourceFrames:hashes,sourceFramesDirectory:'source-frames',createdAt:new Date().toISOString(),music:JSON.parse(await readFile(join(root,'artifacts/audio/score.json'),'utf8')).version};
  await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest,null,2));
  j.stage='verifying sharing film';j.progress=.93;await verifyShare(dir,'share.mp4',true,p=>{j.process=p;try{checkCancel(j)}catch(e){p.kill('SIGTERM');throw e}});checkCancel(j);
  // Publication is a commit boundary: cancellation remains available until this
  // point, then is refused while the verified directory is atomically swapped.
  j.committing=true;j.stage='publishing verified files';
  const versionName=`${exportStamp(new Date(j.createdAt))}_${j.jobId.slice(0,8)}`,version=join(exports,versionName);
  await rename(dir,version);j.published=true;j.cleanup=[];
  j.files=[{path:join(version,'share.mp4'),type:'share'}];
  try{const result=await pointLatest(exports,versionName);j.removedExports=result.removed;if(result.warnings.length)j.warning='Some previous exports could not be removed: '+result.warnings.join('; ')}catch(e){j.warning='Verified output retained; latest shortcut could not be updated: '+e.message}
 }
 return {name:'leap-of-faith-control',configureServer(s){
  server=s;root=server.config.root;origin=`http://127.0.0.1:${server.config.server.port}`;renderer=new Renderer(root,origin);
  server.httpServer?.on('close',()=>renderer.close());
  server.middlewares.use(async(req,res,next)=>{
   if(!req.url?.startsWith('/__art'))return next();
   try{
    if(!['127.0.0.1:'+server.config.server.port,'localhost:'+server.config.server.port].includes(req.headers.host))throw error(403,'Invalid Host');
    if(req.method!=='GET'&&req.headers.origin!=='http://'+req.headers.host)throw error(403,'Same-origin request required');
    const url=new URL(req.url,origin),path=url.pathname.slice(6);
    if(req.method==='GET'&&path==='')return reply(res,200,{protocol:1,project:'leap-of-faith',capabilities:['schema','state.read','state.patch','capture','exports','jobs','jobs.cancel','music.score','music.render'],rendererConnected:renderer.ready,duration:DURATION});
    if(req.method==='GET'&&path==='/diagnostics'){if(!renderer.ready)throw error(503,'Renderer not connected');const r=await renderer.call('Runtime.evaluate',{expression:'window.art.diagnostics()',returnByValue:true});return reply(res,200,r.result?.value??{});}
    if(req.method==='GET'&&path==='/schema')return reply(res,200,{parameters:schema,defaults,profiles});
    if(req.method==='GET'&&path==='/state')return reply(res,200,{revision,state:current(),appliedRevision,frameTime});
    if(req.method==='GET'&&path==='/audio'){
     try{const p=await audio();const st=await stat(p);res.writeHead(200,{'Content-Type':'audio/wav','Content-Length':st.size,'Cache-Control':'no-store'});createReadStream(p).pipe(res)}catch{reply(res,503,{error:'Score rendering not complete'})}return;
    }
    if(req.method==='GET'&&path==='/music/version'){await audio();return reply(res,200,{version:MUSIC_VERSION})}
    if(req.method==='GET'&&path==='/music/score'){await audio();return reply(res,200,JSON.parse(await readFile(join(root,'artifacts/audio/score.json'),'utf8')))}
    const match=path.match(/^\/jobs\/([a-zA-Z0-9_-]+)(\/cancel)?$/);
    if(match){const j=jobs.get(match[1]);if(!j)throw error(404,'Unknown job');if(req.method==='POST'&&match[2]){await body(req);if(j.committing&&!j.published)throw error(409,'Verified output publication is committing; query the task');if(!['completed','failed','canceled'].includes(j.status)&&!j.published){j.status='canceled';j.process?.stdin?.destroy();j.process?.kill('SIGKILL')}return reply(res,200,publicJob(j))}if(req.method==='GET'&&!match[2])return reply(res,200,publicJob(j))}
    if(req.method==='PATCH'&&path==='/state'){
     const b=await body(req);if(b.expectedRevision!==revision)throw error(409,'State revision conflict');
     try{validatePatch(b.patch)}catch(e){throw error(400,e.message)}state={...current(),...b.patch};clock=performance.now();revision++;return reply(res,200,{revision,state,appliedRevision,frameTime});
    }
    if(req.method==='POST'&&path==='/ack'){const b=await body(req);if(b.revision===revision&&Number.isFinite(b.frameTime)){appliedRevision=revision;frameTime=b.frameTime}return reply(res,200,{appliedRevision})}
    if(req.method==='POST'&&['/capture','/exports','/music/render'].includes(path)){
     const b=await body(req);const key=b.idempotencyKey??randomUUID();if(typeof key!=='string'||key.length>128)throw error(400,'Invalid idempotency key');
     const signature=path+stable(b),prior=keys.get(key);
     if(prior){if(prior.signature!==signature)throw error(409,'Idempotency key has another payload');return reply(res,200,publicJob(jobs.get(prior.id)))}
     if(b.revision!==revision)throw error(409,'State revision conflict');if(active)throw error(409,'Another render task is active');
     if(!trimJobHistory(jobs,keys))throw error(429,'Too many unfinished tasks');
     if(path==='/music/render'){
      if(b.range!==undefined||b.mix!==undefined)throw error(400,'This project renders the full mix only; omit range and mix');
      await audio();const score=JSON.parse(await readFile(join(root,'artifacts/audio/score.json'),'utf8'));if(b.version!==undefined&&b.version!==score.version)throw error(409,'Score version conflict');
     }
     const j={jobId:randomUUID(),status:'queued',progress:0,revision,snapshot:current(),createdAt:new Date().toISOString(),deadline:Date.now()+45*60*1000,files:[]};jobs.set(j.jobId,j);keys.set(key,{signature,id:j.jobId});active=j.jobId;
     reply(res,202,publicJob(j));
     task(j,()=>path==='/capture'?capture(j,b):path==='/exports'?video(j,b):(async()=>{await audio();j.files=[{path:audioPath()}]})());return;
    }
    throw error(404,'Unknown control request');
   }catch(e){if(!res.headersSent)reply(res,e.code||500,{error:e.message})}
  });
 }};
}
