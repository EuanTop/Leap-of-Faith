import {spawn} from 'node:child_process';
import {access,mkdir,readFile,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {once} from 'node:events';

export class Renderer {
 constructor(root,origin){this.root=root;this.origin=origin;this.pending=new Map();this.id=0;this.ready=false}
 async sourceStamp(){
  const hash=createHash('sha256'),dir=join(this.root,'src');
  const files=(await readdir(dir,{recursive:true})).filter(p=>/\.(ts|css|glsl)$/.test(p)).sort();
  for(const p of files){hash.update(p);hash.update(await readFile(join(dir,p)));}
  return hash.digest('hex');
 }
 async connect(){
  if(this.ready)return;
  if(this.connecting)return this.connecting;
  this.connecting=this.open().catch(async e=>{await this.close();this.connecting=undefined;throw e});return this.connecting;
 }
 async open(){
  const candidates=[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'].filter(Boolean);
  let binary;for(const p of candidates)try{await access(p);binary=p;break}catch{}
  if(!binary)throw Error('renderer_unavailable: set CHROME_PATH to a Chromium installation');
  const profile=join(this.root,'artifacts','.renderer');await mkdir(profile,{recursive:true});await rm(join(profile,'DevToolsActivePort'),{force:true});
  this.process=spawn(binary,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--hide-scrollbars','--remote-debugging-port=0','--remote-allow-origins=http://127.0.0.1','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
  this.log='';this.process.stderr.on('data',b=>this.log=(this.log+b.toString()).slice(-6000));
  let port;for(let i=0;i<150;i++){try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);break}catch{}if(this.process.exitCode!==null)throw Error('renderer_unavailable: '+this.log);await new Promise(r=>setTimeout(r,100))}
  if(!port)throw Error('Renderer launch timed out');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target=targets.find(t=>t.type==='page');if(!target)throw Error('Renderer page missing');
  this.socket=new WebSocket(target.webSocketDebuggerUrl);await once(this.socket,'open');
  this.socket.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){const entry=this.pending.get(msg.id);if(entry){this.pending.delete(msg.id);clearTimeout(entry.timer);msg.error?entry.reject(Error(msg.error.message)):entry.resolve(msg.result)}}});
  this.socket.addEventListener('close',()=>{this.ready=false;this.connecting=undefined;for(const e of this.pending.values()){clearTimeout(e.timer);e.reject(Error('Renderer disconnected'))}this.pending.clear()});
  await this.call('Page.enable');await this.call('Runtime.enable');
  this.stamp=await this.sourceStamp();
  await this.call('Page.navigate',{url:this.origin+'/?render=1&source='+this.stamp});
  let found=false;for(let i=0;i<150;i++){
   const r=await this.call('Runtime.evaluate',{expression:`Boolean(window.art?.ready)&&new URL(location.href).searchParams.get('source')===${JSON.stringify(this.stamp)}`,returnByValue:true});
   if(r.result?.value){found=true;break}await new Promise(r=>setTimeout(r,100));
  }
  if(!found){const r=await this.call('Runtime.evaluate',{expression:'document.body.innerText',returnByValue:true});throw Error('Renderer not ready: '+r.result?.value+' '+this.log)}
  this.ready=true;
 }
 call(method,params={},timeout=90000){
  return new Promise((resolve,reject)=>{const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Renderer timeout: '+method))},timeout);this.pending.set(id,{resolve,reject,timer});this.socket.send(JSON.stringify({id,method,params}))});
 }
 async frame(t,width,height,state){
  await this.connect();
  const stamp=await this.sourceStamp();
  if(stamp!==this.stamp){
   // HMR can leave the OLD ready flag true briefly. A source-stamped reload
   // prevents that old page from being accepted as the newly edited artwork.
   await this.call('Page.navigate',{url:this.origin+'/?render=1&source='+stamp});
   this.stamp=stamp;
  }
  // Source edits reload the isolated page too. A connected browser may still
  // be rebuilding the artwork; wait for its actual ready signal before capture.
  let artworkReady=false;
  for(let attempt=0;attempt<150;attempt++){
   const status=await this.call('Runtime.evaluate',{expression:`Boolean(window.art?.ready)&&new URL(location.href).searchParams.get('source')===${JSON.stringify(this.stamp)}`,returnByValue:true});
   if(status.result?.value){artworkReady=true;break}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!artworkReady){const r=await this.call('Runtime.evaluate',{expression:'document.body.innerText',returnByValue:true});throw Error('Artwork not ready after page reload: '+r.result?.value);}
  const expression=`window.art.renderFrame(${JSON.stringify(t)},${width},${height},${JSON.stringify(state)})`;
  const r=await this.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  const url=r.result?.value;if(typeof url!=='string'||!url.startsWith('data:image/png;base64,'))throw Error('Renderer did not return a PNG');
  return Buffer.from(url.split(',')[1],'base64');
 }
 async close(){const process=this.process;this.process=undefined;try{this.socket?.close();if(process&&process.exitCode===null){process.kill();await Promise.race([once(process,'exit'),new Promise(resolve=>setTimeout(resolve,2500))]);}}catch{}this.ready=false;this.connecting=undefined;}
}
