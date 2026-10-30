import data from './data/gymnopedie.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'gymnopedie-1',
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    year: '1888',
    tag: 'Classical',
    key: 'D major',
    bpm: 72,
    beatsPerBar: 3,
    barOffset: 0,
    hue: 188,
    mood: 'Dreamy · Melancholic',
    blurb: 'A slow, floating melody over swaying chords. Calm, wistful and instantly recognisable.',
    previewBeat: 12,
  },
  // Complete piece, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
