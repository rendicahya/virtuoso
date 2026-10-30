<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { analyzeMidi, bytesToBase64, type TrackInfo } from '../lib/midiImport.ts';
  import type { ImportRecord } from '../lib/storage.ts';
  import { midiToName } from '../lib/theory.ts';

  let { onsave, onclose }: { onsave: (rec: ImportRecord) => string | null; onclose: () => void } = $props();

  let bytes = $state<Uint8Array | null>(null);
  let tracks = $state<TrackInfo[]>([]);
  let melodyTrack = $state(0);
  let topVoice = $state(false);
  let title = $state('');
  let artist = $state('');
  let error = $state('');
  let dragging = $state(false);

  async function load(file: File | undefined) {
    if (!file) return;
    error = '';
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const info = analyzeMidi(buf);
      const playable = info.tracks.filter((t) => t.count > 0 && !t.isDrum);
      if (!playable.length) throw new Error('No playable notes found in this file.');
      bytes = buf;
      tracks = info.tracks;
      melodyTrack = info.suggested;
      topVoice = info.topVoice;
      title = info.midi.name?.trim() || file.name.replace(/\.midi?$/i, '');
    } catch (e) {
      bytes = null;
      error = e instanceof Error ? e.message : 'Could not read this MIDI file.';
    }
  }

  function save() {
    if (!bytes) return;
    const rec: ImportRecord = {
      id: `import-${Date.now().toString(36)}`,
      title: title.trim() || 'Untitled',
      artist: artist.trim(),
      data: bytesToBase64(bytes),
      melodyTrack,
      topVoice,
      added: Date.now(),
    };
    error = onsave(rec) ?? '';
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

<div class="modal-backdrop" transition:fade={{ duration: 150 }} onclick={(e) => e.target === e.currentTarget && onclose()} role="presentation">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="import-title" transition:scale={{ start: 0.96, duration: 180 }}>
    <h2 id="import-title">Import a MIDI</h2>
    <p class="sub">
      Bring your own songs — that 90s love ballad, a new favourite. Load a MIDI file you have the rights to use; pick
      the track that carries the melody and the rest becomes your orchestra. Files stay in this browser only.
    </p>

    <label
      class="drop"
      class:dragging
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={(e) => {
        e.preventDefault();
        dragging = false;
        load(e.dataTransfer?.files[0]);
      }}
    >
      <input type="file" accept=".mid,.midi,audio/midi" onchange={(e) => load(e.currentTarget.files?.[0])} />
      <span>{bytes ? 'Choose a different file' : 'Drop a .mid file here or click to browse'}</span>
    </label>

    {#if bytes}
      <div class="fields">
        <label>Title<input type="text" bind:value={title} maxlength="60" /></label>
        <label>Artist<input type="text" bind:value={artist} maxlength="60" placeholder="Optional" /></label>
      </div>

      <div class="tracks-title">Melody track</div>
      <div class="tracks">
        {#each tracks as t (t.index)}
          {#if t.count > 0 && !t.isDrum}
            <label class="track" class:active={melodyTrack === t.index}>
              <input type="radio" name="melody" value={t.index} bind:group={melodyTrack} />
              <span class="tn">{t.name}{t.instrument ? ` · ${t.instrument}` : ''}</span>
              <span class="tc">{t.count} notes · {midiToName(t.low)}–{midiToName(t.high)}</span>
            </label>
          {/if}
        {/each}
      </div>

      <label class="toggle">
        <input type="checkbox" bind:checked={topVoice} />
        <span>Use only the top voice of this track <small>(for piano MIDIs where melody and chords share one track)</small></span>
      </label>
    {/if}

    {#if error}<p class="error">{error}</p>{/if}

    <div class="footer">
      <button class="btn" onclick={onclose}>Cancel</button>
      <button class="btn primary" disabled={!bytes} onclick={save}>Add to programme</button>
    </div>
  </div>
</div>

<style>
  .drop {
    display: grid;
    place-items: center;
    padding: 26px 16px;
    border-radius: 14px;
    border: 1.5px dashed rgba(255, 255, 255, 0.2);
    color: var(--muted);
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;
  }

  .drop:hover,
  .drop.dragging {
    border-color: var(--accent);
    background: rgba(255, 255, 255, 0.04);
  }

  .drop input {
    display: none;
  }

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 16px;
  }

  .fields label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--muted);
  }

  .fields input {
    font: inherit;
    font-size: 0.95rem;
    color: var(--text);
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid var(--panel-border);
    background: rgba(255, 255, 255, 0.05);
  }

  .tracks-title {
    margin: 18px 0 8px;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .tracks {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .track {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid var(--panel-border);
    cursor: pointer;
  }

  .track.active {
    border-color: var(--accent);
    background: rgba(255, 255, 255, 0.05);
  }

  .track input {
    grid-row: span 2;
    accent-color: var(--accent);
  }

  .tn {
    font-size: 0.92rem;
  }

  .tc {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .toggle {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-top: 14px;
    font-size: 0.88rem;
    cursor: pointer;
  }

  .toggle input {
    margin-top: 3px;
    accent-color: var(--accent);
  }

  .toggle small {
    color: var(--muted);
  }

  .error {
    color: var(--hard);
    font-size: 0.85rem;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
