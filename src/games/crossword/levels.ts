import type { WordLevel } from '../../data/wordLists';

export interface CrosswordLevel {
  /** Which list in src/data/wordLists.ts to draw words from (only words with clues are used). */
  words: WordLevel;
  label: string;
  wordCount: number;
  /** Maximum rows and columns of the grid. */
  maxSize: number;
  /** Fill in the first letter of every word to start. */
  revealFirstLetter: boolean;
  /** true: the on-screen keyboard only has the current word's letters. false: A–Z. */
  letterBank: boolean;
  /** Show each clue's picture. */
  showPictures: boolean;
  color: number;
}

export const LEVELS: CrosswordLevel[] = [
  { words: 'easy', label: 'Easy', wordCount: 4, maxSize: 7, revealFirstLetter: true, letterBank: true, showPictures: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', wordCount: 6, maxSize: 10, revealFirstLetter: false, letterBank: false, showPictures: true, color: 0x118ab2 },
  { words: 'hard', label: 'Hard', wordCount: 8, maxSize: 13, revealFirstLetter: false, letterBank: false, showPictures: false, color: 0x9b5de5 },
];
