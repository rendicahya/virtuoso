import { seq } from '../notation.ts';
import { defineSong } from './define.ts';

export default defineSong(
  {
    id: 'fur-elise',
    title: 'Für Elise',
    artist: 'Ludwig van Beethoven',
    year: '1810',
    tag: 'Classical',
    key: 'A minor',
    bpm: 72,
    beatsPerBar: 1.5,
    barOffset: 0.5,
    hue: 268,
    mood: 'Delicate · Longing',
    blurb: 'A love letter in 3/8. The famous E–D♯ sigh asks for nimble fingers and a light touch.',
    previewBeat: 0,
  },
  () => {
    // Right hand, sixteenth-note units (6 per 3/8 bar).
    const a = 'E5:1 D#5 E5 B4 D5 C5 | A4:2 r:1 C4:1 E4 A4 | B4:2 r:1 E4:1 G#4 B4 | C5:2 r:1 E4:1 E5 D#5 |';
    const a2 = 'E5:1 D#5 E5 B4 D5 C5 | A4:2 r:1 C4:1 E4 A4 | B4:2 r:1 E4:1 C5 B4 |';
    const b =
      'E5:3 G4:1 F5 E5 | D5:3 F4:1 E5 D5 | C5:3 E4:1 D5 C5 | B4:2 r:1 E4:1 E5 r:1 | r:1 E5:1 E6 r:1 r:1 D#5:1 | E5:1 r:2 D#5:1 E5 D#5 |';
    const rh = [
      'E5:1 D#5 |',
      a, a2, 'A4:2 r:2 E5:1 D#5 |', // first ending
      a, a2, 'A4:2 r:1 B4:1 C5 D5 |', // second ending
      b,
      a, a2, 'A4:6 |',
    ].join(' ');

    // Left hand arpeggios, sustained like the pedal.
    const la = 'r:6 | A2:1 E3 A3 r:3 | E2:1 E3 G#3 r:3 | A2:1 E3 A3 r:3 | r:6 | A2:1 E3 A3 r:3 | E2:1 E3 G#3 r:3 |';
    const lb = 'C3:1 G3 C4 r:3 | G2:1 G3 B3 r:3 | A2:1 E3 A3 r:3 | E2:1 E3 G#3 r:3 | r:6 | r:6 |';
    const lh = [
      la, 'A2:1 E3 A3 r:3 |',
      la, 'A2:1 E3 A3 r:3 |',
      lb,
      la, 'A2:1 E3 A3:4 |',
    ].join(' ');

    return {
      melody: seq(rh, { unit: 0.25, bar: 1.5, downbeat: 0.5, vel: 0.78 }),
      accomp: seq(lh, { unit: 0.25, start: 0.5, bar: 1.5, hold: 4, vel: 0.4 }),
    };
  },
);
