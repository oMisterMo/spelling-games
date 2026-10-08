import type { WordLevel } from '../../data/wordLists';
import type { SpellerThemeId } from './themes';

export interface SpeedySpellerLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** How many times each word must be spelled; the grid holds this many copies of its letters. */
  copies: number;
  /** Time allowed for each word. */
  seconds: number;
  /** Seconds taken off the clock for using a hint. */
  hintPenalty: number;
  theme: SpellerThemeId;
  color: number;
}

export const LEVELS: SpeedySpellerLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 5, copies: 5, seconds: 180, hintPenalty: 10, theme: 'tortoise', color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 5, copies: 5, seconds: 180, hintPenalty: 10, theme: 'cloud', color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 5, copies: 5, seconds: 180, hintPenalty: 10, theme: 'space', color: 0xef476f },
];
