<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { DIFF_CONFIG, type Chart } from '../lib/chart.ts';
  import { GameEngine, gradeFor, LEAD_IN, type GameResult, type Judge } from '../lib/engine.ts';
  import { KEYMAP, keyLabel } from '../lib/library.ts';
  import { Stage } from '../lib/scene.ts';
  import type { Settings } from '../lib/storage.ts';
  import type { Song, SongData } from '../lib/types.ts';
  import PianoKeys from './PianoKeys.svelte';

  let {
    song,
    data,
    chart,
    settings,
    onfinish,
    onquit,
    onrestart,
  }: {
    song: Song;
    data: SongData;
    chart: Chart;
    settings: Settings;
    onfinish: (r: GameResult) => void;
    onquit: () => void;
    onrestart: () => void;
  } = $props();

  // Props are fixed for the lifetime of a run (the parent remounts on restart).
  const codes = untrack(() => KEYMAP[chart.lanes]);
  const labels = codes.map(keyLabel);
  const unitsPerSec = untrack(() => 8 + settings.speed * 3);
  const range = untrack(() => {
    const all = [...data.player, ...data.accomp].map((n) => n.midi);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    lo -= lo % 12;
    hi += 11 - (hi % 12);
    while (hi - lo < 47) (lo > 24 ? (lo -= 12) : (hi += 12));
    return { lo: Math.max(21, lo), hi: Math.min(108, hi) };
  });

  let host: HTMLDivElement;
  let pianoKeys = $state<PianoKeys>();
  let stage: Stage | undefined;
  let engine: GameEngine;

  let score = $state(0);
  let combo = $state(0);
  let accuracy = $state(1);
  let progress = $state(0);
  let paused = $state(false);
  let finishing = $state(false);
  let finaleText = $state('');
  let countdown = $state('');
  let judge = $state<{ text: string; cls: Judge | 'break'; id: number; timing: string } | null>(null);
  let lanes = $state<{ x: number; y: number; w: number; color: string }[]>([]);
  let down = $state<boolean[]>(Array(codes.length).fill(false));
  let milestone = $state<{ n: number; id: number } | null>(null);
  let judgeId = 0;

  const JUDGE_TEXT: Record<Judge, string> = { perfect: 'Perfect', great: 'Great', good: 'Good', miss: 'Miss' };

  function syncStats() {
    const s = engine.stats;
    score = s.score;
    accuracy = s.accuracy;
    const prev = combo;
    combo = s.combo;
    if (combo > prev && combo % 50 === 0) milestone = { n: combo, id: ++judgeId };
    stage?.setEnergy(Math.min(1, combo / 60));
  }

  function showJudge(j: Judge | 'break', delta = 0) {
    const timing = j === 'great' || j === 'good' ? (delta < 0 ? 'Early' : 'Late') : '';
    judge = { text: j === 'break' ? 'Break' : JUDGE_TEXT[j], cls: j, id: ++judgeId, timing };
  }

  function updateLayout() {
    if (!stage) return;
    lanes = stage.laneScreen().map((p, i) => ({ ...p, color: stage!.laneColor(i) }));
  }

  onMount(() => {
    stage = new Stage(host, { lanes: chart.lanes, hue: song.hue, bloom: settings.effects === 'high', bpm: data.bpm, bars: data.bars });
    stage.setNotes([]);
    stage.onLayout = updateLayout;
    updateLayout();

    engine = new GameEngine(
      data,
      chart,
      {
        judge: (j, note, delta) => {
          stage?.hit(note.lane, j);
          showJudge(j, delta);
          syncStats();
        },
        holdEnd: (ok, note) => {
          if (ok) stage?.hit(note.lane, 'perfect');
          else if (note.state !== 'missed') showJudge('break');
          syncStats();
        },
        end: finish,
      },
      settings.offset,
    );
    stage.setNotes(engine.notes);
    engine.start();

    let raf = 0;
    let last = performance.now();
    const frame = (nowMs: number) => {
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      const t = engine.update();
      stage?.render(t, unitsPerSec);
      if (!paused) progress = engine.progress;
      countdown =
        t < -0.3 ? String(Math.min(3, Math.ceil((-t - 0.3) / ((LEAD_IN - 0.3) / 3)))) : t < 0.3 && !paused ? 'Play' : '';
      pianoKeys?.draw(engine.litPlayer, engine.litAuto(), t, dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      if (document.hidden) pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onBlur = () => pause();
    window.addEventListener('blur', onBlur);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      engine.stop();
      stage?.dispose();
      stage = undefined;
    };
  });

  function finish() {
    finishing = true;
    finaleText = engine.fullCombo ? 'Full Combo' : 'Bravo';
    const result: GameResult = {
      stats: { ...engine.stats },
      accuracy: engine.finalAccuracy,
      grade: gradeFor(engine.finalAccuracy),
      fullCombo: engine.fullCombo,
      totalNotes: engine.notes.length,
    };
    setTimeout(() => onfinish(result), 1600);
  }

  function pause() {
    if (paused || finishing || engine.status !== 'playing') return;
    for (let i = 0; i < down.length; i++) if (down[i]) releaseLane(i);
    engine.pause();
    paused = true;
  }

  async function resume() {
    paused = false;
    await engine.resume();
  }

  function pressLane(lane: number) {
    if (paused || down[lane]) return;
    down[lane] = true;
    stage?.setPressed(lane, true);
    engine.press(lane);
  }

  function releaseLane(lane: number) {
    if (!down[lane]) return;
    down[lane] = false;
    stage?.setPressed(lane, false);
    engine.release(lane);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.code === 'Escape') {
      e.preventDefault();
      if (paused) resume();
      else pause();
      return;
    }
    if (paused) {
      if (e.code === 'KeyR') onrestart();
      else if (e.code === 'KeyQ') onquit();
      return;
    }
    const lane = codes.indexOf(e.code);
    if (lane < 0 || e.repeat) {
      if (lane >= 0) e.preventDefault();
      return;
    }
    e.preventDefault();
    pressLane(lane);
  }

  function onkeyup(e: KeyboardEvent) {
    const lane = codes.indexOf(e.code);
    if (lane >= 0) releaseLane(lane);
  }

  // Touch / mouse: each pointer claims the nearest lane column.
  const pointerLane = new Map<number, number>();
  function laneAt(x: number) {
    let best = -1;
    let bestD = Infinity;
    lanes.forEach((l, i) => {
      const d = Math.abs(l.x - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return bestD < (lanes[best]?.w ?? 0) * 1.2 ? best : -1;
  }

  function onpointerdown(e: PointerEvent) {
    const lane = laneAt(e.clientX - host.getBoundingClientRect().left);
    if (lane < 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerLane.set(e.pointerId, lane);
    pressLane(lane);
  }

  function onpointerup(e: PointerEvent) {
    const lane = pointerLane.get(e.pointerId);
    if (lane === undefined) return;
    pointerLane.delete(e.pointerId);
    releaseLane(lane);
  }
</script>

<svelte:window {onkeydown} {onkeyup} />

<div class="game" style="--h:{song.hue}" in:fade={{ duration: 500 }}>
  <div
    class="stage"
    bind:this={host}
    {onpointerdown}
    {onpointerup}
    onpointercancel={onpointerup}
    role="application"
    aria-label="Note highway"
  ></div>

  <div class="hud-top">
    <div class="song">
      <div class="t">{song.title}</div>
      <div class="a">
        {song.artist}
        <span class="diff {chart.difficulty}">{DIFF_CONFIG[chart.difficulty].label} Lv{chart.level}</span>
      </div>
    </div>
    <div class="score">
      <div class="num">{score.toLocaleString('en-US')}</div>
      <div class="acc">{(accuracy * 100).toFixed(2)}%</div>
    </div>
    <button class="pause-btn" onclick={pause} aria-label="Pause">
      <svg viewBox="0 0 24 24" width="18"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /></svg>
    </button>
  </div>
  <div class="progress"><div style="transform:scaleX({progress})"></div></div>

  <div class="center">
    {#if judge}
      {#key judge.id}
        <div class="judge {judge.cls}" in:scale={{ start: 1.35, duration: 160 }}>
          {judge.text}
          {#if judge.timing}<small>{judge.timing}</small>{/if}
        </div>
      {/key}
    {/if}
    {#if combo >= 3}
      <div class="combo">
        {#key combo}<span class="n" in:scale={{ start: 1.25, duration: 120 }}>{combo}</span>{/key}
        <span class="lbl">Combo</span>
      </div>
    {/if}
  </div>

  {#if milestone}
    {#key milestone.id}
      <div class="milestone" in:scale={{ start: 0.6, duration: 300 }} out:fade>{milestone.n} Combo!</div>
    {/key}
  {/if}

  {#each lanes as l, i}
    <div class="keycap" class:down={down[i]} style="left:{l.x}px; top:{l.y}px; --c:{l.color}">{labels[i]}</div>
  {/each}

  {#if settings.showPiano}
    <PianoKeys bind:this={pianoKeys} low={range.lo} high={range.hi} hue={song.hue} />
  {/if}

  {#if countdown}
    {#key countdown}
      <div class="countdown" in:scale={{ start: 1.6, duration: 260 }}>{countdown}</div>
    {/key}
  {/if}

  {#if finishing}
    <div class="finale" in:fade={{ duration: 600 }}>
      <span>{finaleText}</span>
    </div>
  {/if}

  {#if paused}
    <div class="modal-backdrop" transition:fade={{ duration: 150 }}>
      <div class="pause-card">
        <h2>Intermission</h2>
        <button class="btn primary" onclick={resume}>Resume <kbd>Esc</kbd></button>
        <button class="btn" onclick={onrestart}>Restart <kbd>R</kbd></button>
        <button class="btn" onclick={onquit}>Leave the stage <kbd>Q</kbd></button>
      </div>
    </div>
  {/if}
</div>

<style>
  .game {
    position: fixed;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    background: #030208;
  }

  .stage {
    position: absolute;
    inset: 0;
  }

  .stage :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .hud-top {
    position: absolute;
    top: max(14px, env(safe-area-inset-top));
    left: 16px;
    right: 16px;
    display: flex;
    align-items: flex-start;
    gap: 14px;
    pointer-events: none;
  }

  .song {
    flex: 1;
    min-width: 0;
  }

  .song .t {
    font-family: var(--serif);
    font-size: clamp(1.3rem, 3vw, 1.9rem);
    font-weight: 600;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song .a {
    margin-top: 4px;
    font-size: 0.82rem;
    color: var(--muted);
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .diff {
    font-size: 0.68rem;
    letter-spacing: 0.15em;
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

  .score {
    text-align: right;
  }

  .score .num {
    font-variant-numeric: tabular-nums;
    font-size: clamp(1.3rem, 3vw, 1.9rem);
    font-weight: 300;
    letter-spacing: 0.04em;
  }

  .score .acc {
    font-size: 0.82rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .pause-btn {
    pointer-events: auto;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--panel-border);
    background: rgba(255, 255, 255, 0.06);
  }

  .progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.06);
  }

  .progress div {
    height: 100%;
    transform-origin: left;
    background: linear-gradient(90deg, hsl(var(--h) 85% 60%), hsl(calc(var(--h) + 40) 90% 70%));
    box-shadow: 0 0 10px hsl(var(--h) 85% 60%);
  }

  .center {
    position: absolute;
    left: 50%;
    top: 36%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    text-align: center;
  }

  .judge {
    font-family: var(--serif);
    font-weight: 700;
    font-style: italic;
    font-size: clamp(2rem, 5vw, 3.2rem);
    letter-spacing: 0.04em;
    line-height: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: judge-out 0.7s 0.25s forwards;
  }

  .judge small {
    font-family: var(--sans);
    font-style: normal;
    font-weight: 500;
    font-size: 0.75rem;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    opacity: 0.75;
    margin-top: 4px;
  }

  .judge.perfect {
    background: linear-gradient(180deg, #fff8e1, #ffc85a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0 16px rgba(255, 200, 90, 0.7));
  }

  .judge.great {
    color: #7fe9ff;
    text-shadow: 0 0 18px rgba(80, 220, 255, 0.6);
  }

  .judge.good {
    color: #9dffb8;
    text-shadow: 0 0 14px rgba(100, 255, 160, 0.5);
  }

  .judge.miss,
  .judge.break {
    color: #ff7088;
    text-shadow: 0 0 14px rgba(255, 80, 110, 0.5);
  }

  .combo {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .combo .n {
    font-size: clamp(2.4rem, 7vw, 4.4rem);
    font-weight: 200;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    text-shadow: 0 0 24px hsl(var(--h) 90% 60% / 0.6);
  }

  .combo .lbl {
    font-size: 0.7rem;
    letter-spacing: 0.5em;
    text-transform: uppercase;
    color: var(--muted);
    margin-right: -0.5em;
  }

  .milestone {
    position: absolute;
    left: 50%;
    top: 18%;
    transform: translateX(-50%);
    font-family: var(--serif);
    font-size: clamp(1.6rem, 4vw, 2.4rem);
    font-weight: 600;
    color: var(--gold);
    text-shadow: 0 0 24px rgba(242, 196, 109, 0.7);
    pointer-events: none;
    animation: fade-out 1.2s 0.8s forwards;
  }

  @keyframes fade-out {
    to {
      opacity: 0;
    }
  }

  .keycap {
    position: absolute;
    transform: translate(-50%, 0);
    margin-top: 6px;
    min-width: 30px;
    padding: 4px 8px;
    border-radius: 7px;
    text-align: center;
    font-size: 0.82rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
    background: rgba(10, 8, 18, 0.55);
    border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
    pointer-events: none;
    transition:
      background 0.08s,
      color 0.08s,
      transform 0.08s;
  }

  .keycap.down {
    color: #120e1a;
    background: var(--c);
    transform: translate(-50%, 2px);
    box-shadow: 0 0 16px var(--c);
  }

  .countdown {
    position: absolute;
    left: 50%;
    top: 36%;
    transform: translate(-50%, -50%);
    font-family: var(--serif);
    font-size: clamp(4rem, 12vw, 7rem);
    font-weight: 600;
    color: var(--gold);
    text-shadow: 0 0 40px rgba(242, 196, 109, 0.6);
    pointer-events: none;
  }

  .finale {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.7));
    pointer-events: none;
  }

  .finale span {
    font-family: var(--serif);
    font-style: italic;
    font-size: clamp(3rem, 10vw, 6rem);
    font-weight: 600;
    color: var(--gold);
    text-shadow: 0 0 40px rgba(242, 196, 109, 0.6);
    animation: rise 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .pause-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: min(320px, 100%);
    padding: 28px;
    border-radius: 20px;
    background: rgba(20, 17, 32, 0.92);
    border: 1px solid var(--panel-border);
    text-align: center;
  }

  .pause-card h2 {
    margin: 0 0 10px;
    font-family: var(--serif);
    font-weight: 600;
    font-size: 2.2rem;
  }

  .pause-card .btn {
    justify-content: center;
  }

  @keyframes judge-out {
    to {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(24px) scale(0.96);
    }
  }
</style>
