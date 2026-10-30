const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ACCIDENTAL: Record<string, number> = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 };

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export function noteToMidi(name: string): number {
  const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Invalid note name "${name}"`);
  return LETTER[m[1]] + ACCIDENTAL[m[2] ?? ''] + (Number(m[3]) + 1) * 12;
}

export const midiToName = (m: number) => NAMES[mod12(m)] + (Math.floor(m / 12) - 1);
export const isBlackKey = (m: number) => [1, 3, 6, 8, 10].includes(mod12(m));

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '6': [0, 4, 7, 9],
  add9: [0, 2, 4, 7],
};

export interface Chord {
  root: number;
  bass: number;
  pcs: number[];
}

export function parseChord(sym: string): Chord {
  const m = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(sym);
  if (!m || !QUALITY[m[3]]) throw new Error(`Invalid chord "${sym}"`);
  const root = mod12(LETTER[m[1]] + ACCIDENTAL[m[2] ?? '']);
  const bass = m[4] ? mod12(LETTER[m[4]] + ACCIDENTAL[m[5] ?? '']) : root;
  return { root, bass, pcs: QUALITY[m[3]].map((i) => mod12(root + i)) };
}

/** Open, piano-style left-hand voicing: bass note plus chord tones spread above it. */
export function spreadVoicing(sym: string, bassLow = 36, span = 26): number[] {
  const c = parseChord(sym);
  const bass = bassLow + mod12(c.bass - bassLow);
  const tones = [bass];
  for (let m = bass + 5; m <= bass + span; m++) if (c.pcs.includes(mod12(m))) tones.push(m);
  return tones;
}

/** Close-position triad within one octave starting at `low`. */
export function closeVoicing(sym: string, low = 57): number[] {
  return parseChord(sym)
    .pcs.map((p) => low + mod12(p - low))
    .sort((a, b) => a - b);
}
