import type { WordLevel } from '../../data/wordLists';

export interface MissingLettersLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** Letters hidden in each word. */
  missing: number;
  /** Letter choices offered for each word, including the right ones. */
  choices: number;
  /** Never hide the first letter. */
  keepFirstLetter: boolean;
  /** Longer words are skipped so the letters stay big enough. */
  maxLength: number;
  showPictures: boolean;
  showClues: boolean;
  color: number;
}

export const LEVELS: MissingLettersLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 6, missing: 1, choices: 3, keepFirstLetter: true, maxLength: 5, showPictures: true, showClues: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 6, missing: 2, choices: 5, keepFirstLetter: true, maxLength: 7, showPictures: true, showClues: true, color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 6, missing: 3, choices: 6, keepFirstLetter: false, maxLength: 10, showPictures: false, showClues: true, color: 0x9b5de5 },
];
