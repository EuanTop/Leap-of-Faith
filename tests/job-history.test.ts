import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Standard-library service module.
import {trimJobHistory} from '../scripts/control.mjs';

test('long frame-capture sessions evict completed records without deleting active jobs or stale-key lookups',()=>{
 const jobs=new Map<string,{status:string}>(),keys=new Map<string,{id:string}>();
 for(let i=0;i<2000;i++){
  assert.ok(trimJobHistory(jobs,keys));
  jobs.set(String(i),{status:'completed'});keys.set('key-'+i,{id:String(i)});
  assert.ok(jobs.size<=100);assert.equal(keys.size,jobs.size);
  for(const entry of keys.values())assert.ok(jobs.has(entry.id));
 }
 jobs.set('active',{status:'running'});keys.set('active-key',{id:'active'});
 assert.ok(trimJobHistory(jobs,keys));assert.ok(jobs.has('active'));assert.ok(keys.has('active-key'));
 assert.ok(!keys.has('key-0'));
});

test('history pruning refuses to discard unfinished tasks when no completed record can be evicted',()=>{
 const jobs=new Map([['a',{status:'running'}],['b',{status:'queued'}]]),keys=new Map([['ka',{id:'a'}],['kb',{id:'b'}]]);
 assert.equal(trimJobHistory(jobs,keys,2),false);assert.equal(jobs.size,2);assert.equal(keys.size,2);
});
