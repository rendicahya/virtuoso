import type { Song } from '../types.ts';
import moonlightPromise from './moonlightPromise.ts';
import untilTheLastRain from './untilTheLastRain.ts';
import canonInD from './canonInD.ts';
import furElise from './furElise.ts';
import neonSkyline from './neonSkyline.ts';

/** Built-in setlist, roughly ordered from gentlest to most demanding. */
export const BUILTIN_SONGS: Song[] = [moonlightPromise, untilTheLastRain, canonInD, furElise, neonSkyline];
