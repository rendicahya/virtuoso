import { prog, seq } from '../notation.ts';
import { closeVoicing, spreadVoicing } from '../theory.ts';
import type { Ev } from '../types.ts';
import { defineSong } from './define.ts';

/** Driving pop accompaniment: pumping octave bass + syncopated chord stabs. */
function popBars(chords: [string, number][], start: number, stabs = [0, 0.75, 1.5, 2.5, 3.25]): Ev[] {
  const out: Ev[] = [];
  let pos = start;
  for (const [sym, beats] of chords) {
    const bass = spreadVoicing(sym, 33)[0];
    const triad = closeVoicing(sym, 57);
    for (let bar = 0; bar < beats; bar += 4) {
      const t0 = pos + bar;
      for (let i = 0; i < 8; i++) {
        out.push({ beat: t0 + i * 0.5, beats: 0.42, midi: i % 2 ? bass + 12 : bass, vel: i === 0 ? 0.5 : 0.38 });
      }
      for (const s of stabs) for (const m of triad) out.push({ beat: t0 + s, beats: 0.3, midi: m, vel: 0.28 });
    }
    pos += beats;
  }
  return out;
}

export default defineSong(
  {
    id: 'neon-skyline',
    title: 'Neon Skyline',
    artist: 'Virtuoso Original',
    year: '2020s style',
    tag: 'Original',
    key: 'A minor',
    bpm: 128,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 300,
    mood: 'Electric · Night Drive',
    blurb: 'Modern city-pop energy with racing sixteenth-note runs. The encore piece — bring your fastest hands.',
    previewBeat: 40,
  },
  () => {
    // Sixteenth-note units, 16 per bar.
    const A = [
      'E5:2 E5:2 r:2 C5:2 D5:2 E5:2 r:2 G5:2 |',
      'A5:3 G5:3 F5:2 E5:4 C5:4 |',
      'E5:2 E5:2 r:2 C5:2 D5:2 E5:2 r:2 G5:2 |',
      'G5:3 F5:3 D5:2 B4:4 D5:4 |',
      'E5:2 E5:2 r:2 C5:2 D5:2 E5:2 r:2 G5:2 |',
      'A5:3 G5:3 F5:2 C6:4 A5:4 |',
      'G5:3 E5:3 C5:2 E5:2 G5:2 C6:4 |',
      'B5:4 A5:2 G5:2 D5:4 r:4 |',
    ];
    const B = [
      'A4:1 C5 E5 A5 G5 E5 C5 E5 A5 C6 B5 A5 G5 E5 D5 E5 |',
      'F5:1 A5 C6 A5 G5 F5 E5 F5 A5:2 C6:2 F5:4 |',
      'E5:1 G5 C6 G5 E5 G5 C6 E6 D6:2 C6:2 G5:4 |',
      'D5:1 G5 B5 D6 B5 G5 D5 B4 D5:2 G5:2 B5:2 A5:2 |',
      'C6:2 B5:1 A5 E5:2 A5:1 B5 C6:2 B5:1 A5 E5:2 C5:2 |',
      'F5:2 E5:1 F5 A5:2 G5:1 F5 C6:4 A5:4 |',
      'G5:1 F5 E5 D5 C5 D5 E5 G5 C6:4 E6:4 |',
      'D6:3 B5:3 G5:2 D5:2 G5:2 B5:2 D6:2 |',
    ];
    // The reprise doubles the hook in harmony (two-note chords on Hard).
    const A2 = [
      'E5+C5:2 E5+C5:2 r:2 C5:2 D5:2 E5+C5:2 r:2 G5+E5:2 |',
      'A5+F5:3 G5+E5:3 F5+C5:2 E5+C5:4 C5+A4:4 |',
      'E5+C5:2 E5+C5:2 r:2 C5:2 D5:2 E5+C5:2 r:2 G5+E5:2 |',
      'G5+D5:3 F5+D5:3 D5+B4:2 B4+G4:4 D5+B4:4 |',
      'E5+C5:2 E5+C5:2 r:2 C5:2 D5:2 E5+C5:2 r:2 G5+E5:2 |',
      'A5+F5:3 G5+E5:3 F5+C5:2 C6+A5:4 A5+F5:4 |',
      'G5+E5:3 E5+C5:3 C5:2 E5:2 G5:2 C6+G5:4 |',
      'B5+G5:4 A5:2 G5:2 D5+B4:4 r:4 |',
    ];
    const melody = seq(['r:32 |', ...A, ...B, ...A2, ...B, 'A5+E5:12 r:20 |'].join(' '), {
      unit: 0.25,
      bar: 4,
      vel: 0.8,
    });

    const loop = 'Am:4 F C G Am F C G';
    const accomp = [
      ...popBars(prog('F:4 G'), 0, [0, 1.5, 3]),
      ...popBars(prog(`${loop} ${loop} ${loop} ${loop}`), 8),
      // Final chord.
      ...spreadVoicing('Am', 33).slice(0, 5).map((midi, i) => ({ beat: 136 + i * 0.125, beats: 4, midi, vel: 0.42 })),
    ];
    return { melody, accomp };
  },
);
