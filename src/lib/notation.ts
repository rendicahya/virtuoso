/**
 * Compact text notation for authoring songs.
 *
 *   seq('E5:1 D#5 E5 B4 | A4:2 r:1 C4+E4:1')
 *
 * - Tokens are `<note>[:<duration>]`, durations are in `unit`s and are sticky.
 * - `r` is a rest, `+` joins chord tones, `!` accents and `?` softens a note.
 * - `|` marks a bar line; when `bar` is given it is checked for alignment.
 */
import { noteToMidi, parseChord, spreadVoicing } from './theory.ts';
import type { Ev } from './types.ts';

function parseDur(s: string): number {
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return a / b;
  }
  return Number(s);
}

export interface SeqOpts {
  /** Start position in beats. */
  start?: number;
  /** Beats per duration unit (0.25 = sixteenth notes, 1 = quarter notes). */
  unit?: number;
  vel?: number;
  transpose?: number;
  /** Minimum sounding length in units (simulates the sustain pedal). */
  hold?: number;
  /** Beats per bar, enables bar-line checking. */
  bar?: number;
  /** Beat of the first downbeat (for pickups). Defaults to `start`. */
  downbeat?: number;
}

export function seq(src: string, o: SeqOpts = {}): Ev[] {
  const unit = o.unit ?? 0.5;
  const vel = o.vel ?? 0.8;
  const tr = o.transpose ?? 0;
  const start = o.start ?? 0;
  const downbeat = o.downbeat ?? start;
  let pos = start;
  let dur = 1;
  let barNo = 0;
  const out: Ev[] = [];
  for (const tok of src.trim().split(/\s+/)) {
    if (!tok) continue;
    if (tok === '|') {
      barNo++;
      if (o.bar) {
        const off = (pos - downbeat) / o.bar;
        if (Math.abs(off - Math.round(off)) > 1e-6) {
          throw new Error(`Bar line ${barNo} misaligned at beat ${pos} in "${src.slice(0, 40)}..."`);
        }
      }
      continue;
    }
    const [body, d] = tok.split(':');
    if (d !== undefined) dur = parseDur(d);
    if (!(dur > 0)) throw new Error(`Bad duration in "${tok}"`);
    const len = dur * unit;
    if (body !== 'r') {
      let v = vel;
      let name = body;
      if (name.endsWith('!')) {
        v = Math.min(1, vel + 0.15);
        name = name.slice(0, -1);
      } else if (name.endsWith('?')) {
        v = vel * 0.7;
        name = name.slice(0, -1);
      }
      const beats = Math.max(len, (o.hold ?? 0) * unit);
      for (const n of name.split('+')) out.push({ beat: pos, beats, midi: noteToMidi(n) + tr, vel: v });
    }
    pos += len;
  }
  return out;
}

/** Chord progression: `'D:4 A/C#:4 Bm F#m'` (durations in beats, sticky). */
export function prog(src: string): [string, number][] {
  let dur = 4;
  const out: [string, number][] = [];
  for (const tok of src.trim().split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const i = tok.lastIndexOf(':');
    let sym = tok;
    if (i > 0) {
      sym = tok.slice(0, i);
      dur = parseDur(tok.slice(i + 1));
    }
    parseChord(sym);
    out.push([sym, dur]);
  }
  return out;
}

export interface ArpOpts {
  start: number;
  /** Beats between pattern steps. */
  step: number;
  /** Indexes into the spread voicing; arrays play together, -1 is the bass an octave lower, null rests. */
  pattern: (number | number[] | null)[];
  vel?: number;
  /** Notes ring until the chord changes. */
  pedal?: boolean;
  dur?: number;
  bassLow?: number;
  span?: number;
  /** Extra velocity on each chord's first step. */
  accent?: number;
  /** Max steps per chord (for one-shot rolls). */
  count?: number;
}

export function arpeggiate(chords: [string, number][], o: ArpOpts): Ev[] {
  const out: Ev[] = [];
  let pos = o.start;
  for (const [sym, beats] of chords) {
    const tones = spreadVoicing(sym, o.bassLow ?? 36, o.span ?? 26);
    const steps = Math.min(Math.round(beats / o.step), o.count ?? Infinity);
    for (let i = 0; i < steps; i++) {
      const entry = o.pattern[i % o.pattern.length];
      if (entry === null) continue;
      const at = pos + i * o.step;
      for (const idx of Array.isArray(entry) ? entry : [entry]) {
        const midi = idx < 0 ? tones[0] + 12 * idx : tones[Math.min(idx, tones.length - 1)];
        out.push({
          beat: at,
          beats: o.pedal ? pos + beats - at : (o.dur ?? o.step),
          midi,
          vel: (o.vel ?? 0.4) + (i === 0 ? (o.accent ?? 0.06) : 0),
        });
      }
    }
    pos += beats;
  }
  return out;
}

export const progBeats = (p: [string, number][]) => p.reduce((s, [, b]) => s + b, 0);
