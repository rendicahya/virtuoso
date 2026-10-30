import type { Difficulty } from './chart.ts';

const PREFIX = 'virtuoso.';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export interface Settings {
  /** Note scroll speed, 1–10. */
  speed: number;
  /** Audio/visual offset in ms; positive if notes feel early. */
  offset: number;
  musicVol: number;
  keysVol: number;
  effects: 'high' | 'low';
  showPiano: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  speed: 5,
  offset: 0,
  musicVol: 0.8,
  keysVol: 0.95,
  effects: 'high',
  showPiano: true,
};

export const loadSettings = () => read<Settings>('settings', DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write('settings', s);

export interface Best {
  score: number;
  accuracy: number;
  grade: string;
  fullCombo: boolean;
}

type BestMap = Record<string, Best>;
const bestKey = (songId: string, diff: Difficulty) => `${songId}:${diff}`;

export function getBest(songId: string, diff: Difficulty): Best | undefined {
  return read<BestMap>('scores', {})[bestKey(songId, diff)];
}

/** Records a result; returns true when it beats the previous best score. */
export function saveBest(songId: string, diff: Difficulty, result: Best): boolean {
  const all = read<BestMap>('scores', {});
  const prev = all[bestKey(songId, diff)];
  if (prev && prev.score >= result.score) {
    if (result.fullCombo && !prev.fullCombo) {
      all[bestKey(songId, diff)] = { ...prev, fullCombo: true };
      write('scores', all);
    }
    return false;
  }
  all[bestKey(songId, diff)] = { ...result, fullCombo: result.fullCombo || !!prev?.fullCombo };
  write('scores', all);
  return true;
}

export interface ImportRecord {
  id: string;
  title: string;
  artist: string;
  /** Base64-encoded .mid file. */
  data: string;
  melodyTrack: number;
  /** Take only the top voice of the melody track (for single-track piano MIDIs). */
  topVoice: boolean;
  added: number;
}

export const loadImports = (): ImportRecord[] => read<{ list: ImportRecord[] }>('imports', { list: [] }).list;
export const saveImports = (list: ImportRecord[]) => write('imports', { list });
