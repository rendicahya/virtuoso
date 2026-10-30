import { buildChart, type Chart, type Difficulty } from './chart.ts';
import { recordToSong } from './midiImport.ts';
import { BUILTIN_SONGS } from './songs/index.ts';
import { loadImports } from './storage.ts';
import type { Song } from './types.ts';

export function allSongs(): Song[] {
  return [...BUILTIN_SONGS, ...loadImports().map(recordToSong)];
}

const chartCache = new Map<string, Chart>();

export function getChart(song: Song, difficulty: Difficulty): Chart {
  const key = `${song.id}:${difficulty}`;
  let chart = chartCache.get(key);
  if (!chart) {
    chart = buildChart(song.load(), difficulty);
    chartCache.set(key, chart);
  }
  return chart;
}

export function formatTime(sec: number) {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const KEYMAP: Record<number, string[]> = {
  4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
  8: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon'],
};

export const keyLabel = (code: string) => (code === 'Semicolon' ? ';' : code.replace('Key', ''));
