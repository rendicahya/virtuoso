<script lang="ts">
  import { piano } from '../lib/audio.ts';

  let { onstart }: { onstart: () => void } = $props();
  let loading = $state(false);
  let progress = $state(0);
  let error = $state('');

  async function begin() {
    if (loading) return;
    loading = true;
    error = '';
    try {
      await piano.init((p) => (progress = p));
      onstart();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      loading = false;
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    begin();
  }
</script>

<svelte:window {onkeydown} />

<button class="title" onclick={begin} aria-label="Start Virtuoso">
  <div class="inner">
    <svg class="crest" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 46V16l22-5v30" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="18" cy="46" r="7" fill="currentColor" />
      <circle cx="40" cy="41" r="7" fill="currentColor" />
    </svg>
    <h1>
      {#each 'Virtuoso'.split('') as ch, i}
        <span style="animation-delay:{i * 70}ms">{ch}</span>
      {/each}
    </h1>
    <p class="tagline">A Piano Concert Rhythm Game</p>

    <div class="cta">
      {#if loading}
        <div class="loading">
          <div class="bar"><div style="width:{Math.round(progress * 100)}%"></div></div>
          <span>Tuning the grand piano… {Math.round(progress * 100)}%</span>
        </div>
      {:else}
        <span class="press">Click or press any key to begin</span>
      {/if}
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  </div>
  <footer>🎧 Headphones recommended · Best on a desktop keyboard</footer>
</button>

<style>
  .title {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 16px;
    border: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.55));
  }

  .inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .crest {
    width: 56px;
    color: var(--gold);
    filter: drop-shadow(0 0 18px rgba(242, 196, 109, 0.6));
    animation: float 5s ease-in-out infinite;
  }

  h1 {
    margin: 10px 0 0;
    font-family: var(--serif);
    font-weight: 600;
    font-size: clamp(3.6rem, 13vw, 8.5rem);
    line-height: 0.95;
    letter-spacing: 0.02em;
  }

  h1 span {
    display: inline-block;
    background: linear-gradient(180deg, #fff6e0 10%, var(--gold) 60%, #b07a2a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: rise 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    filter: drop-shadow(0 4px 30px rgba(242, 196, 109, 0.25));
  }

  .tagline {
    margin: 14px 0 0;
    font-size: clamp(0.8rem, 2.6vw, 1rem);
    letter-spacing: 0.42em;
    text-transform: uppercase;
    color: var(--muted);
    animation: fade 1.4s 0.6s both;
  }

  .cta {
    margin-top: 64px;
    min-height: 60px;
    animation: fade 1.2s 1s both;
  }

  .press {
    font-size: 1rem;
    letter-spacing: 0.12em;
    animation: breathe 2.4s ease-in-out infinite;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .bar {
    width: min(280px, 70vw);
    height: 3px;
    border-radius: 3px;
    background: var(--faint);
    overflow: hidden;
  }

  .bar div {
    height: 100%;
    background: linear-gradient(90deg, var(--gold), #fff3d6);
    box-shadow: 0 0 12px var(--gold);
    transition: width 0.2s;
  }

  .error {
    color: var(--hard);
    font-size: 0.85rem;
  }

  footer {
    position: absolute;
    bottom: max(20px, env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    text-align: center;
    font-size: 0.8rem;
    color: var(--muted);
    letter-spacing: 0.05em;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(30px);
      filter: blur(8px);
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
  }

  @keyframes breathe {
    50% {
      opacity: 0.35;
    }
  }

  @keyframes float {
    50% {
      transform: translateY(-6px);
    }
  }
</style>
