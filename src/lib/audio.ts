import * as Tone from 'tone';
import { midiToName } from './theory.ts';
import type { SongData } from './types.ts';

/** Salamander Grand Piano samples every minor third; the sampler repitches between them. */
const SAMPLE_NOTES = (() => {
  const out = ['A0'];
  for (let o = 1; o <= 7; o++) for (const n of ['C', 'D#', 'F#', 'A']) out.push(n + o);
  out.push('C8');
  return out;
})();

type Bus = 'keys' | 'band' | 'preview';
type Instrument = Tone.Sampler | Tone.PolySynth;

const toDb = (gain: number) => (gain <= 0.001 ? -Infinity : 20 * Math.log10(gain));

class PianoEngine {
  ready = false;
  usingFallback = false;
  private initPromise: Promise<void> | null = null;
  private raw!: AudioContext;
  private inst = {} as Record<Bus, Instrument>;
  private vols = {} as Record<Bus, Tone.Volume>;
  private musicVol = 0.8;
  private keysVol = 0.9;
  // Smoothed clock state.
  private clockBase = 0;
  private latency = 0;
  private previewTimer: ReturnType<typeof setInterval> | undefined;

  init(onProgress?: (p: number) => void): Promise<void> {
    this.initPromise ??= this.doInit(onProgress);
    return this.initPromise;
  }

  private async doInit(onProgress?: (p: number) => void) {
    const ctx = new Tone.Context({ latencyHint: 'interactive', lookAhead: 0 });
    Tone.setContext(ctx);
    await Tone.start();
    this.raw = ctx.rawContext as unknown as AudioContext;

    const reverb = new Tone.Reverb({ decay: 3.2, preDelay: 0.025, wet: 0.24 });
    await reverb.generate();
    const comp = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.01, release: 0.2 });
    reverb.chain(comp, new Tone.Limiter(-1), ctx.destination);
    for (const bus of ['keys', 'band', 'preview'] as Bus[]) this.vols[bus] = new Tone.Volume(0).connect(reverb);
    this.applyVolumes();

    try {
      const base = `${import.meta.env.BASE_URL}samples/piano/`;
      const buffers: Record<string, Tone.ToneAudioBuffer> = {};
      let done = 0;
      await Promise.all(
        SAMPLE_NOTES.map(async (n) => {
          buffers[n] = await new Tone.ToneAudioBuffer().load(`${base}${n.replace('#', 's')}.mp3`);
          onProgress?.(++done / SAMPLE_NOTES.length);
        }),
      );
      for (const bus of Object.keys(this.vols) as Bus[]) {
        this.inst[bus] = new Tone.Sampler({ urls: buffers, release: 1.1 }).connect(this.vols[bus]);
      }
    } catch (err) {
      console.warn('Piano samples unavailable, using synth fallback', err);
      this.usingFallback = true;
      for (const bus of Object.keys(this.vols) as Bus[]) {
        this.inst[bus] = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.6, sustain: 0.25, release: 1.2 },
        }).connect(this.vols[bus]);
        this.inst[bus].volume.value = -10;
      }
      onProgress?.(1);
    }
    this.latency = (this.raw.outputLatency || 0) + (this.raw.baseLatency || 0);
    this.ready = true;
  }

  setVolumes(music: number, keys: number) {
    this.musicVol = music;
    this.keysVol = keys;
    if (this.ready) this.applyVolumes();
  }

  private applyVolumes() {
    this.vols.keys.volume.value = toDb(this.keysVol);
    this.vols.band.volume.value = toDb(this.musicVol);
  }

  /** Raw audio-context time (for scheduling). */
  now() {
    return this.raw.currentTime;
  }

  /**
   * Smoothed estimate of the audio time currently reaching the speakers.
   * `currentTime` advances in render-quantum steps; interpolating with performance.now() keeps visuals fluid.
   */
  clock() {
    const ctxT = this.raw.currentTime;
    const p = performance.now() / 1000;
    const err = ctxT - (this.clockBase + p);
    if (Math.abs(err) > 0.04) this.clockBase = ctxT - p;
    else this.clockBase += err * 0.03;
    return this.clockBase + p - this.latency;
  }

  schedule(bus: Bus, midi: number, time: number, dur: number, vel: number) {
    this.inst[bus].triggerAttackRelease(midiToName(midi), Math.max(0.05, dur), time, vel);
  }

  tap(midi: number, dur: number, vel: number) {
    this.schedule('keys', midi, this.now(), Math.max(0.18, dur), vel);
  }

  keyDown(midi: number, vel: number) {
    this.inst.keys.triggerAttack(midiToName(midi), this.now(), vel);
  }

  keyUp(midi: number) {
    this.inst.keys.triggerRelease(midiToName(midi), this.now());
  }

  silence() {
    if (!this.ready) return;
    this.inst.keys.releaseAll();
    this.inst.band.releaseAll();
  }

  suspend() {
    return this.raw.suspend();
  }

  resume() {
    return this.raw.resume();
  }

  /** Plays a short excerpt of a song on the preview bus, fading in and out. */
  startPreview(data: SongData, from = data.previewAt, length = 20) {
    if (!this.ready) return;
    this.stopPreview(0.05);
    const notes = [...data.player, ...data.accomp].filter((n) => n.t >= from && n.t < from + length).sort((a, b) => a.t - b.t);
    if (!notes.length) return;
    const vol = this.vols.preview.volume;
    const now = this.now();
    const target = toDb(this.musicVol * 0.85);
    vol.cancelScheduledValues(now);
    vol.setValueAtTime(-40, now);
    vol.linearRampToValueAtTime(target, now + 0.8);
    vol.setValueAtTime(target, now + length - 2.5);
    vol.linearRampToValueAtTime(-60, now + length);
    const t0 = now + 0.12;
    let i = 0;
    const tick = () => {
      const horizon = this.now() - t0 + 0.4;
      while (i < notes.length && notes[i].t - from < horizon) {
        const n = notes[i++];
        this.schedule('preview', n.midi, t0 + n.t - from, n.d, n.v);
      }
      if (i >= notes.length) clearInterval(this.previewTimer);
    };
    tick();
    this.previewTimer = setInterval(tick, 100);
  }

  stopPreview(fade = 0.3) {
    clearInterval(this.previewTimer);
    if (!this.ready) return;
    const vol = this.vols.preview.volume;
    const now = this.now();
    vol.cancelScheduledValues(now);
    vol.setValueAtTime(vol.value, now);
    vol.linearRampToValueAtTime(-60, now + fade);
    this.inst.preview.releaseAll(now + fade);
  }
}

export const piano = new PianoEngine();
