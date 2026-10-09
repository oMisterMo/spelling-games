import type { WordLevel } from '../../data/wordLists';

export interface HungryMonsterLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** Spellings offered for each word: the right one plus misspellings. */
  choices: number;
  showPictures: boolean;
  showClues: boolean;
  color: number;
}

export const LEVELS: HungryMonsterLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 6, choices: 2, showPictures: true, showClues: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 6, choices: 3, showPictures: true, showClues: true, color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 8, choices: 4, showPictures: false, showClues: true, color: 0x9b5de5 },
];
