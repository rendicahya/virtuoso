import data from './data/brahmsLullaby.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'brahms-lullaby',
    title: 'Lullaby (Wiegenlied)',
    artist: 'Johannes Brahms',
    year: '1868',
    tag: 'Classical',
    key: 'C major',
    bpm: 66,
    beatsPerBar: 3,
    barOffset: 1,
    hue: 262,
    mood: 'Gentle · Soothing',
    blurb: "\"Guten Abend, gut' Nacht\": the cradle song the whole world sings, played twice through.",
    previewBeat: 0,
  },
  // Played twice, from the Mutopia Project piano arrangement (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
