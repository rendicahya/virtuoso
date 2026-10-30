import data from './data/preludeEMinor.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'prelude-e-minor',
    title: 'Prelude in E Minor',
    artist: 'Frédéric Chopin',
    year: '1839',
    tag: 'Classical',
    key: 'E minor',
    bpm: 50,
    beatsPerBar: 4,
    barOffset: 1,
    hue: 212,
    mood: 'Sorrowful · Still',
    blurb: "Op. 28 No. 4: a quietly grieving melody over slowly sinking chords, played at Chopin's own funeral.",
    previewBeat: 0,
  },
  // Complete piece, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
