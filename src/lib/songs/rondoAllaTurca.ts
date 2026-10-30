import data from './data/rondoAllaTurca.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'rondo-alla-turca',
    title: 'Turkish March',
    artist: 'W. A. Mozart',
    year: '1783',
    tag: 'Classical',
    key: 'A minor → A major',
    bpm: 116,
    beatsPerBar: 2,
    barOffset: 1,
    hue: 4,
    mood: 'Fiery · Virtuosic',
    blurb: 'Rondo alla Turca, the finale of Sonata K. 331. Racing sixteenths and crashing Janissary chords. A true test.',
    previewBeat: 0,
  },
  // Complete movement, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
