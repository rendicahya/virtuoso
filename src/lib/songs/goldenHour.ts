import { prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';
import { finalChord, groove } from './grooves.ts';

export default defineSong(
  {
    id: 'golden-hour',
    title: 'Golden Hour',
    artist: 'Virtuoso Original',
    year: '2020s style',
    tag: 'Original',
    key: 'D major',
    bpm: 100,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 172,
    mood: 'Sunny · Tropical Pop',
    blurb: 'Breezy tropical-house pop with a plucky, syncopated drop. Sunset on a beach, phone in the air.',
    previewBeat: 40,
  },
  () => {
    // Sixteenth-note units, 16 per bar.
    const verse = [
      'r:4 F#5:2 F#5:2 F#5:2 E5:2 D5:4 |', // Bm
      'B4:4 r:2 D5:2 E5:4 D5:4 |', // G
      'r:4 F#5:2 F#5:2 A5:2 F#5:2 E5:4 |', // D
      'E5:6 C#5:2 A4:8 |', // A
      'r:4 F#5:2 F#5:2 F#5:2 E5:2 D5:4 |', // Bm
      'B4:4 r:2 D5:2 G5:4 F#5:4 |', // G
      'F#5:4 E5:2 D5:2 A4:4 D5:4 |', // D
      'E5:12 r:4 |', // A
    ];
    const drop = [
      'B5:3 A5:3 F#5:2 B5:3 A5:3 F#5:2 |', // Bm
      'D6:3 B5:3 G5:2 B5:4 A5:4 |', // G
      'A5:3 F#5:3 D5:2 A5:3 F#5:3 D5:2 |', // D
      'E5:3 F#5:3 A5:2 C#6:4 E6:4 |', // A
      'B5:3 A5:3 F#5:2 B5:3 A5:3 F#5:2 |', // Bm
      'D6:3 B5:3 G5:2 D6:4 E6:4 |', // G
      'F#6:3 E6:3 D6:2 A5:4 F#5:4 |', // D
      'E5:2 F#5:2 G5:2 A5:2 C#6:4 E6:4 |', // A
    ];
    const melody = seq(['r:32 |', ...verse, ...drop, ...verse, ...drop, ...drop, 'D6:16 |'].join(' '), {
      unit: 0.25,
      bar: 4,
      vel: 0.8,
    });

    const loop = 'Bm:4 G:4 D:4 A:4';
    const song = prog(`${loop} ${loop}`);
    // Verses: soft off-beat plucks. Drops: driving bass plus syncopated plucks.
    const soft = { bass: [[0, 0], [2.5, 0]] as [number, number][], stabs: [0.5, 1.5, 2.5, 3.5], stabVel: 0.22, bassLen: 1.2 };
    const tropical = {
      bass: [[0, 0], [0.75, 1], [1.5, 0], [2.5, 0], [3, 1]] as [number, number][],
      stabs: [0.5, 1.25, 2, 2.75, 3.5],
      stabVel: 0.3,
      stabLow: 62,
    };
    const accomp = [
      ...groove(prog('Bm:4 A:4'), 0, soft),
      ...groove(song, 8, soft),
      ...groove(song, 40, tropical),
      ...groove(song, 72, soft),
      ...groove(song, 104, tropical),
      ...groove(song, 136, { ...tropical, bassVel: 0.45, stabVel: 0.33 }),
      ...finalChord('D', 168),
    ];
    return { melody, accomp };
  },
);
