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
| 2 | Gymnopédie No. 1 | Satie | 1 / 2 / 3 |
| 3 | Moonlight Sonata (1st mvt.) | Beethoven | 1 / 2 / 3 |
| 4 | Paper Hearts | Original (2010s acoustic pop) | 2 / 3 / 4 |
| 5 | Until the Last Rain | Original (90s power-ballad style, with key change) | 2 / 3 / 4 |
| 6 | Lullaby (Wiegenlied) | Brahms | 2 / 3 / 4 |
| 7 | Prelude in E Minor, Op. 28 No. 4 | Chopin | 2 / 3 / 4 |
| 8 | Träumerei | Schumann | 3 / 3 / 4 |
| 9 | Pathétique Sonata (Adagio) | Beethoven | 2 / 4 / 6 |
| 10 | Golden Hour | Original (2020s tropical pop) | 3 / 4 / 6 |
| 11 | Clair de Lune | Debussy | 3 / 4 / 8 |
| 12 | Canon in D | Pachelbel | 3 / 5 / 6 |
| 13 | City Lights '85 | Original (80s city pop) | 3 / 5 / 6 |
| 14 | Minuet in G | Petzold (attr. Bach) | 3 / 5 / 7 |
| 15 | Nocturne Op. 9 No. 2 | Chopin | 3 / 5 / 7 |
| 16 | Für Elise | Beethoven | 3 / 7 / 8 |
| 17 | Prelude in C Major, BWV 846 | Bach | 3 / 7 / 8 |
| 18 | Sonata in C, K. 545 (1st mvt.) | Mozart | 3 / 6 / 11 |
| 19 | Turkish March (Rondo alla Turca) | Mozart | 3 / 6 / 12 |
| 20 | Minute Waltz | Chopin | 3 / 6 / 12 |
| 21 | The Entertainer | Joplin | 3 / 7 / 12 |
| 22 | Neon Skyline | Original (modern pop style) | 3 / 7 / 12 |
| 23 | In the Hall of the Mountain King | Grieg | 3 / 7 / 12 |
| 24 | Maple Leaf Rag | Joplin | 3 / 8 / 12 |

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
- Every piece with a file in `scripts/midi/` is converted from a [Mutopia Project](https://www.mutopiaproject.org/) MIDI edition. Most are public domain. Three editions carry Creative Commons licenses, so their derived data in `src/lib/songs/data/` is shared under the same license:
  - Nocturne Op. 9 No. 2 (`nocturneOp9No2.json`), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  - Sonata K. 545 (`sonataK545.json`), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
  - Clair de Lune (`clairDeLune.json`), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) "Moonlight Promise", "Paper Hearts", "Until the Last Rain", "Golden Hour", "City Lights '85" and "Neon Skyline" are original compositions for this project.
