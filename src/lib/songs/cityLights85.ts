import { prog, seq } from '../notation.ts';
import { defineSong } from './define.ts';
import { finalChord, groove } from './grooves.ts';

export default defineSong(
  {
    id: 'city-lights-85',
    title: "City Lights '85",
    artist: 'Virtuoso Original',
    year: '1980s style',
    tag: 'Original',
    key: 'F major',
    bpm: 108,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 196,
    mood: 'Smooth · City Pop',
    blurb: 'Neon-lit 80s city pop: jazzy seventh chords, a funky bass line and a hook made for a convertible.',
    previewBeat: 40,
  },
  () => {
    // Sixteenth-note units, 16 per bar.
    const verse = [
      'r:2 A4:2 C5:2 E5:4 D5:2 C5:2 A4:2 |', // Fmaj7
      'G4:2 A4:2 r:2 E5:6 C#5:4 |', // Em7 A7
      'D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 D5:2 |', // Dm7
      'Eb5:4 D5:2 C5:2 A4:4 r:4 |', // Cm7 F7
      'r:2 D5:2 F5:2 A5:6 G5:2 F5:2 |', // Bbmaj7
      'E5:4 G5:4 C5:8 |', // C/Bb
      'C5:2 E5:2 G5:4 F5:2 E5:2 D5:4 |', // Am7 Dm7
      'Bb4:4 D5:2 F5:2 E5:4 r:4 |', // Gm7 C7
    ];
    const chorusHead = [
      'F5:2 F5:2 r:2 D5:2 F5:2 A5:4 G5:2 |', // Bbmaj7
      'G5:4 E5:4 r:4 C5:2 D5:2 |', // C
      'E5:2 E5:2 r:2 C5:2 E5:2 G5:4 E5:2 |', // Am7
      'F5:6 E5:2 D5:4 A4:4 |', // Dm7
      'Bb4:2 D5:2 F5:2 Bb5:6 A5:2 G5:2 |', // Gm7
      'A5:4 G5:2 E5:2 C5:4 E5:4 |', // Am7
      'D5:4 F5:4 G5:4 Bb5:4 |', // Bbmaj7 C
    ];
    const chorus = [...chorusHead, 'A5:12 r:4 |']; // F
    const finale = [...chorusHead, 'A5+F5:16 |'];
    const melody = seq(['r:32 |', ...verse, ...chorus, ...verse, ...chorus, ...finale].join(' '), {
      unit: 0.25,
      bar: 4,
      vel: 0.8,
    });

    const verseProg = 'Fmaj7:4 Em7:2 A7:2 Dm7:4 Cm7:2 F7:2 Bbmaj7:4 C/Bb:4 Am7:2 Dm7:2 Gm7:2 C7:2';
    const chorusProg = 'Bbmaj7:4 C:4 Am7:4 Dm7:4 Gm7:4 Am7:4 Bbmaj7:2 C:2 F:4';
    // Funky octave bass and off-beat electric-piano stabs.
    const funk = {
      bass: [[0, 0], [0.75, 1], [1.5, 0], [2, 0], [2.75, 1], [3.5, 0]] as [number, number][],
      stabs: [0.5, 1.5, 2.5, 3.5],
      stabLen: 0.35,
      stabLow: 60,
    };
    const accomp = [
      ...groove(prog('Fmaj7:4 C7:4'), 0, funk),
      ...groove(prog(`${verseProg} ${chorusProg} ${verseProg} ${chorusProg}`), 8, funk),
      ...groove(prog(chorusProg.replace(/F:4$/, 'Fmaj7:4')), 136, { ...funk, bassVel: 0.44, stabVel: 0.31 }),
      ...finalChord('Fmaj7', 168),
    ];
    return { melody, accomp };
  },
);
