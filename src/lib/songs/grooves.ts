import { closeVoicing, spreadVoicing } from '../theory.ts';
import type { Ev } from '../types.ts';

export interface GrooveOpts {
  /** Bass hits as [beat within the 4-beat bar, octave up (0 | 1)]. */
  bass: [number, number][];
  /** Chord stab positions within the bar. */
  stabs: number[];
  bassLen?: number;
  stabLen?: number;
  bassVel?: number;
  stabVel?: number;
  /** Lowest note of the stab triad. */
  stabLow?: number;
}

/** Band-style accompaniment: a bass line and chord stabs repeating every bar, following chords of any length. */
export function groove(chords: [string, number][], start: number, o: GrooveOpts): Ev[] {
  const out: Ev[] = [];
  let pos = start;
  for (const [sym, beats] of chords) {
    const bass = spreadVoicing(sym, 33)[0];
    const triad = closeVoicing(sym, o.stabLow ?? 57);
    const end = pos + beats;
    for (let bar = start + 4 * Math.floor((pos - start) / 4); bar < end; bar += 4) {
      for (const [p, up] of o.bass) {
        const t = bar + p;
        if (t >= pos && t < end) {
          out.push({ beat: t, beats: o.bassLen ?? 0.42, midi: bass + 12 * up, vel: (o.bassVel ?? 0.4) + (p === 0 ? 0.1 : 0) });
        }
      }
      for (const p of o.stabs) {
        const t = bar + p;
        if (t >= pos && t < end) for (const m of triad) out.push({ beat: t, beats: o.stabLen ?? 0.3, midi: m, vel: o.stabVel ?? 0.28 });
      }
    }
    pos = end;
  }
  return out;
}

/** A soft final chord, rolled from the bass up. */
export const finalChord = (sym: string, beat: number, vel = 0.4): Ev[] =>
  spreadVoicing(sym, 33)
    .slice(0, 5)
    .map((midi, i) => ({ beat: beat + i * 0.125, beats: 4, midi, vel }));
