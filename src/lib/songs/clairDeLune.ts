import data from './data/clairDeLune.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'clair-de-lune',
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    year: '1905',
    tag: 'Classical',
    key: 'D♭ major',
    bpm: 64,
    beatsPerBar: 4.5,
    barOffset: 0,
    hue: 222,
    mood: 'Dreamy · Moonlit',
    blurb: 'Moonlight on still water: soft rippling chords that swell into a flowing, shimmering middle section.',
    previewBeat: 1,
  },
  // Complete piece, from the Mutopia Project edition (CC BY-SA 4.0).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
