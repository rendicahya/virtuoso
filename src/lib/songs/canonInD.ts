import { arpeggiate, prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';

export default defineSong(
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    artist: 'Johann Pachelbel',
    year: 'c. 1680',
    tag: 'Classical',
    key: 'D major',
    bpm: 66,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 335,
    mood: 'Tender · Wedding',
    blurb: 'The eternal wedding processional. One ground bass, ever-blooming variations above it.',
    previewBeat: 24,
  },
  () => {
    const cycle = 'D:1 A Bm F#m G D G A';
    const melody = [
      seq('F#5:1 E5 D5 C#5 B4 A4 B4 C#5', { start: 8, unit: 1 }),
      seq('D5:1 C#5 B4 A4 G4 F#4 G4 E4', { start: 16, unit: 1 }),
      seq('D5:1 F#5 A5 G5 F#5 D5 F#5 E5 D5 B4 D5 A5 G5 B5 A5 G5', { start: 24, unit: 0.5 }),
      seq(
        'D5:1 C#5 D5 D4 C#4 A3 E4 F#4 D4 D5 C#5 B4 C#5 F#5 A5 B5 ' +
          'G5 F#5 E5 G5 F#5 E5 D5 C#5 B4 A4 G4 F#4 E4 G4 F#4 E4',
        { start: 32, unit: 0.25 },
      ),
      seq('F#5+D5:1 E5+C#5 D5+B4 C#5+A4 B4+G4 A4+F#4 B4+G4 C#5+A4', { start: 40, unit: 1 }),
      seq('D6+F#5:1 C#6+E5 B5+D5 A5+C#5 G5+B4 F#5+A4 G5+B4 E5+C#5', { start: 48, unit: 1 }),
      seq('A5+F#5+D5:4', { start: 56, unit: 1 }),
    ].flat();

    const accomp = [
      // Intro and first variations: calm bass + octave.
      ...arpeggiate(prog(`${cycle} ${cycle} ${cycle}`), { start: 0, step: 0.5, pattern: [0, 2], vel: 0.36, pedal: true }),
      // Flowing sixteenth-note arpeggios underneath the faster variations.
      ...arpeggiate(prog(`${cycle} ${cycle} ${cycle} ${cycle}`), {
        start: 24,
        step: 0.25,
        pattern: [0, 1, 2, 3],
        vel: 0.3,
        pedal: true,
      }),
      ...arpeggiate(prog('D:4'), { start: 56, step: 0.25, pattern: [0, 1, 2, 3, 4], count: 5, vel: 0.34, pedal: true }),
    ];
    return { melody, accomp };
  },
);
