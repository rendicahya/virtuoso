/** A musical event measured in beats (authoring format). */
export interface Ev {
  beat: number;
  beats: number;
  midi: number;
  vel: number;
}

/** A musical event measured in seconds (playback format). */
export interface Note {
  t: number;
  d: number;
  midi: number;
  v: number;
}

export type SongTag = 'Classical' | 'Traditional' | 'Original' | 'Imported';

export interface SongMeta {
  id: string;
  title: string;
  artist: string;
  year: string;
  tag: SongTag;
  key: string;
  bpm: number;
  beatsPerBar: number;
  /** Beat on which the first full bar starts (non-zero when the song has a pickup). */
  barOffset: number;
  /** Theme hue (0-360) used for lights, lanes and menus. */
  hue: number;
  mood: string;
  blurb: string;
  /** Beat where the song-select preview starts. */
  previewBeat?: number;
}

export interface SongData {
  /** Notes the player performs (subset becomes the chart, the rest auto-plays). */
  player: Note[];
  /** Accompaniment, always auto-played. */
  accomp: Note[];
  duration: number;
  /** Bar line times in seconds. */
  bars: number[];
  bpm: number;
  previewAt: number;
}

export interface Song extends SongMeta {
  imported?: boolean;
  load(): SongData;
}
