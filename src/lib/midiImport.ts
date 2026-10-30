import { Midi } from '@tonejs/midi';
import type { ImportRecord } from './storage.ts';
import type { Note, Song, SongData } from './types.ts';

export interface TrackInfo {
  index: number;
  name: string;
  instrument: string;
  count: number;
  low: number;
  high: number;
  avgPitch: number;
  isDrum: boolean;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const base64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export function analyzeMidi(bytes: Uint8Array): { midi: Midi; tracks: TrackInfo[]; suggested: number; topVoice: boolean } {
  const midi = new Midi(bytes);
  const tracks: TrackInfo[] = midi.tracks.map((t, index) => {
    const pitches = t.notes.map((n) => n.midi);
    return {
      index,
      name: t.name || `Track ${index + 1}`,
      instrument: t.instrument?.name ?? '',
      count: t.notes.length,
      low: pitches.length ? Math.min(...pitches) : 0,
      high: pitches.length ? Math.max(...pitches) : 0,
      avgPitch: pitches.length ? pitches.reduce((a, b) => a + b, 0) / pitches.length : 0,
      isDrum: t.instrument?.percussion ?? t.channel === 9,
    };
  });
  const usable = tracks.filter((t) => !t.isDrum && t.count >= 12);
  // Melody heuristic: a track named like a melody wins; otherwise the highest-sounding substantial track.
  const named = usable.find((t) => /melod|lead|vocal|voice|sing|right/i.test(t.name));
  const best = named ?? [...usable].sort((a, b) => b.avgPitch - a.avgPitch)[0];
  const suggested = best?.index ?? 0;
  // A lone track holding everything (typical of piano MIDIs) needs its top voice extracted.
  const topVoice = usable.length === 1;
  return { midi, tracks, suggested, topVoice };
}

/** Splits off the highest note of every onset cluster (the "skyline" melody). */
function splitTopVoice(notes: Note[]): { top: Note[]; rest: Note[] } {
  const sorted = [...notes].sort((a, b) => a.t - b.t || b.midi - a.midi);
  const top: Note[] = [];
  const rest: Note[] = [];
  let groupStart = -Infinity;
  for (const n of sorted) {
    if (n.t - groupStart > 0.035) {
      groupStart = n.t;
      top.push(n);
    } else rest.push(n);
  }
  return { top, rest };
}

function loadRecord(rec: ImportRecord): SongData {
  const midi = new Midi(base64ToBytes(rec.data));
  const conv = (n: { time: number; duration: number; midi: number; velocity: number }, gain: number): Note => ({
    t: n.time,
    d: n.duration,
    midi: n.midi,
    v: Math.min(1, n.velocity * gain),
  });
  let player: Note[] = [];
  let accomp: Note[] = [];
  midi.tracks.forEach((track, i) => {
    if (track.instrument?.percussion || track.channel === 9) return;
    if (i === rec.melodyTrack) {
      const notes = track.notes.map((n) => conv(n, 0.95));
      if (rec.topVoice) {
        const { top, rest } = splitTopVoice(notes);
        player = top;
        accomp.push(...rest.map((n) => ({ ...n, v: n.v * 0.7 })));
      } else player = notes;
    } else accomp.push(...track.notes.map((n) => conv(n, 0.6)));
  });

  // Trim long silent intros.
  const first = Math.min(...player.map((n) => n.t), ...accomp.map((n) => n.t));
  const shift = Math.max(0, first - 1);
  const move = (n: Note) => ({ ...n, t: n.t - shift });
  player = player.map(move).sort((a, b) => a.t - b.t);
  accomp = accomp.map(move).sort((a, b) => a.t - b.t);

  const duration = Math.max(...[...player, ...accomp].map((n) => n.t + Math.min(n.d, 2.5)));
  const bpm = midi.header.tempos[0]?.bpm ?? 120;
  const [num, den] = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
  const ticksPerBar = midi.header.ppq * num * (4 / den);
  const bars: number[] = [];
  for (let k = 0; ; k++) {
    const t = midi.header.ticksToSeconds(k * ticksPerBar) - shift;
    if (t > duration) break;
    if (t >= 0) bars.push(t);
  }
  const firstPlayer = player[0]?.t ?? 0;
  return { player, accomp, duration, bars, bpm, previewAt: Math.max(0, firstPlayer - 0.5) };
}

export function recordToSong(rec: ImportRecord): Song {
  let cache: SongData | null = null;
  return {
    id: rec.id,
    title: rec.title,
    artist: rec.artist || 'Imported MIDI',
    year: new Date(rec.added).getFullYear().toString(),
    tag: 'Imported',
    key: '—',
    bpm: 0,
    beatsPerBar: 4,
    barOffset: 0,
    hue: [...rec.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7),
    mood: 'Your MIDI',
    blurb: 'Imported from your own MIDI file. The chosen track is yours to play; everything else is the band.',
    imported: true,
    load() {
      cache ??= loadRecord(rec);
      return cache;
    },
  };
}
