import type { Note, SongData } from './types.ts';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFF_CONFIG: Record<
  Difficulty,
  { label: string; lanes: number; minGap: number; maxChord: number; holdMin: number; bassOnDownbeats: boolean }
> = {
  easy: { label: 'Easy', lanes: 4, minGap: 0.4, maxChord: 1, holdMin: 1.0, bassOnDownbeats: false },
  normal: { label: 'Normal', lanes: 6, minGap: 0.16, maxChord: 1, holdMin: 0.85, bassOnDownbeats: false },
  hard: { label: 'Hard', lanes: 8, minGap: 0, maxChord: 3, holdMin: 0.75, bassOnDownbeats: true },
};

/** Holds must also last at least this many beats, so ordinary notes at slow tempos stay taps. */
const HOLD_MIN_BEATS = 1.5;

export type NoteState = 'pending' | 'holding' | 'done' | 'missed';

export interface ChartNote extends Note {
  id: number;
  lane: number;
  hold: boolean;
  /** Time the hold ends (equals `t` for taps). */
  end: number;
  state: NoteState;
}

export interface Chart {
  difficulty: Difficulty;
  lanes: number;
  notes: ChartNote[];
  /** Notes the player doesn't perform; scheduled automatically. */
  auto: Note[];
  level: number;
  holdCount: number;
}

const SIMULTANEOUS = 0.03;

export function buildChart(data: SongData, difficulty: Difficulty): Chart {
  const cfg = DIFF_CONFIG[difficulty];
  const L = cfg.lanes;
  const holdMin = Math.max(cfg.holdMin, (HOLD_MIN_BEATS * 60) / data.bpm);
  let accomp = data.accomp;
  const src = [...data.player];
  const bassNotes = new Set<Note>();

  // Hard: the left hand joins in — the lowest accompaniment note on each bar's downbeat.
  if (cfg.bassOnDownbeats) {
    const taken = bassNotes;
    let i = 0;
    for (const bar of data.bars) {
      while (i < accomp.length && accomp[i].t < bar - SIMULTANEOUS) i++;
      let low: Note | null = null;
      for (let j = i; j < accomp.length && accomp[j].t < bar + SIMULTANEOUS; j++) {
        if (!low || accomp[j].midi < low.midi) low = accomp[j];
      }
      const melodyBusy = data.player.some((p) => Math.abs(p.t - bar) < 0.12 && p.midi - (low?.midi ?? 0) < 12);
      if (low && !melodyBusy) taken.add(low);
    }
    src.push(...taken);
    accomp = accomp.filter((n) => !taken.has(n));
  }
  src.sort((a, b) => a.t - b.t || b.midi - a.midi);

  // Group notes struck together (chords), highest first.
  const groups: Note[][] = [];
  for (const n of src) {
    const g = groups[groups.length - 1];
    if (g && n.t - g[0].t < SIMULTANEOUS) g.push(n);
    else groups.push([n]);
  }

  const kept: Note[][] = [];
  const auto: Note[] = [...accomp];
  let lastT = -Infinity;
  for (const g of groups) {
    if (g[0].t - lastT < cfg.minGap) {
      auto.push(...g);
      continue;
    }
    lastT = g[0].t;
    kept.push(g.slice(0, cfg.maxChord));
    auto.push(...g.slice(cfg.maxChord));
  }

  // Map pitch rank to lanes so the melody's contour reads left (low) to right (high), like a keyboard.
  // Ranks come from the pitches within a few seconds, so a melody that climbs or drops by octaves
  // over the song still spreads across every lane.
  const RANK_WINDOW = 6;
  const flat = kept.flat();
  const laneFor = (midi: number, t: number) => {
    const uniq = [...new Set(flat.filter((n) => Math.abs(n.t - t) <= RANK_WINDOW).map((n) => n.midi))].sort(
      (a, b) => a - b,
    );
    const r = uniq.indexOf(midi);
    const U = uniq.length;
    return U <= L ? Math.round((r * (L - 1)) / Math.max(1, U - 1)) : Math.min(L - 1, Math.floor((r * L) / U));
  };

  const busyUntil = new Array<number>(L).fill(-Infinity);
  const notes: ChartNote[] = [];
  let id = 0;
  for (const g of kept) {
    const used = new Set<number>();
    for (const n of g) {
      // Bass notes ring through the pedal, so they're always taps.
      const hold = n.d >= holdMin && !bassNotes.has(n);
      const end = hold ? n.t + Math.max(0.3, n.d - 0.1) : n.t;
      const want = laneFor(n.midi, n.t);
      // Nearest free lane, preferring the natural direction for lower chord tones.
      let lane = -1;
      for (let k = 0; k < L && lane < 0; k++) {
        for (const cand of [want - k, want + k]) {
          if (cand >= 0 && cand < L && !used.has(cand) && busyUntil[cand] < n.t - 0.05) {
            lane = cand;
            break;
          }
        }
      }
      if (lane < 0) {
        auto.push(n);
        continue;
      }
      used.add(lane);
      busyUntil[lane] = end;
      notes.push({ ...n, id: id++, lane, hold, end, state: 'pending' });
    }
  }

  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  auto.sort((a, b) => a.t - b.t);
  return {
    difficulty,
    lanes: L,
    notes,
    auto,
    level: rateLevel(notes, L),
    holdCount: notes.filter((n) => n.hold).length,
  };
}

/** Difficulty rating 1–12 from average density, burst density and lane count. */
function rateLevel(notes: ChartNote[], lanes: number): number {
  if (notes.length < 2) return 1;
  const span = Math.max(10, notes[notes.length - 1].t - notes[0].t);
  const nps = notes.length / span;
  let peak = 0;
  for (let i = 0, j = 0; i < notes.length; i++) {
    while (notes[i].t - notes[j].t > 3) j++;
    peak = Math.max(peak, (i - j + 1) / 3);
  }
  const raw = nps * 1.05 + peak * 0.55 + (lanes - 4) * 0.3;
  return Math.max(1, Math.min(12, Math.round(raw)));
}
