<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { piano } from '../lib/audio.ts';
  import { DIFFICULTIES, DIFF_CONFIG, type Difficulty } from '../lib/chart.ts';
  import { formatTime, getChart, KEYMAP, keyLabel } from '../lib/library.ts';
  import { getBest } from '../lib/storage.ts';
  import type { Song } from '../lib/types.ts';

  let {
    songs,
    selectedId = $bindable(),
    difficulty = $bindable(),
    modalOpen = false,
    onplay,
    onsettings,
    onimport,
    ondelete,
  }: {
    songs: Song[];
    selectedId: string;
    difficulty: Difficulty;
    modalOpen?: boolean;
    onplay: () => void;
    onsettings: () => void;
    onimport: () => void;
    ondelete: (song: Song) => void;
  } = $props();

  let listEl: HTMLElement;
  const index = $derived(Math.max(0, songs.findIndex((s) => s.id === selectedId)));
  const song = $derived(songs[index]);
  const data = $derived(song.load());
  const charts = $derived(DIFFICULTIES.map((d) => ({ d, chart: getChart(song, d), best: getBest(song.id, d) })));
  const current = $derived(charts.find((c) => c.d === difficulty)!);

  // Song preview, debounced so scrolling through the list stays quiet.
  let previewTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const d = data;
    clearTimeout(previewTimer);
    piano.stopPreview();
    previewTimer = setTimeout(() => piano.startPreview(d), 380);
  });
  onDestroy(() => {
    clearTimeout(previewTimer);
    piano.stopPreview();
  });

  async function select(i: number) {
    const n = songs.length;
    selectedId = songs[((i % n) + n) % n].id;
    await tick();
    listEl?.querySelector('.card.active')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function onkeydown(e: KeyboardEvent) {
    if (modalOpen) return;
    const di = DIFFICULTIES.indexOf(difficulty);
    if (e.key === 'ArrowDown') select(index + 1);
    else if (e.key === 'ArrowUp') select(index - 1);
    else if (e.key === 'ArrowRight') difficulty = DIFFICULTIES[Math.min(2, di + 1)];
    else if (e.key === 'ArrowLeft') difficulty = DIFFICULTIES[Math.max(0, di - 1)];
    else if (e.key === 'Enter') onplay();
    else return;
    e.preventDefault();
  }

  const gradeColor = (g?: string) =>
    !g ? 'var(--muted)' : g.startsWith('S') ? 'var(--gold)' : g === 'A' ? '#7fe0ff' : g === 'B' ? '#9dffb8' : '#c9c3d6';
</script>

<svelte:window {onkeydown} />

<div class="select" style="--h:{song.hue}" in:fade={{ duration: 400 }}>
  <header>
    <div class="brand">
      <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M24 46V16l22-5v30" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" /><circle cx="18" cy="46" r="7" fill="currentColor" /><circle cx="40" cy="41" r="7" fill="currentColor" /></svg>
      Virtuoso
    </div>
    <div class="actions">
      <button class="btn" onclick={onimport}>
        <svg viewBox="0 0 24 24" width="16" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
        Import MIDI
      </button>
      <button class="btn" onclick={onsettings}>
        <svg viewBox="0 0 24 24" width="16" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><circle cx="16" cy="7" r="2" stroke="currentColor" stroke-width="2" fill="none" /><circle cx="10" cy="17" r="2" stroke="currentColor" stroke-width="2" fill="none" /></svg>
        Settings
      </button>
    </div>
  </header>

  <main>
    <section class="list" bind:this={listEl} aria-label="Setlist">
      <div class="list-title">Tonight's Programme</div>
      {#each songs as s, i (s.id)}
        <button class="card" class:active={s.id === selectedId} style="--ch:{s.hue}" onclick={() => select(i)}>
          <span class="idx">{String(i + 1).padStart(2, '0')}</span>
          <span class="meta">
            <span class="t">{s.title}</span>
            <span class="a">{s.artist}</span>
          </span>
          <span class="chip" data-tag={s.tag}>{s.tag}</span>
        </button>
      {/each}
    </section>

    <section class="detail">
      {#key song.id}
        <div class="hero" in:fly={{ y: 16, duration: 450 }}>
          <div class="eyebrow">
            <span class="chip" data-tag={song.tag}>{song.tag}</span>
            <span>{song.year}</span>
            <span class="dot">•</span>
            <span>{song.mood}</span>
          </div>
          <h2>{song.title}</h2>
          <div class="artist">{song.artist}</div>
          <p class="blurb">{song.blurb}</p>

          <dl class="facts">
            <div><dt>Key</dt><dd>{song.key}</dd></div>
            <div><dt>Tempo</dt><dd>{Math.round(data.bpm)} BPM</dd></div>
            <div><dt>Length</dt><dd>{formatTime(data.duration)}</dd></div>
          </dl>
        </div>
      {/key}

      <div class="diffs" role="radiogroup" aria-label="Difficulty">
        {#each charts as c (c.d)}
          <button
            class="diff {c.d}"
            class:active={difficulty === c.d}
            role="radio"
            aria-checked={difficulty === c.d}
            onclick={() => (difficulty = c.d)}
          >
            <span class="dname">{DIFF_CONFIG[c.d].label}</span>
            <span class="lv"><small>Lv</small>{c.chart.level}</span>
            <span class="pips" aria-hidden="true">
              {#each Array(12) as _, k}<i class:on={k < c.chart.level}></i>{/each}
            </span>
            <span class="dinfo">{c.chart.notes.length} notes · {c.chart.lanes} keys</span>
            <span class="best" style="color:{gradeColor(c.best?.grade)}">
              {#if c.best}
                {c.best.grade} · {c.best.score.toLocaleString()}{c.best.fullCombo ? ' · FC' : ''}
              {:else}
                Not yet performed
              {/if}
            </span>
          </button>
        {/each}
      </div>

      <div class="play-row">
        <div class="keys-hint">
          {#each KEYMAP[current.chart.lanes] as code}<kbd>{keyLabel(code)}</kbd>{/each}
        </div>
        <div class="play-actions">
          {#if song.imported}
            <button class="btn" onclick={() => ondelete(song)}>Remove</button>
          {/if}
          <button class="btn primary perform" onclick={onplay}>
            Perform
            <svg viewBox="0 0 24 24" width="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          </button>
        </div>
      </div>
    </section>
  </main>

  <footer class="hints">
    <span><kbd>↑</kbd><kbd>↓</kbd> Song</span>
    <span><kbd>←</kbd><kbd>→</kbd> Difficulty</span>
    <span><kbd>Enter</kbd> Perform</span>
  </footer>
</div>

<style>
  .select {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: max(16px, env(safe-area-inset-top)) clamp(16px, 3vw, 40px) 12px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0 18px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--serif);
    font-size: 1.7rem;
    font-weight: 600;
    color: var(--gold);
  }

  .brand svg {
    width: 26px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(260px, 380px) 1fr;
    gap: clamp(16px, 3vw, 44px);
  }

  .list {
    overflow-y: auto;
    padding-right: 6px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    scrollbar-width: thin;
  }

  .list-title {
    font-size: 0.72rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 4px 4px 6px;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    border-radius: 14px;
    border: 1px solid var(--panel-border);
    background: var(--panel);
    backdrop-filter: blur(12px);
    transition:
      transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
      background 0.25s,
      border-color 0.25s,
      box-shadow 0.25s;
  }

  .card:hover {
    background: rgba(30, 26, 48, 0.7);
  }

  .card.active {
    transform: translateX(8px);
    border-color: hsl(var(--ch) 80% 65% / 0.6);
    background: linear-gradient(100deg, hsl(var(--ch) 70% 45% / 0.28), rgba(16, 14, 28, 0.7));
    box-shadow: 0 8px 30px hsl(var(--ch) 80% 40% / 0.25), inset 3px 0 0 hsl(var(--ch) 85% 65%);
  }

  .idx {
    font-family: var(--serif);
    font-size: 1.25rem;
    color: var(--muted);
    width: 1.6em;
  }

  .card.active .idx {
    color: hsl(var(--ch) 85% 72%);
  }

  .meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .meta .t {
    font-weight: 500;
    font-size: 1.02rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta .a {
    font-size: 0.8rem;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip {
    flex: none;
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.3em 0.7em;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--muted);
  }

  .chip[data-tag='Original'] {
    color: #ffd98f;
    border-color: rgba(255, 217, 143, 0.4);
  }

  .chip[data-tag='Imported'] {
    color: #9fe7ff;
    border-color: rgba(159, 231, 255, 0.4);
  }

  .detail {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 2px 8px;
  }

  .eyebrow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .dot {
    opacity: 0.5;
  }

  h2 {
    margin: 12px 0 0;
    font-family: var(--serif);
    font-weight: 600;
    font-size: clamp(2.6rem, 6vw, 4.8rem);
    line-height: 1;
    background: linear-gradient(180deg, #fff, hsl(var(--h) 80% 80%));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .artist {
    margin-top: 8px;
    font-family: var(--serif);
    font-style: italic;
    font-size: 1.35rem;
    color: hsl(var(--h) 70% 78%);
  }

  .blurb {
    max-width: 58ch;
    margin: 16px 0 0;
    line-height: 1.6;
    color: var(--muted);
  }

  .facts {
    display: flex;
    gap: 28px;
    margin: 20px 0 0;
  }

  .facts dt {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .facts dd {
    margin: 4px 0 0;
    font-size: 1.05rem;
  }

  .diffs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-top: auto;
    padding-top: 28px;
  }

  .diff {
    --dc: var(--normal);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    padding: 16px;
    text-align: left;
    border-radius: 16px;
    border: 1px solid var(--panel-border);
    background: var(--panel);
    backdrop-filter: blur(12px);
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.2s;
  }

  .diff.easy {
    --dc: var(--easy);
  }

  .diff.hard {
    --dc: var(--hard);
  }

  .diff:hover {
    transform: translateY(-2px);
  }

  .diff.active {
    border-color: color-mix(in srgb, var(--dc) 70%, transparent);
    background: linear-gradient(160deg, color-mix(in srgb, var(--dc) 18%, transparent), rgba(16, 14, 28, 0.75));
    box-shadow: 0 10px 34px color-mix(in srgb, var(--dc) 22%, transparent);
  }

  .dname {
    font-size: 0.75rem;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--dc);
    font-weight: 600;
  }

  .lv {
    font-family: var(--serif);
    font-size: 2.3rem;
    line-height: 1;
    font-weight: 600;
  }

  .lv small {
    font-size: 0.9rem;
    margin-right: 3px;
    color: var(--muted);
  }

  .pips {
    display: flex;
    gap: 3px;
  }

  .pips i {
    width: 7px;
    height: 7px;
    border-radius: 2px;
    background: var(--faint);
  }

  .pips i.on {
    background: var(--dc);
    box-shadow: 0 0 6px var(--dc);
  }

  .dinfo,
  .best {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .play-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .keys-hint {
    display: flex;
    gap: 5px;
    color: var(--muted);
  }

  .play-actions {
    display: flex;
    gap: 10px;
  }

  .perform {
    font-size: 1.08rem;
    padding: 0.8em 1.9em;
  }

  .hints {
    display: flex;
    justify-content: center;
    gap: 22px;
    padding-top: 12px;
    font-size: 0.78rem;
    color: var(--muted);
  }

  .hints kbd {
    margin-right: 3px;
  }

  @media (max-width: 820px) {
    main {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      overflow-y: auto;
    }

    .list {
      flex-direction: row;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 0 6px;
    }

    .list-title {
      display: none;
    }

    .card {
      width: auto;
      flex: none;
      min-width: 210px;
    }

    .card.active {
      transform: translateY(-2px);
    }

    .detail {
      overflow: visible;
    }

    .diffs {
      gap: 8px;
    }

    .diff {
      padding: 12px;
    }

    .hints,
    .keys-hint {
      display: none;
    }

    .actions .btn {
      padding: 0.55em 0.85em;
      font-size: 0.82rem;
    }
  }
</style>
