import data from './data/traumerei.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'traumerei',
    title: 'Träumerei',
    artist: 'Robert Schumann',
    year: '1838',
    tag: 'Classical',
    key: 'F major',
    bpm: 64,
    beatsPerBar: 4,
    barOffset: 1,
    hue: 300,
    mood: 'Wistful · Dreaming',
    blurb: '"Dreaming", from Scenes from Childhood: a single, tender phrase that rises and sighs again and again.',
    previewBeat: 0,
  },
  // Complete piece, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
