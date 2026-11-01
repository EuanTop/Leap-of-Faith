import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readlink,lstat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-expect-error Export lifecycle uses a standalone Node module.
import {pointLatest,exportStamp} from '../scripts/export-history.mjs';

async function movie(root:string,name:string,verified=true){
 const dir=join(root,name);await mkdir(dir);
 await writeFile(join(dir,'share.mp4'),name);
 await writeFile(join(dir,'manifest.json'),JSON.stringify({project:'Leap of Faith',frames:864,width:2880,height:3840}));
 if(verified)await writeFile(join(dir,'validation.json'),JSON.stringify({frames:864,size:[2880,3840],channels:2,decoders:{software:'full decode passed'}}));
 return dir;
}

test('a verified replacement removes old films and masters while keeping unrelated material',async()=>{
 const root=await mkdtemp(join(tmpdir(),'art-export-retention-'));
 try{
  const old=await movie(root,'20261101_113240_old');await writeFile(join(old,'master.mkv'),'old master');
  await movie(root,'latest');
  await mkdir(join(root,'notes'));await writeFile(join(root,'notes','keep.txt'),'keep');
  await mkdir(join(root,'.job-in-progress'));
  await movie(root,'20261101_141654_new');
  const result=await pointLatest(root,'20261101_141654_new');
  assert.equal(await readlink(join(root,'latest')),'20261101_141654_new');
  assert.equal(await readFile(join(root,'latest','share.mp4'),'utf8'),'20261101_141654_new');
  await assert.rejects(lstat(old));assert.equal(result.removed.length,2);assert.deepEqual(result.warnings,[]);
  assert.equal(await readFile(join(root,'notes','keep.txt'),'utf8'),'keep');
  assert.ok((await lstat(join(root,'.job-in-progress'))).isDirectory());
  assert.equal(exportStamp(new Date('2026-10-30T14:17:24Z')),'20261030_221724');
 }finally{await rm(root,{recursive:true,force:true})}
});

test('an unverified replacement cannot replace or delete the last usable film',async()=>{
 const root=await mkdtemp(join(tmpdir(),'art-export-retention-'));
 try{
  await movie(root,'20261101_113240_old');await pointLatest(root,'20261101_113240_old');
  await movie(root,'20261101_141654_bad',false);
  await assert.rejects(pointLatest(root,'20261101_141654_bad'));
  assert.equal(await readlink(join(root,'latest')),'20261101_113240_old');
  assert.ok((await lstat(join(root,'20261101_113240_old','share.mp4'))).isFile());
  await assert.rejects(pointLatest(root,'../escape'));
 }finally{await rm(root,{recursive:true,force:true})}
});
