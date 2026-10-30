<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { DEFAULT_SETTINGS, type Settings } from '../lib/storage.ts';

  let { settings = $bindable(), onclose }: { settings: Settings; onclose: () => void } = $props();

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="modal-backdrop" transition:fade={{ duration: 150 }} onclick={(e) => e.target === e.currentTarget && onclose()} role="presentation">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" transition:scale={{ start: 0.96, duration: 180 }}>
    <h2 id="settings-title">Settings</h2>
    <p class="sub">Tune the stage to your taste. Changes are saved automatically.</p>

    <label class="row">
      <span class="name">Note speed <b>{settings.speed}</b></span>
      <input type="range" min="1" max="10" step="1" bind:value={settings.speed} />
    </label>

    <label class="row">
      <span class="name">Timing offset <b>{settings.offset > 0 ? '+' : ''}{settings.offset} ms</b></span>
      <input type="range" min="-150" max="150" step="5" bind:value={settings.offset} />
      <span class="help">Raise it if your hits are often judged <em>Late</em>; lower it if <em>Early</em>. Bluetooth headphones usually need +100 ms or more.</span>
    </label>

    <label class="row">
      <span class="name">Orchestra volume <b>{Math.round(settings.musicVol * 100)}%</b></span>
      <input type="range" min="0" max="1" step="0.05" bind:value={settings.musicVol} />
    </label>

    <label class="row">
      <span class="name">Your piano volume <b>{Math.round(settings.keysVol * 100)}%</b></span>
      <input type="range" min="0" max="1" step="0.05" bind:value={settings.keysVol} />
    </label>

    <div class="toggles">
      <label class="toggle">
        <input type="checkbox" checked={settings.effects === 'high'} onchange={(e) => (settings.effects = e.currentTarget.checked ? 'high' : 'low')} />
        <span>Bloom &amp; glow effects</span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={settings.showPiano} />
        <span>Show piano keyboard</span>
      </label>
    </div>

    <div class="footer">
      <button class="btn" onclick={() => (settings = { ...DEFAULT_SETTINGS })}>Reset</button>
      <button class="btn primary" onclick={onclose}>Done</button>
    </div>
  </div>
</div>

<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 18px;
  }

  .name {
    display: flex;
    justify-content: space-between;
    font-size: 0.92rem;
  }

  .name b {
    font-weight: 500;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }

  .help {
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.45;
  }

  .toggles {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 6px 0 4px;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.92rem;
    cursor: pointer;
  }

  .toggle input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }
</style>
