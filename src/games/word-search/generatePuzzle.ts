import { shuffle } from '../../core/random';

/** A step through the grid: [rows, cols]. [0, 1] reads left to right. */
export type Direction = readonly [dRow: number, dCol: number];

export const RIGHT: Direction = [0, 1];
export const DOWN: Direction = [1, 0];
export const DOWN_RIGHT: Direction = [1, 1];
export const UP_RIGHT: Direction = [-1, 1];
export const ALL_DIRECTIONS: readonly Direction[] = [
  [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
];

export interface Placement {
  word: string;
  row: number;
  col: number;
  direction: Direction;
}

export interface Puzzle {
  size: number;
  /** grid[row][col] is a single uppercase letter. */
  grid: string[][];
  placements: Placement[];
}

export interface PuzzleOptions {
  /** Uppercase A–Z words to choose from. */
  words: string[];
  size: number;
  wordCount: number;
  directions: readonly Direction[];
  random?: () => number;
}

/**
 * Hides up to `wordCount` random words from `words` in a size×size grid.
 * A word that doesn't fit anywhere is skipped and the next one is tried, so
 * fewer words are placed only if the list runs out.
 */
export function generatePuzzle({ words, size, wordCount, directions, random = Math.random }: PuzzleOptions): Puzzle {
  const cells: (string | null)[][] = Array.from({ length: size }, () => new Array<string | null>(size).fill(null));
  const placements: Placement[] = [];

  for (const word of shuffle(words.filter((w) => w.length <= size), random)) {
    if (placements.length >= wordCount) break;
    // Pick a direction first, then a spot in it. Picking from all spots at once
    // would rarely choose diagonals, which fit in far fewer places.
    const spotsByDirection = directions
      .map((direction) => findSpots(cells, word, direction))
      .filter((spots) => spots.length > 0);
    if (spotsByDirection.length === 0) continue;

    const spots = spotsByDirection[Math.floor(random() * spotsByDirection.length)];
    const spot = spots[Math.floor(random() * spots.length)];
    const [dRow, dCol] = spot.direction;
    for (let i = 0; i < word.length; i++) {
      cells[spot.row + dRow * i][spot.col + dCol * i] = word[i];
    }
    placements.push(spot);
  }

  const grid = cells.map((row) => row.map((letter) => letter ?? randomLetter(random)));
  return { size, grid, placements };
}

/** Every position where `word` fits in `direction`, sharing only matching letters. */
function findSpots(cells: (string | null)[][], word: string, direction: Direction): Placement[] {
  const size = cells.length;
  const spots: Placement[] = [];
  const [dRow, dCol] = direction;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const endRow = row + dRow * (word.length - 1);
      const endCol = col + dCol * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

      let fits = true;
      for (let i = 0; i < word.length && fits; i++) {
        const existing = cells[row + dRow * i][col + dCol * i];
        fits = existing === null || existing === word[i];
      }
      if (fits) spots.push({ word, row, col, direction });
    }
  }
  return spots;
}

function randomLetter(random: () => number): string {
  return String.fromCharCode(65 + Math.floor(random() * 26));
}
