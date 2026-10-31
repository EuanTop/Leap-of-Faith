import { mkdir, realpath, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { addCosmicArrangement, diffuseSpace } from './cosmic.mjs';

// Twelve 4/4 bars at 100 BPM. Every oscillator, note, and space tail is
// synthesized here; there are no samples or third-party sound libraries.
export const DURATION = 28.8;
export const VERSION = 'loop-habitat-cosmic-1.6';
export const EVENT_ID_SCHEMA = 'track-bar-onset-us-pitch-v2';
const BEAT = 0.6;
const BAR = BEAT * 4;
const TAU = Math.PI * 2;
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
const noteName = (midi) => `${['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
const roundTime = (value) => Math.round(value * 1e6) / 1e6;

function noiseGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 2147483648 - 1;
  };
}

function envelope(t, length, attack, decay) {
  const a = Math.min(1, t / attack);
  const release = Math.min(1, Math.max(0, (length - t) / Math.min(length * 0.25, 0.14)));
  return a * a * (3 - 2 * a) * Math.exp(-decay * t) * release * release;
}

export function createScore({ sampleRate = 48000 } = {}) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError('sampleRate must be an integer from 8000 through 192000');
  }
  const length = Math.round(DURATION * sampleRate);
  const dryL = new Float64Array(length);
  const dryR = new Float64Array(length);
  const sendL = new Float64Array(length);
  const sendR = new Float64Array(length);
  const spaceL = new Float64Array(length);
  const spaceR = new Float64Array(length);
  const events = [];
  const eventOccurrences = new Map();

  function add({ track, start, duration, pitch = null, velocity = 1, pan = 0, send = 0, space = 0, voice }) {
    start = ((start % DURATION) + DURATION) % DURATION;
    const bar = Math.floor((start + 1e-7) / BAR) + 1;
    const onset = Math.round((start - (bar - 1) * BAR) * 1e6);
    // Logical locations survive insertion/removal of unrelated score events.
    const key = `${track}-b${String(bar).padStart(2, '0')}-t${String(onset).padStart(7, '0')}-p${pitch ?? 'noise'}`;
    const occurrence = (eventOccurrences.get(key) ?? 0) + 1;
    eventOccurrences.set(key, occurrence);
    const id = occurrence === 1 ? key : `${key}-n${occurrence}`;
    const event = { id, track, start: roundTime(start), end: roundTime(Math.min(DURATION, start + duration)), pitch,
      note: pitch === null ? null : noteName(pitch), velocity, bar };
    events.push(event);
    if (start + duration > DURATION) {
      events.push({ ...event, id: `${id}-tail`, start: 0, end: roundTime(start + duration - DURATION), continuationOf: id, bar: 1 });
    }
    const first = Math.round(start * sampleRate);
    const count = Math.round(duration * sampleRate);
    for (let j = 0; j < count; j++) {
      const index = (first + j) % length;
      const value = voice(j / sampleRate, j) * velocity;
      const position = typeof pan === 'function' ? pan(index / sampleRate) : pan;
      const gainL = Math.cos((position + 1) * Math.PI / 4);
      const gainR = Math.sin((position + 1) * Math.PI / 4);
      dryL[index] += value * gainL;
      dryR[index] += value * gainR;
      sendL[index] += value * gainL * send;
      sendR[index] += value * gainR * send;
      spaceL[index] += value * gainL * space;
      spaceR[index] += value * gainR * space;
    }
  }

  function bass(start, pitch, duration, velocity) {
    const f = frequency(pitch);
    add({track:'electric-bass', start, pitch, duration, velocity, send:.08,
      voice:t => {
        const phase=TAU*f*t;
        const attack=Math.min(1,t/.085), release=Math.min(1,(duration-t)/.28);
        const shape=attack*attack*(3-2*attack)*release*release*Math.exp(-t*.55);
        return .24*(Math.sin(phase)+.12*Math.sin(phase*2+.10))*shape;
      }});
  }

  function chord(start, pitches, duration, velocity, side) {
    pitches.forEach((pitch,index) => {
      const f=frequency(pitch), pan=side*.12+(index-(pitches.length-1)/2)*.13;
      add({track:'floating-chords',start,pitch,duration,velocity,pan,send:.12,space:.30,
        voice:t => {
          const phase=TAU*f*t;
          const attack=Math.min(1,t/.30),release=Math.min(1,(duration-t)/.48);
          const shape=attack*attack*(3-2*attack)*release*release;
          const tone=.78*Math.sin(phase)+.14*Math.sin(phase*1.0014+.2)
            +.09*Math.sin(phase*2+.4);
          return .056*tone*shape;
        }});
    });
  }

  function duckCall(start, pitch, duration, velocity, pan, seed) {
    const f = frequency(pitch), random = noiseGenerator(seed);
    let breath = 0;
    const airRate = 1 - Math.exp(-TAU * 1500 / sampleRate);
    add({track:'duck-call', start, pitch, duration, velocity, pan, send:.16, space:.38,
      voice:t => {
        const u=t/duration;
        // A voiced, nasal source moves through a rounded wah vowel. Its short
        // pitch fall belongs to the character's call, not the sustained harmony.
        const phase=TAU*f*(.97*t+.09*.025*(1-Math.exp(-t/.025))-.025*t*t/duration);
        const vowel=Math.sin(Math.PI*u)**.7, formant1=610+330*vowel, formant2=1370+230*vowel;
        let tone=0, weightSum=0;
        for(let h=1;h<=12;h++) {
          const hz=f*h;
          const weight=(.18*Math.exp(-(((hz-f)/420)**2))
            +Math.exp(-(((hz-formant1)/240)**2))+.48*Math.exp(-(((hz-formant2)/350)**2)))/Math.sqrt(h);
          tone+=weight*Math.sin(phase*h+.10*Math.sin(h)); weightSum+=weight;
        }
        breath+=airRate*(random()-breath);
        const shape=envelope(t,duration,.009,2.0)*(1-.30*u);
        return (.18*tone/Math.max(1,weightSum)+.010*breath)*shape;
      }});
  }

  // Quartal extensions and close voice-leading keep the room warm and slightly uncanny.
  const harmony = [
    [51, 58, 61, 65, 68], // Eb9sus4; the bass motif supplies the minor third
    [51, 58, 61, 65, 68],
    [48, 54, 58, 63, 65], // Ab13, root supplied by bass
    [46, 49, 53, 56, 61], // Gbmaj9, root supplied by bass
    [51, 58, 61, 65, 68],
    [48, 54, 58, 63, 65],
    [46, 49, 53, 56, 61],
    [46, 48, 53, 56, 60], // chromatic inner voices lead toward the dominant
    [51, 56, 60, 65, 68], // Bb13sus
    [50, 56, 60, 65, 68], // suspended dominant resolves inward
    [51, 58, 61, 65, 68],
    [51, 56, 58, 65, 68],
  ];
  const roots = [39, 39, 32, 42, 39, 32, 42, 42, 34, 34, 39, 39];
  // The clock stays at 100 BPM for the existing harmony and character cues,
  // but the foreground now breathes in half-time: two soft bass gestures and
  // one sustained chord per bar, instead of a six-note funk figure and stabs.
  for(let bar=0;bar<12;bar++) {
    const start=bar*BAR, dynamics=bar>=8&&bar<=9?.76:bar>=10?.86:1;
    bass(start,roots[bar],1.38,.74*dynamics);
    bass(start+2.75*BEAT,roots[bar]+7,.70,.47*dynamics);
    chord(start+.10,harmony[bar],BAR-.14,.84*dynamics,bar%2?1:-1);
  }

  // Sparse character calls replace the drum kit. Pauses and unequal replies
  // leave the harmony room to breathe, instead of rebuilding a quacking backbeat.
  for (const [bar, beat, pitch, strength, side, count] of [
    [0,.75,63,.82,-.16,2], [2,.5,60,.72,.22,1], [4,1.75,63,.83,.10,3],
    [6,2.25,65,.67,-.28,2], [9,.75,60,.75,.18,1], [11,.5,63,.70,-.12,2],
  ]) {
    for(let n=0;n<count;n++) duckCall(bar*BAR+beat*BEAT+n*.245, pitch,
      n===0?.19:.125, strength*(n===0?1:n===1?.67:.45), n===0?side:-side*2, 9531+bar*13+n);
  }

  // The foreground and cosmic layers share the same slower harmonic breath.
  // Space has its own bus, leaving the foreground rhythm clear.
  addCosmicArrangement({ add, harmony, roots, duration: DURATION, beat: BEAT });
  const reverberation = diffuseSpace(spaceL, spaceR, sampleRate);

  // Circular ping-pong delay: sum the converged geometric response directly.
  // All input and tails wrap in the same sample buffer; no global fade hides the seam.
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const delay = Math.round(0.45 * sampleRate);
  for (let i = 0; i < length; i++) {
    let l = dryL[i] + reverberation.left[i], r = dryR[i] + reverberation.right[i];
    for (let tap = 1; tap <= 10; tap++) {
      const index = (i - tap * delay % length + length) % length;
      const gain = 0.48 * 0.34 ** (tap - 1);
      l += (tap % 2 ? sendR[index] : sendL[index]) * gain;
      r += (tap % 2 ? sendL[index] : sendR[index]) * gain;
    }
    left[i] = Math.tanh(l * 1.38) * 0.88;
    right[i] = Math.tanh(r * 1.38) * 0.88;
  }
  events.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  return { left, right, sampleRate, duration: DURATION, events, version: VERSION, eventIdSchema: EVENT_ID_SCHEMA };
}

export function inspectScore(score) {
  const { left, right, sampleRate } = score;
  let peak = 0, energy = 0, sideEnergy = 0, midEnergy = 0, crossEnergy = 0, energyL = 0, energyR = 0, maxStep = 0;
  for (let i = 0; i < left.length; i++) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    energy += left[i] ** 2 + right[i] ** 2;
    sideEnergy += (left[i] - right[i]) ** 2;
    midEnergy += (left[i] + right[i]) ** 2;
    crossEnergy += left[i] * right[i];
    energyL += left[i] ** 2; energyR += right[i] ** 2;
    const previous = (i + left.length - 1) % left.length;
    maxStep = Math.max(maxStep, Math.abs(left[i] - left[previous]), Math.abs(right[i] - right[previous]));
  }
  const windows = Array.from({ length: 12 }, (_, bar) => {
    let sum = 0;
    const a = Math.round(bar * BAR * sampleRate), b = Math.round((bar + 1) * BAR * sampleRate);
    for (let i = a; i < b; i++) sum += left[i] ** 2 + right[i] ** 2;
    return { bar: bar + 1, rms: Math.sqrt(sum / (2 * (b - a))) };
  });
  return { version: score.version, duration: score.duration, sampleRate, channels: 2, samplesPerChannel: left.length,
    peak, rms: Math.sqrt(energy / (left.length * 2)), sideToMidRms: Math.sqrt(sideEnergy / midEnergy),
    stereoCorrelation: crossEnergy / Math.sqrt(energyL * energyR),
    monoRetention: Math.sqrt(midEnergy / (2 * energy)),
    seamJump: Math.max(Math.abs(left[0] - left.at(-1)), Math.abs(right[0] - right.at(-1))),
    maxAdjacentStep: maxStep, bars: windows, listeningVerified: false };
}

export function encodeWav(score) {
  const { left, right, sampleRate } = score;
  const wav = Buffer.alloc(44 + left.length * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
  wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(left.length * 4, 40);
  for (let i = 0; i < left.length; i++) {
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return wav;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  // realpath fails when the external artifacts volume is absent, preserving its link.
  const artifacts = await realpath(path.join(projectRoot, 'artifacts'));
  const output = path.join(artifacts, 'audio');
  await mkdir(output, { recursive: true });
  const score = createScore();
  const validation = inspectScore(score);
  const { left, right, ...metadata } = score;
  const scoreMetadata = { ...metadata, bpm: 100, meter: '4/4', bars: 12,
    mode: 'Eb Dorian; root-following cosmic layers and common-tone sustains; closing minor-organ and diminished dominant colours',
    arrangement: { groove: 'half-time foreground: two rounded bass gestures and one sustained chord per bar; no drum kit; sparse duck calls',
      space: 'root-following centred sub; counter-orbiting harmonic clouds, common-tone spectral halo, octave-weight descent without chromatic glides, travelling diffuse return',
      ending: 'organ enters at 19.2s; minor colour at 24s; diminished dominant returns to Eb at the loop' },
    samplesPerChannel: left.length };
  const files = [['score.wav', encodeWav(score)], ['validation.json', JSON.stringify(validation, null, 2)],
    ['score.json', JSON.stringify(scoreMetadata, null, 2)]];
  // Publish complete files, with the version metadata last. An already-playing
  // stream can finish reading its old inode while the next request gets the new WAV.
  try {
    for (const [name, content] of files) await writeFile(path.join(output, `.${name}.${process.pid}.tmp`), content);
    for (const [name] of files) await rename(path.join(output, `.${name}.${process.pid}.tmp`), path.join(output, name));
  } finally {
    for (const [name] of files) await rm(path.join(output, `.${name}.${process.pid}.tmp`), { force: true });
  }
  console.log(JSON.stringify({ output, ...validation }, null, 2));
}
