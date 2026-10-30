import data from './data/moonlightSonata.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'moonlight-sonata',
    title: 'Moonlight Sonata (1st mvt.)',
    artist: 'Ludwig van Beethoven',
    year: '1801',
    tag: 'Classical',
    key: 'C♯ minor',
    bpm: 56,
    beatsPerBar: 4,
    barOffset: 0,
    hue: 236,
    mood: 'Haunting · Nocturnal',
    blurb: 'The famous Adagio sostenuto: endless rippling triplets beneath a lonely, tolling melody.',
    previewBeat: 16,
  },
  // Complete first movement, from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
