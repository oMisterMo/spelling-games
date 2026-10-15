import type { WordLevel } from '../../data/wordLists';
import { ALL_DIRECTIONS, DOWN, DOWN_RIGHT, RIGHT, type Direction } from './generatePuzzle';

export interface WordSearchLevel {
  /** Which list in src/data/wordLists.ts to draw words from. */
  words: WordLevel;
  label: string;
  size: number;
  wordCount: number;
  /** Directions words may be hidden in. */
  directions: readonly Direction[];
  color: number;
}

export const LEVELS: WordSearchLevel[] = [
  { words: 'easy', label: 'Easy', size: 6, wordCount: 4, directions: [RIGHT, DOWN], color: 0x06d6a0 },
  { words: 'medium', label: 'Medium', size: 8, wordCount: 6, directions: [RIGHT, DOWN, DOWN_RIGHT], color: 0x118ab2 },
  { words: 'hard', label: 'Hard', size: 10, wordCount: 8, directions: ALL_DIRECTIONS, color: 0x9b5de5 },
];
