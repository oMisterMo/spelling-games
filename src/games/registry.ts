import type { Scene } from '../core/Scene';
import type { SceneManager } from '../core/SceneManager';
import { abcOrderLevelSelect } from './abc-order/levelSelect';
import { balloonPopLevelSelect } from './balloon-pop/levelSelect';
import { crosswordLevelSelect } from './crossword/levelSelect';
import { fireflyCatchLevelSelect } from './firefly-catch/levelSelect';
import { hungryMonsterLevelSelect } from './hungry-monster/levelSelect';
import { missingLettersLevelSelect } from './missing-letters/levelSelect';
import { speedySpellerLevelSelect } from './speedy-speller/levelSelect';
import { spellingBeeLevelSelect } from './spelling-bee/levelSelect';
import { wordScrambleLevelSelect } from './word-scramble/levelSelect';
import { wordSearchLevelSelect } from './word-search/levelSelect';

export interface GameInfo {
  id: string;
  title: string;
  color: number;
  /** Text color on this game's background; defaults to white. Use a dark color on light backgrounds. */
  textColor?: number;
  create: (scenes: SceneManager, info: GameInfo) => Scene;
}

/**
 * Every game shown on the menu. Each game lives in its own folder with a
 * levelSelect.ts that `create` points at. To add a game before it's built,
 * point `create` at `(s, i) => new PlaceholderGame(s, i)` from ./PlaceholderGame.
 */
export const GAMES: GameInfo[] = [
  { id: 'crossword', title: 'Crossword', color: 0xef476f, create: (s, i) => crosswordLevelSelect(s, i) },
  { id: 'word-search', title: 'Word Search', color: 0xf78c6b, create: (s, i) => wordSearchLevelSelect(s, i) },
  { id: 'alphabetical-order', title: 'ABC Order', color: 0xffd166, textColor: 0x2b2d42, create: (s, i) => abcOrderLevelSelect(s, i) },
  { id: 'word-scramble', title: 'Word Scramble', color: 0x06d6a0, create: (s, i) => wordScrambleLevelSelect(s, i) },
  { id: 'missing-letters', title: 'Missing Letters', color: 0x118ab2, create: (s, i) => missingLettersLevelSelect(s, i) },
  { id: 'spelling-bee', title: 'Spelling Bee', color: 0x9b5de5, create: (s, i) => spellingBeeLevelSelect(s, i) },
  { id: 'speedy-speller', title: 'Speedy Speller', color: 0xf15bb5, create: (s, i) => speedySpellerLevelSelect(s, i) },
  { id: 'balloon-pop', title: 'Balloon Pop', color: 0x00bbf9, create: (s, i) => balloonPopLevelSelect(s, i) },
  { id: 'hungry-monster', title: 'Hungry Monster', color: 0x8ac926, textColor: 0x2b2d42, create: (s, i) => hungryMonsterLevelSelect(s, i) },
  { id: 'firefly-catch', title: 'Firefly Catch', color: 0x3a0ca3, create: (s, i) => fireflyCatchLevelSelect(s, i) },
];
