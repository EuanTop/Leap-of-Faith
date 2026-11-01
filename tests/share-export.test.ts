import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error Standard-library service module.
import {shareEncoderArgs} from '../scripts/control.mjs';

test('both encoding paths stream directly to one sharing MP4 without a master intermediate',()=>{
 for(const hardware of [true,false]){
  const args=shareEncoderArgs('score.wav','share.mp4',hardware);
  assert.equal(args.at(-1),'share.mp4');assert.ok(args.includes('pipe:0'));assert.ok(args.includes('aac'));assert.ok(args.includes('hvc1'));
  assert.equal(args[args.indexOf('-frames:v')+1],'864');assert.equal(args[args.indexOf('-t')+1],'28.8');
  assert.ok(!args.some((arg:string)=>/ffv1|master|\.mkv/.test(arg)));
 }
 assert.ok(shareEncoderArgs('a.wav','share.mp4',true).includes('hevc_videotoolbox'));
 assert.ok(shareEncoderArgs('a.wav','share.mp4',false).includes('libx265'));
});
