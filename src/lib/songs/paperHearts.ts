import { arpeggiate, prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';
import { finalChord } from './grooves.ts';

export default defineSong(
  {
    id: 'paper-hearts',
    title: 'Paper Hearts',
    artist: 'Virtuoso Original',
    year: '2010s style',
    tag: 'Original',
    key: 'G major',
    bpm: 80,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 14,
    mood: 'Warm · Acoustic Pop',
    blurb: 'A singalong acoustic-pop love song on the four chords every radio hit is made of.',
    previewBeat: 40,
  },
  () => {
    // Eighth-note units, 8 per bar.
    const verse = [
      'r:2 B4:1 B4:1 B4:2 A4:1 G4:1 |', // G
      'A4:2 F#4:2 D4:4 |', // D
      'r:2 G4:1 A4:1 B4:2 D5:2 |', // Em
      'C5:3 B4:1 A4:4 |', // C
      'r:2 B4:1 B4:1 D5:2 B4:1 G4:1 |', // G
      'A4:2 D5:2 F#5:4 |', // D
      'E5:3 D5:1 B4:2 G4:2 |', // Em
      'A4:4 r:2 D5:1 E5:1 |', // C
    ];
    const chorusHead = [
      'D5:2 G5:3 F#5:1 G5:2 |', // G
      'A5:3 F#5:1 D5:4 |', // D
      'r:2 E5:1 F#5:1 G5:2 B5:2 |', // Em
      'A5:3 G5:1 E5:2 D5:1 E5:1 |', // C
      'D5:2 G5:3 F#5:1 G5:2 |', // G
      'A5:2 B5:2 A5:2 F#5:2 |', // D
      'G5:3 F#5:1 E5:2 D5:2 |', // Em
    ];
    const chorus = [...chorusHead, 'E5:4 F#5:4 |']; // C D
    const finale = [...chorusHead, 'E5:2 D5:2 F#5:4 |', 'G5:16 |'];
    const melody = seq(['r:16 |', ...verse, ...chorus, ...verse, ...chorus, ...finale].join(' '), {
      unit: 0.5,
      bar: 4,
      vel: 0.8,
    });

    const loop = 'G:4 D:4 Em:4 C:4';
    const verseProg = prog(`${loop} ${loop}`);
    const chorusProg = prog(`${loop} G:4 D:4 Em:4 C:2 D:2`);
    // Fingerpicked guitar-style patterns: gentle in the verse, fuller in the chorus.
    const pick = [[-1, 0], 2, 1, 3, 2, 4, 3, 2];
    const strum = [[-1, 0], 2, [1, 3], 2, 4, [2, 3], [1, 3], 2];
    const accomp = [
      ...arpeggiate(prog('G:4 C:4'), { start: 0, step: 0.5, pattern: pick, vel: 0.26, dur: 0.9 }),
      ...arpeggiate(verseProg, { start: 8, step: 0.5, pattern: pick, vel: 0.26, dur: 0.9 }),
      ...arpeggiate(chorusProg, { start: 40, step: 0.5, pattern: strum, vel: 0.3, dur: 0.9 }),
      ...arpeggiate(verseProg, { start: 72, step: 0.5, pattern: pick, vel: 0.28, dur: 0.9 }),
      ...arpeggiate(chorusProg, { start: 104, step: 0.5, pattern: strum, vel: 0.32, dur: 0.9 }),
      ...arpeggiate(chorusProg, { start: 136, step: 0.5, pattern: strum, vel: 0.34, dur: 0.9 }),
      ...finalChord('G', 168),
    ];
    return { melody, accomp };
  },
);
