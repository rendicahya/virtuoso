import data from './data/preludeInC.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'prelude-in-c',
    title: 'Prelude in C Major',
    artist: 'Johann Sebastian Bach',
    year: '1722',
    tag: 'Classical',
    key: 'C major',
    bpm: 66,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 205,
    mood: 'Serene · Flowing',
    blurb: 'The opening of the Well-Tempered Clavier: one unbroken stream of arpeggios that drifts through gorgeous harmonies.',
    previewBeat: 0,
  },
  // Complete piece (BWV 846), from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
