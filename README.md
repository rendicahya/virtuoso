# Virtuoso 🎹

A 3D piano rhythm game for the browser, inspired by classic piano performance games. Notes fall down a glowing highway. Hit them in time and *you* play the melody on a real grand piano while the orchestra plays along. Notes you miss stay silent.

Built with **Svelte 5**, **three.js** (bloom, particles, stage lights), and **Tone.js** (sampled Salamander Grand Piano). It's frontend-only and deploys to GitHub Pages.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

| Difficulty | Keys | What you play |
|---|---|---|
| Easy | `D F J K` | The main melody notes |
| Normal | `S D F J K L` | The full melody |
| Hard | `A S D F J K L ;` | Melody + harmony chords + the bass on each downbeat |

Lanes follow pitch from low (left) to high (right), like a keyboard. Long notes are holds. `Esc` pauses. Touch works on mobile: tap the lanes.

Every difficulty sounds like the complete song. Notes the chart leaves out are played automatically.

## Setlist

| # | Song | Composer | Levels (E/N/H) |
|---|---|---|---|
| 1 | Moonlight Promise | Original (90s slow-dance love song) | 2 / 3 / 4 |
| 2 | Until the Last Rain | Original (90s power-ballad style, with key change) | 2 / 3 / 4 |
| 3 | Gymnopédie No. 1 | Satie | 1 / 2 / 3 |
| 4 | Canon in D | Pachelbel | 3 / 5 / 6 |
| 5 | Nocturne Op. 9 No. 2 | Chopin | 3 / 5 / 7 |
| 6 | Für Elise | Beethoven | 3 / 7 / 8 |
| 7 | The Entertainer | Joplin | 3 / 7 / 12 |
| 8 | Neon Skyline | Original (modern pop style) | 3 / 7 / 12 |
| 9 | Turkish March (Rondo alla Turca) | Mozart | 3 / 6 / 12 |

### Adding your own songs

- **In the game:** use **Import MIDI** on the song-select screen. Pick the melody track; the other tracks become the accompaniment. Turn on "top voice" for single-track piano MIDIs. Imports are saved in the browser's localStorage.
- **From a MIDI file, built in:** put the file in `scripts/midi/`, add an entry to `SONGS` in `scripts/midi-to-song.mjs`, run `node scripts/midi-to-song.mjs`, then add a small song file like `src/lib/songs/gymnopedie.ts`.
- **In code:** add a file in `src/lib/songs/` using the compact notation in `src/lib/notation.ts`, then register it in `src/lib/songs/index.ts`.

```ts
seq('E5:1 D#5 E5 B4 D5 C5 | A4:2 r:1 C4:1 E4 A4 |', { unit: 0.25, bar: 1.5 })
```

`:n` is the duration in units (it carries over to following notes). `r` is a rest, `+` builds a chord, and `|` is a bar line. Bar lines are checked, so a miscounted bar throws an error.

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and deploys on every push to `main`. One-time setup: **Settings → Pages → Source: GitHub Actions**.

## Credits

- Piano samples: [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, CC-BY 3.0, via [Tone.js](https://github.com/Tonejs/audio).
- Classical pieces are in the public domain.
- The Entertainer, Turkish March, Gymnopédie No. 1 and Nocturne Op. 9 No. 2 are converted from [Mutopia Project](https://www.mutopiaproject.org/) MIDI editions. The first three are public domain. The Nocturne edition is licensed [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), so its derived data (`src/lib/songs/data/nocturneOp9No2.json`) is shared under the same license. "Moonlight Promise", "Until the Last Rain" and "Neon Skyline" are original compositions for this project.
