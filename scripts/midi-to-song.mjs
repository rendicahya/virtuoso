// Converts the public-domain / CC MIDI sources in scripts/midi/ into compact song data.
// Run with: node scripts/midi-to-song.mjs
import fs from 'node:fs';
import tonejsMidi from '@tonejs/midi';

const { Midi } = tonejsMidi;

/**
 * melody: which notes of the melody track the player performs.
 *   'all' — every note (chords and octaves become Hard-mode chords).
 *   'gap' — the top note of each onset, unless it sits inside a close chord voicing.
 */
const SONGS = [
  { id: 'entertainer', file: 'entertainer.mid', melodyTrack: 0, melody: 'all', to: 168 },
  { id: 'rondoAllaTurca', file: 'turca.mid', melodyTrack: 0, melody: 'all' },
  { id: 'gymnopedie', file: 'gymnopedie.mid', melodyTrack: 0, melody: 'gap' },
  { id: 'nocturneOp9No2', file: 'nocturne.mid', melodyTrack: 0, melody: 'all' },
];

const r3 = (x) => Math.round(x * 1000) / 1000;

for (const song of SONGS) {
  const midi = new Midi(fs.readFileSync(new URL(`./midi/${song.file}`, import.meta.url)));
  const ppq = midi.header.ppq;
  const to = song.to ?? Infinity;
  const melody = [];
  const accomp = [];
  midi.tracks.forEach((track, i) => {
    const notes = track.notes
      .map((n) => ({ beat: n.ticks / ppq, beats: n.durationTicks / ppq, midi: n.midi, vel: n.velocity }))
      .filter((n) => n.beat < to)
      .map((n) => ({ ...n, beats: Math.min(n.beats, to + 2 - n.beat) }));
    if (i !== song.melodyTrack) {
      accomp.push(...notes.map((n) => ({ ...n, vel: n.vel * 0.5 })));
      return;
    }
    if (song.melody === 'all') {
      melody.push(...notes.map((n) => ({ ...n, vel: n.vel * 0.78 })));
      return;
    }
    const groups = new Map();
    for (const n of notes) {
      const key = n.beat.toFixed(3);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    }
    for (const g of groups.values()) {
      g.sort((a, b) => b.midi - a.midi);
      const isMelody = g.length === 1 || g[0].midi - g[1].midi >= 7;
      const rest = isMelody ? g.slice(1) : g;
      if (isMelody) melody.push({ ...g[0], vel: g[0].vel * 0.78 });
      accomp.push(...rest.map((n) => ({ ...n, vel: n.vel * 0.45 })));
    }
  });
  const pack = (list) =>
    list.sort((a, b) => a.beat - b.beat || b.midi - a.midi).map((n) => [r3(n.beat), r3(n.beats), n.midi, r3(n.vel)]);
  const out = { melody: pack(melody), accomp: pack(accomp) };
  fs.writeFileSync(new URL(`../src/lib/songs/data/${song.id}.json`, import.meta.url), JSON.stringify(out));
  console.log(`${song.id}: ${out.melody.length} melody, ${out.accomp.length} accomp`);
}
