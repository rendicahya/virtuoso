<script lang="ts">
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { fade, fly, scale } from 'svelte/transition';
  import { DIFF_CONFIG, type Difficulty } from '../lib/chart.ts';
  import type { GameResult } from '../lib/engine.ts';
  import type { Song } from '../lib/types.ts';

  let {
    song,
    difficulty,
    level,
    result,
    newBest,
    onretry,
    onback,
  }: {
    song: Song;
    difficulty: Difficulty;
    level: number;
    result: GameResult;
    newBest: boolean;
    onretry: () => void;
    onback: () => void;
  } = $props();

  const shownScore = new Tween(0, { duration: 1600, easing: cubicOut });
  onMount(() => {
    shownScore.target = result.stats.score;
  });

  const s = $derived(result.stats);
  const rows = $derived([
    { label: 'Perfect', value: s.perfect, cls: 'perfect' },
    { label: 'Great', value: s.great, cls: 'great' },
    { label: 'Good', value: s.good, cls: 'good' },
    { label: 'Miss', value: s.miss, cls: 'miss' },
    { label: 'Holds', value: `${s.holdOk}/${s.holdOk + s.holdBroken}`, cls: '' },
    { label: 'Max Combo', value: s.maxCombo, cls: '' },
  ]);

  const remark = $derived(
    result.grade === 'S+'
      ? 'A flawless recital. The hall rises to its feet.'
      : result.grade === 'S'
        ? 'Breathtaking. Encore! Encore!'
        : result.grade === 'A'
          ? 'A beautiful performance.'
          : result.grade === 'B'
            ? 'Lovely — a little more practice and it will sing.'
            : 'Every virtuoso began somewhere. Try again?',
  );

  function onkeydown(e: KeyboardEvent) {
    if (e.code === 'KeyR') onretry();
    else if (e.code === 'Enter' || e.code === 'Escape') onback();
  }
</script>

<svelte:window {onkeydown} />

<div class="results" style="--h:{song.hue}" in:fade={{ duration: 500 }}>
  <div class="card">
    <div class="grade-wrap">
      <div class="grade" class:s={result.grade.startsWith('S')} in:scale={{ start: 2.2, duration: 700, delay: 250, easing: cubicOut }}>
        {result.grade}
      </div>
      <div class="badges">
        {#if result.fullCombo}<span class="badge fc" in:fly={{ y: 10, delay: 900 }}>Full Combo</span>{/if}
        {#if newBest}<span class="badge best" in:fly={{ y: 10, delay: 1050 }}>New Best</span>{/if}
      </div>
    </div>

    <div class="info">
      <div class="eyebrow">
        <span class="diff {difficulty}">{DIFF_CONFIG[difficulty].label} · Lv{level}</span>
      </div>
      <h2>{song.title}</h2>
      <div class="artist">{song.artist}</div>
      <p class="remark">{remark}</p>

      <div class="score">{Math.round(shownScore.current).toLocaleString('en-US')}</div>
      <div class="acc">Accuracy {(result.accuracy * 100).toFixed(2)}%</div>

      <div class="grid">
        {#each rows as r, i}
          <div class="cell" in:fly={{ y: 12, delay: 400 + i * 70 }}>
            <span class="label {r.cls}">{r.label}</span>
            <span class="value">{r.value}</span>
          </div>
        {/each}
      </div>

      <div class="actions">
        <button class="btn" onclick={onretry}>Encore <kbd>R</kbd></button>
        <button class="btn primary" onclick={onback}>Back to programme <kbd>Enter</kbd></button>
      </div>
    </div>
  </div>
</div>

<style>
  .results {
    position: relative;
    z-index: 1;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 16px;
    overflow-y: auto;
  }

  .card {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: clamp(20px, 5vw, 64px);
    align-items: center;
    width: min(920px, 100%);
    padding: clamp(22px, 4vw, 44px);
    border-radius: 28px;
    background: var(--panel);
    border: 1px solid var(--panel-border);
    backdrop-filter: blur(16px);
    box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
  }

  .grade-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .grade {
    font-family: var(--serif);
    font-weight: 700;
    font-size: clamp(7rem, 20vw, 12rem);
    line-height: 0.9;
    color: hsl(var(--h) 80% 75%);
    text-shadow: 0 0 60px hsl(var(--h) 90% 55% / 0.5);
  }

  .grade.s {
    background: linear-gradient(180deg, #fff8e1 15%, var(--gold) 60%, #b07a2a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 0 40px rgba(242, 196, 109, 0.55));
  }

  .badges {
    display: flex;
    gap: 8px;
    min-height: 28px;
  }

  .badge {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 0.45em 0.9em;
    border-radius: 999px;
  }

  .badge.fc {
    color: #1a1206;
    background: var(--gold);
    box-shadow: 0 0 20px rgba(242, 196, 109, 0.6);
  }

  .badge.best {
    color: #06151a;
    background: #7fe9ff;
    box-shadow: 0 0 20px rgba(127, 233, 255, 0.5);
  }

  .diff {
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--normal);
  }

  .diff.easy {
    color: var(--easy);
  }

  .diff.hard {
    color: var(--hard);
  }

  h2 {
    margin: 8px 0 0;
    font-family: var(--serif);
    font-weight: 600;
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    line-height: 1.05;
  }

  .artist {
    font-family: var(--serif);
    font-style: italic;
    font-size: 1.15rem;
    color: hsl(var(--h) 70% 78%);
  }

  .remark {
    color: var(--muted);
    margin: 12px 0 0;
  }

  .score {
    margin-top: 20px;
    font-size: clamp(2.2rem, 5vw, 3.2rem);
    font-weight: 200;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.03em;
  }

  .acc {
    color: var(--muted);
    font-size: 0.92rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 20px;
  }

  .cell {
    display: flex;
    flex-direction: column;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--panel-border);
  }

  .label {
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .label.perfect {
    color: #ffd46b;
  }

  .label.great {
    color: #7fe9ff;
  }

  .label.good {
    color: #9dffb8;
  }

  .label.miss {
    color: #ff7088;
  }

  .value {
    font-size: 1.35rem;
    font-variant-numeric: tabular-nums;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  @media (max-width: 680px) {
    .card {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .grid {
      text-align: left;
    }

    .actions {
      justify-content: center;
    }
  }
</style>
