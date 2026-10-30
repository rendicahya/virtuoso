<script lang="ts">
  import { untrack } from 'svelte';
  import { piano } from './lib/audio.ts';
  import type { Difficulty } from './lib/chart.ts';
  import type { GameResult } from './lib/engine.ts';
  import { allSongs, getChart } from './lib/library.ts';
  import { loadImports, loadSettings, saveBest, saveImports, saveSettings, type ImportRecord } from './lib/storage.ts';
  import Game from './components/Game.svelte';
  import ImportModal from './components/ImportModal.svelte';
  import MenuBackground from './components/MenuBackground.svelte';
  import Results from './components/Results.svelte';
  import SettingsModal from './components/SettingsModal.svelte';
  import SongSelect from './components/SongSelect.svelte';
  import Title from './components/Title.svelte';

  type Screen = 'title' | 'select' | 'game' | 'results';

  let screen = $state<Screen>('title');
  let settings = $state(loadSettings());
  let songs = $state(allSongs());
  let selectedId = $state(untrack(() => songs[0].id));
  let difficulty = $state<Difficulty>('normal');
  let modal = $state<'settings' | 'import' | null>(null);
  let runId = $state(0);
  let result = $state<{ result: GameResult; newBest: boolean } | null>(null);

  const song = $derived(songs.find((s) => s.id === selectedId) ?? songs[0]);
  const chart = $derived(getChart(song, difficulty));

  $effect(() => {
    saveSettings($state.snapshot(settings));
    piano.setVolumes(settings.musicVol, settings.keysVol);
  });

  function play() {
    piano.stopPreview(0.1);
    runId++;
    screen = 'game';
  }

  function finish(r: GameResult) {
    const newBest = saveBest(song.id, difficulty, {
      score: r.stats.score,
      accuracy: r.accuracy,
      grade: r.grade,
      fullCombo: r.fullCombo,
    });
    result = { result: r, newBest };
    screen = 'results';
  }

  function saveImport(rec: ImportRecord): string | null {
    const list = [...loadImports(), rec];
    if (!saveImports(list)) return 'Browser storage is full — remove an imported song first.';
    songs = allSongs();
    selectedId = rec.id;
    modal = null;
    return null;
  }

  function deleteImport(id: string) {
    if (!confirm('Remove this imported song from your programme?')) return;
    saveImports(loadImports().filter((r) => r.id !== id));
    songs = allSongs();
    selectedId = songs[0].id;
  }
</script>

{#if screen !== 'game'}
  <MenuBackground hue={screen === 'title' ? 42 : song.hue} />
{/if}

{#if screen === 'title'}
  <Title onstart={() => (screen = 'select')} />
{:else if screen === 'select'}
  <SongSelect
    {songs}
    bind:selectedId
    bind:difficulty
    modalOpen={modal !== null}
    onplay={play}
    onsettings={() => (modal = 'settings')}
    onimport={() => (modal = 'import')}
    ondelete={(s) => deleteImport(s.id)}
  />
{:else if screen === 'game'}
  {#key runId}
    <Game
      {song}
      data={song.load()}
      {chart}
      {settings}
      onfinish={finish}
      onquit={() => (screen = 'select')}
      onrestart={() => runId++}
    />
  {/key}
{:else if screen === 'results' && result}
  <Results
    {song}
    {difficulty}
    level={chart.level}
    result={result.result}
    newBest={result.newBest}
    onretry={play}
    onback={() => (screen = 'select')}
  />
{/if}

{#if modal === 'settings'}
  <SettingsModal bind:settings onclose={() => (modal = null)} />
{:else if modal === 'import'}
  <ImportModal onsave={saveImport} onclose={() => (modal = null)} />
{/if}
