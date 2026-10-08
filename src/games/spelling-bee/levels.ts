import type { WordLevel } from '../../data/wordLists';

export interface SpellingBeeLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** 'bank': a single row of the word's letters plus `extraLetters` others. 'full': A–Z. */
  keyboard: 'bank' | 'full';
  extraLetters: number;
  /** Fill in the first letter to start. */
  revealFirstLetter: boolean;
  /** Say each letter aloud as it's typed. */
  speakLetters: boolean;
  /** Show the picture and clue. If the browser can't speak, both are always shown. */
  showPictures: boolean;
  showClues: boolean;
  /** Wrong attempts allowed before the answer is shown. */
  maxTries: number;
  color: number;
}

export const LEVELS: SpellingBeeLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 5, keyboard: 'bank', extraLetters: 3, revealFirstLetter: true, speakLetters: true, showPictures: true, showClues: true, maxTries: 3, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 6, keyboard: 'full', extraLetters: 0, revealFirstLetter: false, speakLetters: false, showPictures: true, showClues: false, maxTries: 3, color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 6, keyboard: 'full', extraLetters: 0, revealFirstLetter: false, speakLetters: false, showPictures: false, showClues: false, maxTries: 3, color: 0xef476f },
];
