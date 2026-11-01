import {lstat,readFile,readdir,rename,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export function exportStamp(date=new Date()) {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date).replace(/[-:]/g,'').replace(' ','_');
}

// Switch to a verified replacement first; only then remove this artwork's old
// generated films. Unknown folders, symlinks and unfinished jobs are untouched.
export async function pointLatest(exports,versionName) {
  if(!/^[a-zA-Z0-9_-]+$/.test(versionName))throw Error('Invalid export version name');
  const version=join(exports,versionName);
  if(!(await lstat(version)).isDirectory())throw Error('Export version is not a directory');
  const manifest=JSON.parse(await readFile(join(version,'manifest.json'),'utf8'));
  const check=JSON.parse(await readFile(join(version,'validation.json'),'utf8'));
  if(!['Leap of Faith','Upside Down'].includes(manifest.project)||![manifest.frames,manifest.width,manifest.height].every(n=>Number.isInteger(n)&&n>0)||!(await lstat(join(version,'share.mp4'))).isFile()||check.frames!==manifest.frames||check.size?.[0]!==manifest.width||check.size?.[1]!==manifest.height||check.channels!==2||check.decoders?.software!=='full decode passed')throw Error('Replacement film has not passed validation');
  const latest=join(exports,'latest');
  let current;
  try{current=await lstat(latest)}catch(error){if(error.code!=='ENOENT')throw error}
  let legacy;
  if(current&&!current.isSymbolicLink()) {
    if(!current.isDirectory())throw Error('latest must be a directory or a symbolic link');
    const old=JSON.parse(await readFile(join(latest,'manifest.json'),'utf8'));
    if(!['Leap of Faith','Upside Down'].includes(old.project)||!(await lstat(join(latest,'share.mp4'))).isFile())throw Error('Legacy latest is not a recognized film directory');
    legacy=join(exports,`.previous-latest-${randomUUID()}`);
    await rename(latest,legacy);
  }
  const temporary=join(exports,`.latest-link-${randomUUID()}`);
  try{await symlink(versionName,temporary,'dir');await rename(temporary,latest)}
  catch(error){if(legacy)await rename(legacy,latest);throw error}
  finally{await rm(temporary,{force:true})}
  const removed=[],warnings=[];
  const erase=async path=>{try{await rm(path,{recursive:true,force:true});removed.push(path)}catch(error){warnings.push(`${path}: ${error.message}`)}};
  if(legacy)await erase(legacy);
  for(const entry of await readdir(exports,{withFileTypes:true})){
    if(entry.name===versionName||!entry.isDirectory()||!/^\d{8}_\d{6}_[a-zA-Z0-9_-]+$/.test(entry.name))continue;
    const path=join(exports,entry.name);
    try{
      const old=JSON.parse(await readFile(join(path,'manifest.json'),'utf8'));
      if(!['Leap of Faith','Upside Down'].includes(old.project)||!(await lstat(join(path,'share.mp4'))).isFile())continue;
    }catch{continue}
    await erase(path);
  }
  return {latest,removed,warnings};
}
