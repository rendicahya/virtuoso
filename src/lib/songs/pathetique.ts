import data from './data/pathetique.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'pathetique-adagio',
    title: 'Pathétique Sonata (Adagio)',
    artist: 'Ludwig van Beethoven',
    year: '1798',
    tag: 'Classical',
    key: 'A♭ major',
    bpm: 38,
    beatsPerBar: 2,
    barOffset: 0,
    hue: 40,
    mood: 'Tender · Singing',
    blurb: 'One of the most beloved melodies Beethoven wrote: a warm, singing theme over a gently murmuring inner voice.',
    previewBeat: 0,
  },
  // Complete second movement, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
