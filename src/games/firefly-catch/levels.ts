import type { WordLevel } from '../../data/wordLists';

export interface FireflyCatchLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  /** Words in one game. */
  rounds: number;
  /** Fireflies carrying letters that aren't in the word. */
  extraLetters: number;
  /** How far a firefly flies each second, as a fraction of the field's shorter side. */
  speed: number;
  /** Show the word faintly in the boxes, so it only has to be copied. */
  showWord: boolean;
  /** Wrong catches on one letter before the right firefly starts to pulse. */
  hintAfter: number;
  /** Longer words are skipped so the fireflies stay big enough to tap. */
  maxLength: number;
  showPictures: boolean;
  showClues: boolean;
  color: number;
}

export const LEVELS: FireflyCatchLevel[] = [
  { words: 'easy', label: 'Easy', rounds: 5, extraLetters: 2, speed: 0.09, showWord: true, hintAfter: 1, maxLength: 5, showPictures: true, showClues: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', rounds: 6, extraLetters: 3, speed: 0.14, showWord: false, hintAfter: 2, maxLength: 7, showPictures: true, showClues: true, color: 0xf78c6b },
  { words: 'hard', label: 'Hard', rounds: 6, extraLetters: 5, speed: 0.2, showWord: false, hintAfter: 3, maxLength: 9, showPictures: false, showClues: true, color: 0x9b5de5 },
];
