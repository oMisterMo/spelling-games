import type { WordLevel } from '../../data/wordLists';

export interface WordScrambleLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words to unscramble in one game. */
  rounds: number;
  /** Longer words are skipped so the tiles stay big enough. */
  maxLength: number;
  /** Show the word's picture (when it has one). */
  showPictures: boolean;
  /** Show the word's clue (when it has one). */
  showClues: boolean;
  color: number;
}

export const LEVELS: WordScrambleLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 5, maxLength: 5, showPictures: true, showClues: true, color: 0xf78c6b },
  { words: 'medium', label: 'Medium', rounds: 5, maxLength: 7, showPictures: true, showClues: true, color: 0x118ab2 },
  { words: 'hard', label: 'Hard', rounds: 6, maxLength: 10, showPictures: false, showClues: true, color: 0x9b5de5 },
];
