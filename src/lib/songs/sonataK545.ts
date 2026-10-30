import data from './data/sonataK545.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'sonata-k545',
    title: 'Sonata in C (K. 545)',
    artist: 'Wolfgang Amadeus Mozart',
    year: '1788',
    tag: 'Classical',
    key: 'C major',
    bpm: 120,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 52,
    mood: 'Bright · Elegant',
    blurb: 'The "Sonata facile", first movement: a sunny tune, sparkling scales and Alberti bass.',
    previewBeat: 0,
  },
  // Complete first movement, from the Mutopia Project edition (CC BY-SA 3.0).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
