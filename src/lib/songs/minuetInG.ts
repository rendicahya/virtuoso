import data from './data/minuetInG.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    artist: 'Christian Petzold (attr. Bach)',
    year: '1725',
    tag: 'Classical',
    key: 'G major',
    bpm: 112,
    beatsPerBar: 3,
    barOffset: 0,
    hue: 96,
    mood: 'Graceful · Courtly',
    blurb: 'The little minuet from the Anna Magdalena Bach notebook that every piano student knows. Played with its repeats.',
    previewBeat: 0,
  },
  // Complete piece with repeats, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
