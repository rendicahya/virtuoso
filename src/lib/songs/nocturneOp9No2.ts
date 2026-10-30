import data from './data/nocturneOp9No2.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'nocturne-op9-no2',
    title: 'Nocturne Op. 9 No. 2',
    artist: 'Frédéric Chopin',
    year: '1832',
    tag: 'Classical',
    key: 'E♭ major',
    bpm: 62,
    beatsPerBar: 6,
    barOffset: 0.5,
    hue: 268,
    mood: 'Romantic · Moonlit',
    blurb: 'Chopin at his most romantic: a singing, ornamented love song over a gently rocking left hand.',
    previewBeat: 0,
  },
  // Complete piece, from the Mutopia Project edition (CC BY-SA 3.0).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
