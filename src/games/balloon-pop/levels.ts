import type { WordLevel } from '../../data/wordLists';

export interface BalloonPopLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** Wrong guesses allowed for each word; each one pops a balloon. */
  balloons: number;
  /** Show the first letter (wherever it appears in the word) to start. */
  revealFirstLetter: boolean;
  /** Longer words are skipped so the letters stay big enough. */
  maxLength: number;
  showPictures: boolean;
  showClues: boolean;
  color: number;
}

export const LEVELS: BalloonPopLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 5, balloons: 7, revealFirstLetter: true, maxLength: 5, showPictures: true, showClues: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 6, balloons: 6, revealFirstLetter: false, maxLength: 8, showPictures: true, showClues: true, color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 6, balloons: 5, revealFirstLetter: false, maxLength: 10, showPictures: false, showClues: true, color: 0x9b5de5 },
];
