import type { WordLevel } from '../../data/wordLists';

export interface AbcOrderLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  wordCount: number;
  /** Include words that start with the same letter, so second letters matter. */
  sharedFirstLetter: boolean;
  /** Show an A–Z strip with each word's first letter highlighted. */
  showAlphabet: boolean;
  color: number;
}

export const LEVELS: AbcOrderLevel[] = [
  { words: 'easy', label: 'Easy', wordCount: 3, sharedFirstLetter: false, showAlphabet: true, color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', wordCount: 5, sharedFirstLetter: false, showAlphabet: true, color: 0x118ab2 },
  { words: 'hard', label: 'Hard', wordCount: 6, sharedFirstLetter: true, showAlphabet: false, color: 0x9b5de5 },
];
