import {lstat,readFile,rename,symlink,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export function exportStamp(date=new Date()) {
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date).replace(/[-:]/g,'').replace(' ','_');
}

// Only the convenience link changes. Each completed render keeps its own
// immutable directory; an older physical latest/ directory is archived first.
export async function pointLatest(exports,versionName) {
  if(!/^[a-zA-Z0-9_-]+$/.test(versionName))throw Error('Invalid export version name');
  if(!(await lstat(join(exports,versionName))).isDirectory())throw Error('Export version is not a directory');
  const latest=join(exports,'latest');
  let current;
  try{current=await lstat(latest)}catch(error){if(error.code!=='ENOENT')throw error}
  let preserved;
  if(current&&!current.isSymbolicLink()) {
    if(!current.isDirectory())throw Error('latest must be a directory or a symbolic link');
    let date=current.mtime;
    try{const metadata=JSON.parse(await readFile(join(latest,'manifest.json'),'utf8'));if(Number.isFinite(Date.parse(metadata.createdAt)))date=new Date(metadata.createdAt)}catch{}
    preserved=join(exports,`preserved_${exportStamp(date)}_${randomUUID().slice(0,8)}`);
    await rename(latest,preserved);
  }
  const temporary=join(exports,`.latest-link-${randomUUID()}`);
  try{await symlink(versionName,temporary,'dir');await rename(temporary,latest)}
  finally{await rm(temporary,{force:true})}
  return {latest,preserved};
}
