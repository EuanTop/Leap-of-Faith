import {spawn} from 'node:child_process';
import {readFile,writeFile,realpath,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function command(binary,args,hash=false,onProcess){
 return new Promise((resolve,reject)=>{
  const p=spawn(binary,args,{stdio:['ignore','pipe','pipe']});let chunks=[],error='';const digest=hash?createHash('sha256'):null;
  onProcess?.(p);
  p.stdout.on('data',b=>hash?digest.update(b):chunks.push(b));p.stderr.on('data',b=>error=(error+b).slice(-4000));p.on('error',reject);
  p.on('close',code=>code===0?resolve(hash?digest.digest('hex'):Buffer.concat(chunks).toString()):reject(Error(binary+' failed: '+error)));
 });
}
export async function verify(dir,masterName='master.mkv',shareName='share.mp4',save=true,onProcess){
 const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 const root=dirname(dirname(dir));
 const report={size:[manifest.width,manifest.height],duration:28.8,frames:864,sourceRgb:[],decoders:{},audio:{}};
 for(const [kind,name] of [['master',masterName],['share',shareName]]){
  const path=join(dir,name);
  const meta=JSON.parse(await command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path],false,onProcess));
  const video=meta.streams.find(s=>s.codec_type==='video'),audio=meta.streams.find(s=>s.codec_type==='audio');
  if(video.width!==manifest.width||video.height!==manifest.height||video.r_frame_rate!=='30/1'||Math.abs(Number(meta.format.duration)-28.8)>.08||audio?.channels!==2)throw Error(kind+' metadata mismatch');
  if(kind==='master'&&(video.codec_name!=='ffv1'||audio.codec_name!=='pcm_s16le'||!['gbrp','bgr0','rgb24'].includes(video.pix_fmt)))throw Error('Not an RGB/PCM lossless master');
  if(kind==='share'&&video.codec_name!=='hevc')throw Error('Expected 4K HEVC share encoding');
  report[kind]={width:video.width,height:video.height,codec:video.codec_name,pixelFormat:video.pix_fmt,duration:Number(meta.format.duration),audioCodec:audio.codec_name,channels:audio.channels};
  // Full decode, not merely a container probe. Strict errors reject corrupt frames.
  const progress=await command('ffmpeg',['-hide_banner','-loglevel','error','-xerror','-threads','4','-i',path,'-map','0:v:0','-map','0:a:0','-progress','pipe:1','-nostats','-f','null','-'],false,onProcess);
  const counts=[...progress.matchAll(/^frame=(\d+)$/gm)].map(m=>Number(m[1]));
  if(counts.at(-1)!==864)throw Error(kind+' does not decode to 864 frames');
  report.decoders[kind]='full software decode passed';report[kind].decodedFrames=counts.at(-1);
 }
 for(const item of manifest.sourceFrames){
  const image=manifest.sourceFramesDirectory?join(dir,manifest.sourceFramesDirectory,item.name):join(root,'validation',item.name);
  const src=await command('ffmpeg',['-v','error','-i',image,'-f','rawvideo','-pix_fmt','rgb24','-'],true,onProcess);
  const decoded=await command('ffmpeg',['-v','error','-threads','4','-ss',(item.frame/30).toFixed(6),'-i',join(dir,masterName),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],true,onProcess);
  if(src!==decoded)throw Error('Lossless RGB mismatch at frame '+item.frame);
  report.sourceRgb.push({frame:item.frame,sha256:src,exact:true});
 }
 let wav=join(dir,'source-audio.wav');
 try{await access(wav)}catch(error){if(error.code!=='ENOENT')throw error;wav=join(root,'audio','score.wav')}
 const pcmArgs=['-v','error','-i',wav,'-map','0:a:0','-f','s16le','-acodec','pcm_s16le','-'];
 const srcPcm=await command('ffmpeg',pcmArgs,true,onProcess);
 const masterPcm=await command('ffmpeg',['-v','error','-i',join(dir,masterName),'-map','0:a:0','-f','s16le','-acodec','pcm_s16le','-'],true,onProcess);
 if(srcPcm!==masterPcm)throw Error('Lossless PCM mismatch');report.audio={sha256:srcPcm,exact:true};
 if(process.platform==='darwin'){
  await command('ffmpeg',['-hide_banner','-loglevel','error','-xerror','-hwaccel','videotoolbox','-i',join(dir,shareName),'-map','0:v:0','-an','-f','null','-'],false,onProcess);report.decoders.shareHardware='full VideoToolbox decode passed';
 }
 if(save)await writeFile(join(dir,'validation.json'),JSON.stringify(report,null,2));return report;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=dirname(dirname(fileURLToPath(import.meta.url)));const artifacts=await realpath(join(root,'artifacts'));
 console.log(JSON.stringify(await verify(join(artifacts,'exports/latest')),null,2));
}
