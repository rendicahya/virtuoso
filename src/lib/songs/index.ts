import type { Song } from '../types.ts';
import moonlightPromise from './moonlightPromise.ts';
import untilTheLastRain from './untilTheLastRain.ts';
import gymnopedie from './gymnopedie.ts';
import canonInD from './canonInD.ts';
import nocturneOp9No2 from './nocturneOp9No2.ts';
import furElise from './furElise.ts';
import entertainer from './entertainer.ts';
import neonSkyline from './neonSkyline.ts';
import rondoAllaTurca from './rondoAllaTurca.ts';

/** Built-in setlist, roughly ordered from gentlest to most demanding. */
export const BUILTIN_SONGS: Song[] = [
  moonlightPromise,
  untilTheLastRain,
  gymnopedie,
  canonInD,
  nocturneOp9No2,
  furElise,
  entertainer,
  neonSkyline,
  rondoAllaTurca,
];
