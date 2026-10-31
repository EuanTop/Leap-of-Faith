import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error The score is intentionally a standalone standard-library module.
import { createScore, inspectScore, encodeWav, DURATION, VERSION } from '../scripts/compose.mjs';
// @ts-expect-error Shared synthesis module has no separate declaration file.
import { addCosmicArrangement } from '../scripts/cosmic.mjs';

const score = createScore();
const metrics = inspectScore(score);

test('the foreground breathes in half-time without a drum kit or rapid chord stabs', () => {
  const bass = score.events.filter((event: {track:string}) => event.track==='electric-bass');
  assert.equal(bass.length,24);
  for(let b=1;b<=12;b++) {
    const notes=bass.filter((event: {bar:number}) => event.bar===b);
    assert.equal(notes.length,2);
    assert.ok(notes.every((event: {start:number;end:number}) => event.end-event.start>=.69));
    assert.ok(notes[1].start-notes[0].start>1.5);
  }
  const chords=score.events.filter((event: {track:string}) => event.track==='floating-chords');
  assert.equal(chords.length,60);
  assert.ok(chords.every((event: {start:number;end:number}) => event.end-event.start>2));
  assert.ok(!score.events.some((event: {track:string}) =>
    ['kick','brushed-snare','dust-shaker','soft-rim'].includes(event.track)));
  const calls=score.events.filter((event: {track:string}) => event.track==='duck-call');
  assert.equal(calls.length,11);
  assert.ok(calls.some((event: {start:number}) => event.start<1));
  for (const track of ['gravity-sub', 'orbital-cloud', 'stellar-halo', 'event-horizon', 'distant-resonance']) {
    assert.ok(score.events.some((event: {track: string; start: number}) => event.track === track && event.start < 1.1));
  }
  const organ = score.events.filter((event: {track: string}) => event.track === 'shadow-organ' && !event.continuationOf);
  assert.equal(organ.length, 12);
  assert.ok(organ.every((event: {start: number}) => event.start >= 19.2));
  assert.ok(organ.some((event: {start: number}) => event.start >= 27));
  assert.ok(score.events.some((event: {track: string; continuationOf?: string}) =>
    event.track === 'event-horizon' && event.continuationOf));
});

test('score is exactly twelve bars, finite, stereo, and repeatable', () => {
  assert.equal(DURATION, 28.8);
  assert.equal(score.sampleRate, 48000);
  assert.equal(score.duration, DURATION);
  assert.equal(score.version, VERSION);
  assert.equal(score.left.length, 1382400);
  assert.equal(score.right.length, score.left.length);
  for (let i = 0; i < score.left.length; i++) {
    assert.ok(Number.isFinite(score.left[i]) && Number.isFinite(score.right[i]));
  }
  const repeated = createScore();
  assert.deepEqual(score.left, repeated.left);
  assert.deepEqual(score.right, repeated.right);
  assert.deepEqual(score.events, repeated.events);
});

test('mix has headroom, useful energy, audible stereo, and a continuous loop boundary', () => {
  assert.ok(metrics.peak > 0.25 && metrics.peak < 0.95, `peak ${metrics.peak}`);
  assert.ok(metrics.rms > 0.06 && metrics.rms < 0.30, `RMS ${metrics.rms}`);
  assert.ok(metrics.sideToMidRms > 0.22 && metrics.sideToMidRms < 0.6);
  assert.ok(metrics.stereoCorrelation > .65 && metrics.stereoCorrelation < .95);
  assert.ok(metrics.monoRetention > .94, `mono retention ${metrics.monoRetention}`);
  assert.ok(metrics.seamJump < 0.018, `seam jump ${metrics.seamJump}`);
  assert.ok(metrics.seamJump <= metrics.maxAdjacentStep * 1.1);
  for (const bar of metrics.bars) assert.ok(bar.rms > 0.05, `silent bar ${bar.bar}`);
  // Require energy on both sides, rather than only matching two endpoint samples.
  const window = 4800;
  for (const start of [0, score.left.length - window]) {
    let energy = 0;
    for (let i = start; i < start + window; i++) energy += score.left[i] ** 2 + score.right[i] ** 2;
    assert.ok(Math.sqrt(energy / (window * 2)) > 0.025);
  }
});

test('spatial voices travel to both sides, close their orbits, and leave the sub centred', () => {
  const events: any[] = [];
  addCosmicArrangement({add: (event: any) => events.push(event),
    harmony: Array.from({length:12}, () => [51,58,61,65,68]),
    roots: Array(12).fill(39), duration:DURATION, beat:.6});
  for (const event of events.filter(event => typeof event.pan === 'function')) {
    const positions = Array.from({length:288}, (_,i) => event.pan(i * DURATION / 288));
    assert.ok(Math.min(...positions) < -.85 && Math.max(...positions) > .85);
    assert.ok(Math.abs(event.pan(0)-event.pan(DURATION)) < 1e-10);
    assert.ok(Math.abs(event.pan(.001)-event.pan(DURATION-.001)) < .003);
  }
  assert.equal(events.find(event => event.track === 'gravity-sub').pan, undefined);
  const halo = events.filter(event => event.track === 'stellar-halo');
  assert.equal(halo.length,24);
  assert.ok(halo[0].pan(0) * halo[1].pan(0) < 0);
});

test('cosmic foundations follow the bass roots and direct pads sustain only shared chord tones', () => {
  const bar = 2.4;
  const roots = Array.from({length:12}, (_,b) => score.events.find((event: any) =>
    event.track === 'electric-bass' && Math.abs(event.start - b * bar) < 1e-5).pitch);
  const chords = Array.from({length:12}, (_,b) => new Set([
    roots[b] % 12, ...score.events.filter((event: any) => event.track === 'floating-chords' && event.bar === b+1).map((event: any) => event.pitch % 12)
  ]));
  for (const track of ['gravity-sub','event-horizon']) {
    const foundations = score.events.filter((event: any) => event.track === track && !event.continuationOf);
    assert.equal(foundations.length,12);
    for (const event of foundations) assert.equal(event.pitch % 12, roots[event.bar-1] % 12);
  }
  for (const event of score.events.filter((event: any) =>
    ['orbital-cloud','stellar-halo','distant-resonance'].includes(event.track))) {
    for (let b=1; b<12; b++) {
      if (event.start < b*bar - 1e-5 && event.end > b*bar + 1e-5)
        assert.ok(chords[b].has(event.pitch % 12), `${event.id} holds a conflicting tone into bar ${b+1}`);
    }
  }
});

test('event references describe the actual early layers and stay inside the loop', () => {
  const ids = new Set();
  for (const event of score.events) {
    assert.ok(!ids.has(event.id)); ids.add(event.id);
    assert.ok(event.start >= 0 && event.end <= DURATION && event.end > event.start);
    assert.ok(event.pitch === null || Number.isInteger(event.pitch));
    if (!event.continuationOf) {
      const onset = Math.round((event.start - (event.bar - 1) * 2.4) * 1e6);
      const logicalKey = `${event.track}-b${String(event.bar).padStart(2, '0')}-t${String(onset).padStart(7, '0')}-p${event.pitch ?? 'noise'}`;
      assert.ok(event.id === logicalKey || event.id.startsWith(`${logicalKey}-n`));
    }
  }
  for (const track of ['electric-bass', 'floating-chords', 'duck-call']) {
    assert.ok(score.events.some((event: { track: string; start: number }) => event.track === track && event.start < 1));
  }
  assert.ok(score.events.some((event: { continuationOf?: string }) => event.continuationOf));
});

test('WAV is exact 48 kHz stereo PCM16 and supports a second synthesis rate', () => {
  const wav = encodeWav(score);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 2);
  assert.equal(wav.readUInt32LE(24), 48000);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 1382400 * 4);
  assert.equal(wav.length, 44 + 1382400 * 4);
  const alternate = createScore({ sampleRate: 8000 });
  assert.equal(alternate.left.length, 230400);
  assert.equal(alternate.duration, DURATION);
  assert.throws(() => createScore({ sampleRate: 0 }), RangeError);
});
