// Converts the public-domain / CC MIDI sources in scripts/midi/ into compact song data.
// Run with: node scripts/midi-to-song.mjs
import fs from 'node:fs';
import tonejsMidi from '@tonejs/midi';

const { Midi } = tonejsMidi;

/**
 * melody: which notes of the melody track the player performs.
 *   'all'     — every note (chords and octaves become Hard-mode chords).
 *   'gap'     — the top note of each onset, unless it sits inside a close chord voicing.
 *   'skyline' — the top note of each onset, unless a higher melody note is still sounding.
 * skip: melody-track notes (in source beats) that belong to the accompaniment, e.g. inner-voice figuration.
 * play: [from, to) source-beat sections played back to back, for repeats and cuts.
 * timing: 'seconds' keeps the MIDI's tempo changes (beats are measured at `bpm` from real time).
 */
const SONGS = [
  { id: 'entertainer', file: 'entertainer.mid', melodyTrack: 0, melody: 'all', play: [[0, 168]] },
  { id: 'rondoAllaTurca', file: 'turca.mid', melodyTrack: 0, melody: 'all' },
  { id: 'gymnopedie', file: 'gymnopedie.mid', melodyTrack: 0, melody: 'gap' },
  { id: 'nocturneOp9No2', file: 'nocturne.mid', melodyTrack: 0, melody: 'all' },
  { id: 'clairDeLune', file: 'clairdelune.mid', melodyTrack: 0, melody: 'all' },
  // Triplet accompaniment shares the right hand with the melody.
  { id: 'moonlightSonata', file: 'moonlight1.mid', melodyTrack: 0, melody: 'all', skip: (n) => Math.abs(n.beats - 1 / 3) < 0.02 },
  // Sixteenth-note inner voice shares the right hand with the melody.
  { id: 'pathetique', file: 'pathetique2.mid', melodyTrack: 0, melody: 'skyline', skip: (n) => n.beats < 0.3 && n.midi < 63 },
  { id: 'preludeInC', file: 'preludeC.mid', melodyTrack: 1, melody: 'all' },
  { id: 'minuetInG', file: 'minuetG.mid', melodyTrack: 0, melody: 'all', play: [[0, 48], [0, 48], [48, 96], [48, 96]] },
  { id: 'traumerei', file: 'traumerei.mid', melodyTrack: 0, melody: 'skyline' },
  { id: 'preludeEMinor', file: 'prelude28-4.mid', melodyTrack: 0, melody: 'all', skip: (n) => n.beat === 0 },
  { id: 'minuteWaltz', file: 'minutewaltz.mid', melodyTrack: 0, melody: 'all' },
  { id: 'mapleLeafRag', file: 'mapleleaf.mid', melodyTrack: 0, melody: 'all', play: [[0, 160.25]] },
  { id: 'sonataK545', file: 'k545.mid', melodyTrack: 0, melody: 'all' },
  { id: 'brahmsLullaby', file: 'lullaby.mid', melodyTrack: 0, melody: 'all', play: [[0, 48], [0, 48]] },
  { id: 'mountainKing', file: 'mountainking.mid', melodyTrack: 0, melody: 'all', timing: 'seconds', bpm: 138 },
];

const r3 = (x) => Math.round(x * 1000) / 1000;

function pickMelody(notes, mode) {
  if (mode === 'all') return { melody: notes, rest: [] };
  const groups = new Map();
  for (const n of notes) {
    const key = n.beat.toFixed(3);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const melody = [];
  const rest = [];
  for (const g of [...groups.values()].sort((a, b) => a[0].beat - b[0].beat)) {
    g.sort((a, b) => b.midi - a.midi);
    const top = g[0];
    const isMelody =
      mode === 'gap'
        ? g.length === 1 || top.midi - g[1].midi >= 7
        : !melody.some((m) => m.beat < top.beat && m.beat + m.beats > top.beat + 0.01 && m.midi > top.midi);
    if (isMelody) melody.push(top);
    rest.push(...(isMelody ? g.slice(1) : g));
  }
  return { melody, rest };
}

for (const song of SONGS) {
  const midi = new Midi(fs.readFileSync(new URL(`./midi/${song.file}`, import.meta.url)));
  const ppq = midi.header.ppq;
  const toBeat = song.timing === 'seconds' ? (sec) => (sec * song.bpm) / 60 : null;
  const sections = song.play ?? [[0, Infinity]];
  const melody = [];
  const accomp = [];
  midi.tracks.forEach((track, i) => {
    const notes = track.notes.map((n) =>
      toBeat
        ? { beat: toBeat(n.time), beats: toBeat(n.duration), midi: n.midi, vel: n.velocity }
        : { beat: n.ticks / ppq, beats: n.durationTicks / ppq, midi: n.midi, vel: n.velocity },
    );
    let melodyNotes = [];
    if (i === song.melodyTrack) {
      const kept = song.skip ? notes.filter((n) => !song.skip(n)) : notes;
      const picked = pickMelody(kept, song.melody);
      melodyNotes = picked.melody;
      const rest = [...picked.rest, ...notes.filter((n) => !kept.includes(n))];
      accomp.push(...place(rest, sections, song.melody === 'all' ? 0.5 : 0.45));
    } else {
      accomp.push(...place(notes, sections, 0.5));
    }
    melody.push(...place(melodyNotes, sections, 0.78));
  });
  const pack = (list) =>
    list.sort((a, b) => a.beat - b.beat || b.midi - a.midi).map((n) => [r3(n.beat), r3(n.beats), n.midi, r3(n.vel)]);
  const out = { melody: pack(melody), accomp: pack(accomp) };
  fs.writeFileSync(new URL(`../src/lib/songs/data/${song.id}.json`, import.meta.url), JSON.stringify(out));
  console.log(`${song.id}: ${out.melody.length} melody, ${out.accomp.length} accomp, ${r3(out.melody.at(-1)[0])} beats`);
}

/** Lays the [from, to) sections end to end, scaling velocity. */
function place(notes, sections, velScale) {
  const out = [];
  let offset = 0;
  for (const [from, to] of sections) {
    for (const n of notes) {
      if (n.beat < from || n.beat >= to) continue;
      out.push({ ...n, beat: n.beat - from + offset, beats: Math.min(n.beats, to + 2 - n.beat), vel: n.vel * velScale });
    }
    offset += to - from;
  }
  return out;
}
