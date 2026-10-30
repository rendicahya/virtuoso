import { piano } from './audio.ts';
import type { Chart, ChartNote } from './chart.ts';
import type { Note, SongData } from './types.ts';

export type Judge = 'perfect' | 'great' | 'good' | 'miss';

/** Judgement windows in seconds (±). */
export const WINDOW = { perfect: 0.045, great: 0.09, good: 0.14 };
const WEIGHT: Record<Judge, number> = { perfect: 1, great: 0.75, good: 0.4, miss: 0 };

/** Seconds of falling notes before the first beat. */
export const LEAD_IN = 2.5;
const SCHEDULE_AHEAD = 0.3;

export interface Stats {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  holdOk: number;
  holdBroken: number;
  combo: number;
  maxCombo: number;
  score: number;
  /** Accuracy of everything judged so far, 0–1. */
  accuracy: number;
}

export interface GameResult {
  stats: Stats;
  accuracy: number;
  grade: string;
  fullCombo: boolean;
  totalNotes: number;
}

export interface EngineEvents {
  judge(j: Judge, note: ChartNote, delta: number): void;
  holdEnd(ok: boolean, note: ChartNote): void;
  end(): void;
}

export function gradeFor(accuracy: number): string {
  if (accuracy >= 0.98) return 'S+';
  if (accuracy >= 0.95) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.8) return 'B';
  if (accuracy >= 0.7) return 'C';
  return 'D';
}

export class GameEngine {
  readonly notes: ChartNote[];
  readonly auto: Note[];
  status: 'ready' | 'playing' | 'paused' | 'ended' = 'ready';
  time = -LEAD_IN;
  stats: Stats = { perfect: 0, great: 0, good: 0, miss: 0, holdOk: 0, holdBroken: 0, combo: 0, maxCombo: 0, score: 0, accuracy: 1 };
  /** Keys sounding from the player's hits: midi → song time it stops glowing. */
  readonly litPlayer = new Map<number, number>();

  private startAt = 0;
  private autoIdx = 0;
  private missIdx = 0;
  private holds: (ChartNote | null)[];
  private weight = 0;
  private judgedUnits = 0;
  private readonly totalUnits: number;
  private readonly offset: number;
  private visIdx = 0;
  private visActive: Note[] = [];

  constructor(
    readonly data: SongData,
    readonly chart: Chart,
    private ev: EngineEvents,
    offsetMs: number,
  ) {
    // Fresh copies so a restart starts clean.
    this.notes = chart.notes.map((n) => ({ ...n, state: 'pending' }));
    this.auto = chart.auto;
    this.holds = new Array(chart.lanes).fill(null);
    this.totalUnits = this.notes.length + chart.holdCount;
    this.offset = offsetMs / 1000;
  }

  start() {
    this.startAt = piano.now() + LEAD_IN;
    this.status = 'playing';
  }

  private songTime() {
    return piano.clock() - this.startAt - this.offset;
  }

  update(): number {
    if (this.status !== 'playing') return this.time;
    const now = (this.time = this.songTime());

    // Schedule auto-played notes slightly ahead on the audio clock.
    const ctxNow = piano.now() - this.startAt;
    while (this.autoIdx < this.auto.length && this.auto[this.autoIdx].t < ctxNow + SCHEDULE_AHEAD) {
      const n = this.auto[this.autoIdx++];
      if (n.t >= ctxNow - 0.05) piano.schedule('band', n.midi, this.startAt + n.t, n.d, n.v);
    }

    // Notes that slipped past the window are misses.
    while (this.missIdx < this.notes.length && this.notes[this.missIdx].t < now - WINDOW.good) {
      const n = this.notes[this.missIdx++];
      if (n.state === 'pending') {
        n.state = 'missed';
        this.register('miss', n, 0);
        if (n.hold) this.registerHold(false, n);
      }
    }

    // Completed holds.
    for (let lane = 0; lane < this.holds.length; lane++) {
      const h = this.holds[lane];
      if (h && now >= h.end) this.finishHold(lane, true);
    }

    if (now > this.data.duration + 0.8 && this.holds.every((h) => !h)) {
      this.status = 'ended';
      this.ev.end();
    }
    return now;
  }

  press(lane: number): ChartNote | null {
    if (this.status !== 'playing') return null;
    const now = this.songTime();
    let target: ChartNote | null = null;
    for (let i = this.missIdx; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.t > now + WINDOW.good) break;
      if (n.lane === lane && n.state === 'pending') {
        target = n;
        break;
      }
    }
    if (!target) return null;

    const delta = now - target.t;
    const ad = Math.abs(delta);
    const j: Judge = ad <= WINDOW.perfect ? 'perfect' : ad <= WINDOW.great ? 'great' : 'good';
    const vel = target.v * (j === 'perfect' ? 1 : j === 'great' ? 0.92 : 0.82);
    if (target.hold) {
      target.state = 'holding';
      this.holds[lane] = target;
      piano.keyDown(target.midi, vel);
      this.litPlayer.set(target.midi, target.end);
    } else {
      target.state = 'done';
      piano.tap(target.midi, target.d, vel);
      this.litPlayer.set(target.midi, now + Math.min(target.d, 0.5));
    }
    this.register(j, target, delta);
    return target;
  }

  release(lane: number) {
    const h = this.holds[lane];
    if (!h || this.status !== 'playing') return;
    this.finishHold(lane, this.songTime() >= h.end - WINDOW.good * 1.5);
  }

  private finishHold(lane: number, ok: boolean) {
    const h = this.holds[lane]!;
    this.holds[lane] = null;
    h.state = 'done';
    piano.keyUp(h.midi);
    this.litPlayer.delete(h.midi);
    this.registerHold(ok, h);
  }

  private register(j: Judge, note: ChartNote, delta: number) {
    const s = this.stats;
    s[j]++;
    if (j === 'miss') s.combo = 0;
    else s.maxCombo = Math.max(s.maxCombo, ++s.combo);
    this.addWeight(WEIGHT[j]);
    this.ev.judge(j, note, delta);
  }

  private registerHold(ok: boolean, note: ChartNote) {
    const s = this.stats;
    if (ok) {
      s.holdOk++;
      s.maxCombo = Math.max(s.maxCombo, ++s.combo);
    } else {
      s.holdBroken++;
      s.combo = 0;
    }
    this.addWeight(ok ? 1 : 0);
    this.ev.holdEnd(ok, note);
  }

  private addWeight(w: number) {
    this.weight += w;
    this.judgedUnits++;
    const s = this.stats;
    s.accuracy = this.weight / this.judgedUnits;
    s.score = Math.round(1_000_000 * (0.9 * (this.weight / this.totalUnits) + 0.1 * (s.maxCombo / this.totalUnits)));
  }

  /** Final accuracy over every note in the chart. */
  get finalAccuracy() {
    return this.totalUnits ? this.weight / this.totalUnits : 0;
  }

  get fullCombo() {
    return this.stats.miss === 0 && this.stats.holdBroken === 0;
  }

  get progress() {
    return Math.max(0, Math.min(1, this.time / this.data.duration));
  }

  /** Accompaniment keys sounding right now, for the on-screen keyboard. */
  litAuto(): Set<number> {
    const now = this.time;
    while (this.visIdx < this.auto.length && this.auto[this.visIdx].t <= now) this.visActive.push(this.auto[this.visIdx++]);
    this.visActive = this.visActive.filter((n) => n.t + Math.min(n.d, 0.45) > now);
    return new Set(this.visActive.map((n) => n.midi));
  }

  pause() {
    if (this.status !== 'playing') return;
    // Holds in progress are forgiven rather than broken by the pause.
    for (let lane = 0; lane < this.holds.length; lane++) if (this.holds[lane]) this.finishHold(lane, true);
    this.status = 'paused';
    void piano.suspend();
  }

  async resume() {
    if (this.status !== 'paused') return;
    await piano.resume();
    this.status = 'playing';
  }

  stop() {
    this.status = 'ended';
    piano.silence();
    void piano.resume();
  }
}
