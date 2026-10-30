import { arpeggiate, prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';

export default defineSong(
  {
    id: 'until-the-last-rain',
    title: 'Until the Last Rain',
    artist: 'Virtuoso Original',
    year: '1990s style',
    tag: 'Original',
    key: 'D → E major',
    bpm: 68,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 212,
    mood: 'Heartfelt · Power Ballad',
    blurb: 'A late-night 90s piano ballad, complete with the classic key change in the final chorus.',
    previewBeat: 72,
  },
  () => {
    // Eighth-note units, 8 per bar.
    const intro = 'r:16 |';
    const verse = [
      'r:2 A4:1 D5:1 E5:2 F#5:2 |', // D
      'E5:3 D5:1 C#5:2 A4:2 |', // A/C#
      'B4:2 D5:1 C#5:1 B4:2 F#4:2 |', // Bm
      'A4:6 r:2 |', // F#m
      'r:2 G4:1 A4:1 B4:2 D5:2 |', // G
      'F#5:3 E5:1 D5:2 A4:2 |', // D/F#
      'G4:2 B4:2 E5:2 D5:1 E5:1 |', // Em
      'E5:4 C#5:2 D5:1 E5:1 |', // Asus4 A
    ];
    const chorusD = [
      'D5:2 G5:3 F#5:1 G5:2 |', // G
      'A5:4 E5:2 C#5:2 |', // A
      'C#5:3 D5:1 C#5:2 A4:2 |', // F#m
      'D5:2 F#5:4 E5:1 D5:1 |', // Bm
      'E5:2 G5:3 F#5:1 E5:2 |', // Em
      'E5:2 A5:3 G5:1 F#5:1 E5:1 |', // A
      'F#5:3 E5:1 D5:4 |', // D
      'r:4 B4:1 C#5:1 D#5:2 |', // B (pivot to E major)
    ];
    const chorusE = [
      'E5:2 A5:3 G#5:1 A5:2 |', // A
      'B5:4 F#5:2 D#5:2 |', // B
      'D#5:3 E5:1 D#5:2 B4:2 |', // G#m
      'E5:2 G#5:4 F#5:1 E5:1 |', // C#m
      'F#5:2 A5:3 G#5:1 F#5:2 |', // F#m
      'F#5:2 B5:3 A5:1 G#5:1 F#5:1 |', // B
      'G#5:3 F#5:1 E5:4 |', // E
      'r:6 B4:1 C#5:1 |', // E
    ];
    const outro = ['E5:2 A5:6 |', 'F#5:3 G#5:1 A5:2 F#5:2 |', 'G#5:3 F#5:1 E5:12 |'];
    const melody = seq([intro, ...verse, ...chorusD, ...chorusE, ...outro].join(' '), { unit: 0.5, bar: 4, vel: 0.8 });

    const ballad = [0, 1, 2, 3, 4, 3, 2, 1];
    const full = [[-1, 0], 1, 2, 3, 4, 3, 2, 1];
    const accomp = [
      ...arpeggiate(prog('G:4 Asus4:2 A:2 D:4 A/C#:4 Bm:4 F#m:4 G:4 D/F#:4 Em:4 Asus4:2 A:2'), {
        start: 0,
        step: 0.5,
        pattern: ballad,
        vel: 0.3,
        pedal: true,
      }),
      ...arpeggiate(prog('G:4 A F#m Bm Em A D B A B G#m C#m F#m B E E A B'), {
        start: 40,
        step: 0.5,
        pattern: full,
        vel: 0.34,
        pedal: true,
      }),
      ...arpeggiate(prog('E:8'), { start: 112, step: 0.25, pattern: [-1, 0, 1, 2, 3, 4, 5], count: 7, vel: 0.34, pedal: true }),
    ];
    return { melody, accomp };
  },
);
