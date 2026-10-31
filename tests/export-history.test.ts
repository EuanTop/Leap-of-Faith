import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readlink,lstat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// @ts-expect-error Export lifecycle uses a standalone Node module.
import {pointLatest,exportStamp} from '../scripts/export-history.mjs';

test('new exports preserve legacy files and all prior version directories',async()=>{
 const root=await mkdtemp(join(tmpdir(),'art-export-history-'));
 try{
  await mkdir(join(root,'latest'));await writeFile(join(root,'latest','share.mp4'),'legacy movie');
  await writeFile(join(root,'latest','manifest.json'),JSON.stringify({createdAt:'2026-10-30T14:17:24Z'}));
  await mkdir(join(root,'version-one'));await writeFile(join(root,'version-one','share.mp4'),'first movie');
  const first=await pointLatest(root,'version-one');
  assert.equal(await readFile(join(first.preserved,'share.mp4'),'utf8'),'legacy movie');
  assert.ok((await lstat(join(root,'latest'))).isSymbolicLink());
  assert.equal(await readlink(join(root,'latest')),'version-one');
  await mkdir(join(root,'version-two'));await writeFile(join(root,'version-two','share.mp4'),'second movie');
  const second=await pointLatest(root,'version-two');
  assert.equal(second.preserved,undefined);
  assert.equal(await readFile(join(root,'version-one','share.mp4'),'utf8'),'first movie');
  assert.equal(await readFile(join(first.preserved,'share.mp4'),'utf8'),'legacy movie');
  assert.equal(await readFile(join(root,'latest','share.mp4'),'utf8'),'second movie');
  await assert.rejects(pointLatest(root,'../escape'));
  assert.equal(exportStamp(new Date('2026-10-30T14:17:24Z')),'20261030_221724');
 }finally{await rm(root,{recursive:true,force:true})}
});
