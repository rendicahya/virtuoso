import data from './data/mountainKing.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'mountain-king',
    title: 'In the Hall of the Mountain King',
    artist: 'Edvard Grieg',
    year: '1875',
    tag: 'Classical',
    key: 'B minor',
    bpm: 138,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 128,
    mood: 'Sneaky · Accelerating',
    blurb: 'From Peer Gynt: a creeping troll theme that repeats louder and faster until the whole hall erupts.',
    previewBeat: 4,
  },
  // Complete piece, from the Mutopia Project piano edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
