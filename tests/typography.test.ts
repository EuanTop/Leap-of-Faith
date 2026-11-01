import test from 'node:test';
import assert from 'node:assert/strict';
import {regionInk,LIGHT_INK,DARK_INK} from '../src/inverted/typography.ts';

test('text ink follows the actual sampled yellow and violet background independently by position',()=>{
 const w=48,h=64,pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;pixels.set(x<w/2?[79,25,104,255]:[238,212,157,255],i);}
 assert.equal(regionInk(pixels,w,h,.05,.05,.25,.06),LIGHT_INK);
 assert.equal(regionInk(pixels,w,h,.65,.90,.25,.06),DARK_INK);
});
test('ink remains contrast-aware when a finishing pass makes a dark raw palette look pale',()=>{
 const pixels=new Uint8ClampedArray(48*64*4);
 for(let i=0;i<pixels.length;i+=4)pixels.set([224,207,190,255],i);
 assert.equal(regionInk(pixels,48,64,.05,.05,.35,.06),DARK_INK);
 for(let i=0;i<pixels.length;i+=4)pixels.set([84,32,108,255],i);
 assert.equal(regionInk(pixels,48,64,.05,.05,.35,.06),LIGHT_INK);
});

test('text and its halo interpolate continuously rather than switch at a contrast threshold',async()=>{
 const {regionInkMix,inkAtBlend}=await import('../src/inverted/typography.ts');
 const pixels=new Uint8ClampedArray(4*4*4);let previous=0;
 for(let value=30;value<=250;value++){
  for(let i=0;i<pixels.length;i+=4)pixels.set([value,value,value,255],i);
  const mix=regionInkMix(pixels,4,4,0,0,1,1);
  assert.ok(mix>=previous&&mix-previous<.04);previous=mix;
 }
 assert.equal(previous,1);assert.notEqual(inkAtBlend(.5),LIGHT_INK);assert.notEqual(inkAtBlend(.5),DARK_INK);
});
