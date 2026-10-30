import data from './data/mapleLeafRag.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'maple-leaf-rag',
    title: 'Maple Leaf Rag',
    artist: 'Scott Joplin',
    year: '1899',
    tag: 'Ragtime',
    key: 'A♭ major',
    bpm: 92,
    beatsPerBar: 2,
    barOffset: 0,
    hue: 28,
    mood: 'Bouncy · Ragtime',
    blurb: 'The rag that made Joplin famous: snappy syncopations and leaping octaves.',
    previewBeat: 0,
  },
  // A A B B A, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
