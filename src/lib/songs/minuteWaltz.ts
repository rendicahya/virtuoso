import data from './data/minuteWaltz.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'minute-waltz',
    title: 'Minute Waltz',
    artist: 'Frédéric Chopin',
    year: '1847',
    tag: 'Classical',
    key: 'D♭ major',
    bpm: 190,
    beatsPerBar: 3,
    barOffset: 0,
    hue: 345,
    mood: 'Whirling · Virtuosic',
    blurb: 'Waltz Op. 64 No. 1: a little dog chasing its tail. Spinning right-hand runs that never stop for breath.',
    previewBeat: 0,
  },
  // Complete piece, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
