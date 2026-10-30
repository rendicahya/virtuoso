import { arpeggiate, prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';

export default defineSong(
  {
    id: 'moonlight-promise',
    title: 'Moonlight Promise',
    artist: 'Virtuoso Original',
    year: '1990s style',
    tag: 'Original',
    key: 'C major',
    bpm: 72,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 330,
    mood: 'Tender · Slow Dance',
    blurb: 'A soft 90s slow-dance love song: warm major-seventh chords and a melody made for a first dance.',
    previewBeat: 40,
  },
  () => {
    // Eighth-note units, 8 per bar.
    const intro = 'r:16 |';
    const verse = [
      'r:2 E5:1 G5:1 G5:2 E5:2 |', // Cmaj7
      'D5:2 C5:2 E5:4 |', // Am7
      'r:2 F5:1 E5:1 D5:2 C5:2 |', // Fmaj7
      'D5:6 r:2 |', // G
      'r:2 E5:1 G5:1 B5:2 A5:2 |', // Cmaj7
      'G5:3 E5:1 C5:4 |', // Am7
      'D5:2 F5:2 E5:2 D5:2 |', // Dm7
      'C5:4 B4:2 r:2 |', // Gsus4 G
    ];
    const chorus = [
      'A5:3 G5:1 F5:2 E5:2 |', // F
      'D5:2 G5:4 F5:1 E5:1 |', // G
      'E5:3 D5:1 E5:2 G5:2 |', // Em7
      'A5:6 G5:1 A5:1 |', // Am7
      'C6:3 A5:1 F5:2 D5:2 |', // Dm7
      'D5:2 B5:3 A5:1 G5:2 |', // G
    ];
    const chorusEnd = ['G5:3 E5:1 C5:4 |', 'r:8 |'];
    const finale = ['G5:3 E5:1 D5:2 C5:2 |', 'C5:16 |'];
    const melody = seq(
      [intro, ...verse, ...chorus, ...chorusEnd, ...verse, ...chorus, ...finale].join(' '),
      { unit: 0.5, bar: 4, vel: 0.8 },
    );

    const verseProg = 'Cmaj7:4 Am7:4 Fmaj7:4 G:4 Cmaj7:4 Am7:4 Dm7:4 Gsus4:2 G:2';
    const chorusProg = 'F:4 G:4 Em7:4 Am7:4 Dm7:4 G:4 C:4';
    const soft = [0, 1, 2, 3, 4, 3, 2, 1];
    const full = [[-1, 0], 1, 2, 3, 4, 3, 2, 1];
    const accomp = [
      ...arpeggiate(prog(`Cmaj7:4 Am7:4 ${verseProg}`), { start: 0, step: 0.5, pattern: soft, vel: 0.28, pedal: true }),
      ...arpeggiate(prog(`${chorusProg} C:4`), { start: 40, step: 0.5, pattern: full, vel: 0.32, pedal: true }),
      ...arpeggiate(prog(verseProg), { start: 72, step: 0.5, pattern: soft, vel: 0.3, pedal: true }),
      ...arpeggiate(prog(chorusProg), { start: 104, step: 0.5, pattern: full, vel: 0.34, pedal: true }),
      ...arpeggiate(prog('Cmaj7:8'), { start: 132, step: 0.25, pattern: [-1, 0, 1, 2, 3, 4, 5], count: 7, vel: 0.32, pedal: true }),
    ];
    return { melody, accomp };
  },
);
