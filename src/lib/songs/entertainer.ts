import data from './data/entertainer.json' with { type: 'json' };
import { defineSong, unpack } from './define.ts';

export default defineSong(
  {
    id: 'the-entertainer',
    title: 'The Entertainer',
    artist: 'Scott Joplin',
    year: '1902',
    tag: 'Ragtime',
    key: 'C major',
    bpm: 76,
    beatsPerBar: 2,
    barOffset: 0,
    hue: 158,
    mood: 'Playful · Ragtime',
    blurb: 'The ragtime classic everyone knows from "The Sting": bouncing octaves, syncopated hooks, pure fun.',
    previewBeat: 7.5,
  },
  // Intro, A A, B B, A — from the Mutopia Project edition (public domain).
  () => ({ melody: unpack(data.melody), accomp: unpack(data.accomp) }),
);
