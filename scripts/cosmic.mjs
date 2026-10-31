// Original additive/FM voices. Slow, harmonic movement leaves room for the
// existing syncopated groove; only the upper space layers orbit in stereo.
const TAU = Math.PI * 2;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
const swell = (t, length, attack, release) => smooth(t / attack) * smooth((length - t) / release);

// Different depths orbit at different speeds; all paths close with the film.
export const orbitalPan = (t, duration, offset = 0, turns = 2) =>
  .90 * Math.sin(TAU * (turns * t / duration + offset));

// Sustain shared tones; release other notes before a harmony changes. This
// governs direct voices, while their filtered, quieter room tails may linger.
export function harmonicHold(pitch, b, offset, wanted, harmony, roots, bar) {
  const pc = pitch % 12;
  for (let step = 1; step <= Math.ceil(wanted / bar) + 1; step++) {
    const boundary = step * bar - offset, next = (b + step) % roots.length;
    if (boundary >= wanted) break;
    if (![roots[next], ...harmony[next]].some(note => note % 12 === pc)) return boundary;
  }
  return wanted;
}

export function addCosmicArrangement({ add, harmony, roots, duration, beat }) {
  const bar = beat * 4;
  const orbit = (t, offset = 0, turns = 2) => orbitalPan(t, duration, offset, turns);

  // Root-following sub stays below the rhythmic bass. Short soft overlaps
  // connect the bar lines without holding a pedal under unrelated chords.
  roots.forEach((root, b) => {
    const pitch = root - 12, f = frequency(pitch), length = bar + .10;
    add({ track: 'gravity-sub', start: b * bar, duration: length, pitch,
      voice: t => {
        const phase = TAU * f * t;
        const pocket = .78 - .22 * Math.cos(TAU * t / beat);
        return .025 * pocket * (Math.sin(phase) + .12 * Math.sin(phase * 2)) * swell(t, length, .16, .24);
      } });
  });

  for (let b = 0; b < 12; b++) {
    const start = b * bar;
    // These slow voices share pitches with the muted chords. Their staggered
    // bloom changes perceived scale without inserting a competing melody.
    const pitches = [roots[b] + 12, harmony[b][1], harmony[b][3]];
    pitches.forEach((pitch, part) => {
      const length = harmonicHold(pitch, b, part * .045, bar + 2.4, harmony, roots, bar);
      const f = frequency(pitch);
      add({ track: 'orbital-cloud', start: start + part * 0.045, duration: length, pitch,
        pan: t => orbit(t, part / 3, part === 1 ? -2 : 2), space: 1.12,
        velocity: b >= 9 ? 0.76 : 1,
        voice: t => {
          const phase = TAU * f * t;
          const bloom = 0.32 + 0.68 * Math.sin(Math.PI * t / length) ** 2;
          const body = Math.sin(phase + 0.43 * Math.sin(phase * 2 + part))
            + 0.22 * Math.sin(phase * 1.0017 + 0.5)
            + 0.14 * bloom * Math.sin(phase * 3);
          const pocket = 0.88 - 0.12 * Math.cos(TAU * (start + t) / beat);
          return 0.046 * body * swell(t, length, .72, Math.min(1.35, length * .40)) * pocket;
        } });
    });
  }

  // A broad, continuously breathing spectral halo, rather than more lead notes.
  // Octaves and fifths grow out of each harmony, opening slowly like light
  // through the glass. Adjacent voices travel in opposite stereo directions.
  for (let b = 0; b < 12; b++) {
    const start = b * bar;
    [harmony[b][0] + 12, harmony[b][2] + 12].forEach((pitch, part) => {
      const f = frequency(pitch), length = harmonicHold(pitch, b, part * .12, bar * 2, harmony, roots, bar);
      add({ track: 'stellar-halo', start: start + part * .12, duration: length, pitch,
        pan: t => orbit(t, .18 + part * .5, part ? -1 : 1), space: 1.55,
        velocity: b >= 9 ? .70 : 1,
        voice: t => {
          const age = t / length, phase = TAU * f * t;
          const opening = Math.sin(Math.PI * age) ** 2;
          const drift = .35 * Math.sin(TAU * .13 * t + b * .4 + part);
          const spectrum = .60 * Math.sin(phase + drift)
            + .27 * opening * Math.sin(phase * 2.001 + .7)
            + .14 * opening * Math.sin(phase * 3.002 + drift)
            + .075 * opening * opening * Math.sin(phase * 4.003 + 1.4);
          return .040 * spectrum * swell(t, length, .90, Math.min(1.55, length * .42));
        } });
    });
  }

  // Descent is a change in spectral weight, never a chromatic pitch slide.
  // Every band is an octave of the current bass root. The low fundamental
  // belongs to the centred sub; this orbiting voice begins an octave above it.
  roots.forEach((pitch, b) => {
    const length = bar + .10, start = b * bar, f = frequency(pitch);
    add({ track: 'event-horizon', start, duration: length, pitch,
      pan: t => orbit(t, 0.25, -1), space: 1.1, velocity: b >= 8 ? .72 : 1,
      voice: t => {
        const age = t / length, closing = .5 + .5 * Math.cos(Math.PI * age), phase = TAU * f * t;
        const tone = .65 * Math.sin(phase) + .36 * closing * Math.sin(phase * 2 + .6)
          + .20 * closing * closing * Math.sin(phase * 4 + 1.2);
        const pocket = .85 - .15 * Math.cos(TAU * t / beat);
        return .037 * tone * pocket * swell(t, length, .42, .48);
      } });
  });

  // A few rounded, reverse-blooming resonances supply distant points of light.
  // Lower register and slow attacks deliberately avoid bright bell tapping.
  for (const [b, offset, pitch, strength] of [
    [0, 1.75, 65, .65], [2, 2.75, 63, .70], [4, .75, 68, .63],
    [6, 1.75, 65, .72], [8, .75, 60, .50],
  ]) {
    const length = harmonicHold(pitch, b, offset * beat, 2.65, harmony, roots, bar), f = frequency(pitch);
    add({ track: 'distant-resonance', start: b * bar + offset * beat, duration: length, pitch,
      velocity: strength, pan: t => orbit(t, 0.5, -3), send: .22, space: 1.45,
      voice: t => {
        const phase = TAU * f * t;
        const index = 0.65 * Math.sin(Math.PI * t / length) ** 2;
        return .037 * Math.sin(phase + index * Math.sin(phase * 1.5)) * swell(t, length, .75, 1.65);
      } });
  }

  // The last four bars change character within the same groove. Suspensions
  // darken into a minor organ, then a rootless Bb7b9 leads back to Eb.
  const shadows = [
    [8 * bar, 3.2, [53, 58, 60], .40],
    [9 * bar, 3.1, [50, 56, 60], .60],
    [10 * bar, 3.3, [51, 54, 58], .95],
    [11 * bar + .6, 2.1, [50, 56, 59], .73],
  ];
  shadows.forEach(([start, length, pitches, strength], chord) => pitches.forEach((pitch, part) => {
    const f = frequency(pitch);
    add({ track: 'shadow-organ', start: start + part * .018, duration: length, pitch,
      velocity: strength, pan: (part - 1) * .25, space: .95,
      voice: t => {
        const phase = TAU * f * t + .014 * (1 - Math.exp(-t * 3)) * Math.sin(TAU * 4.3 * t + part);
        const air = .94 + .06 * Math.sin(TAU * .8 * t + chord);
        const pipe = .76 * Math.sin(phase) + .18 * Math.sin(phase * 2)
          + .13 * Math.sin(phase * 3) + .045 * Math.sin(phase * 4) + .025 * Math.sin(phase * 6);
        return .072 * pipe * air * swell(t, length, .34, .95);
      } });
  }));
}

// Separate dark-space return, with an exact circular FIR tail. The final taps
// fall below -80 dB; unlike a newly initialised feedback delay, this already
// contains the previous loop's tail. Bass and drums never enter this bus.
export function diffuseSpace(inputL, inputR, sampleRate) {
  const length = inputL.length;
  const filteredL = new Float64Array(length), filteredR = new Float64Array(length);
  const lowCoefficient = 1 - Math.exp(-TAU * 2600 / sampleRate);
  const subCoefficient = 1 - Math.exp(-TAU * 170 / sampleRate);
  let lowL = 0, lowR = 0, subL = 0, subR = 0;
  // One whole pre-roll is vastly longer than either filter's settling time.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < length; i++) {
    lowL += lowCoefficient * (inputL[i] - lowL); lowR += lowCoefficient * (inputR[i] - lowR);
    subL += subCoefficient * (lowL - subL); subR += subCoefficient * (lowR - subR);
    if (pass) { filteredL[i] = lowL - subL; filteredR[i] = lowR - subR; }
  }
  const left = new Float64Array(length), right = new Float64Array(length);
  // Deterministic non-uniform reflections avoid another obvious beat echo.
  for (let tap = 0; tap < 128; tap++) {
    const seconds = .113 + tap * .0837 + .027 * Math.sin(tap * 2.39996);
    const delayL = Math.round(seconds * sampleRate) % length;
    const delayR = Math.round((seconds + .013 + .006 * Math.sin(tap * 1.37)) * sampleRate) % length;
    const gain = .067 * Math.exp(-seconds * .66);
    for (let i = 0; i < length; i++) {
      const a = (i - delayL + length) % length, b = (i - delayR + length) % length;
      left[i] += gain * ((tap % 2 ? filteredR[a] : filteredL[a]) * .78 + filteredR[b] * .22);
      right[i] += gain * ((tap % 2 ? filteredL[b] : filteredR[b]) * .78 + filteredL[a] * .22);
    }
  }
  // A slow travelling return makes depth audible even on sustained tones.
  // Positive gains preserve mono; no polarity tricks or sub-bass widening.
  for (let i = 0; i < length; i++) {
    const pan = .28 * Math.sin(TAU * 2 * i / length + .7);
    left[i] *= Math.sqrt(1 - pan);
    right[i] *= Math.sqrt(1 + pan);
  }
  return { left, right };
}
