import { shuffle } from '../../core/random';

export interface ClueWord {
  /** Uppercase A–Z. */
  word: string;
  clue: string;
  picture?: string;
}

export interface CrosswordEntry extends ClueWord {
  /** The clue number shown in the word's first cell. */
  number: number;
  row: number;
  col: number;
  across: boolean;
}

export interface Crossword {
  rows: number;
  cols: number;
  /** grid[row][col] is the answer letter, or null for a blank square. */
  grid: (string | null)[][];
  /** Sorted by number, with across before down. */
  entries: CrosswordEntry[];
}

export interface CrosswordOptions {
  words: ClueWord[];
  wordCount: number;
  /** Maximum rows and columns. */
  maxSize: number;
  /** Layouts to try; the one with the most words (then the smallest area) wins. */
  attempts?: number;
  random?: () => number;
}

interface Placed {
  info: ClueWord;
  row: number;
  col: number;
  across: boolean;
}

interface CellState {
  letter: string;
  across: boolean;
  down: boolean;
}

/**
 * Builds a connected crossword of up to `wordCount` words. Every word crosses
 * another, and words never touch side by side or end to end, so each run of
 * letters in the grid is exactly one word.
 */
export function generateCrossword({ words, wordCount, maxSize, attempts = 30, random = Math.random }: CrosswordOptions): Crossword {
  const usable = words.filter((w) => w.word.length >= 2 && w.word.length <= maxSize);
  let best: Placed[] = [];
  let bestArea = Infinity;
  for (let i = 0; i < attempts; i++) {
    const placed = tryLayout(usable, wordCount, maxSize, random);
    const area = bounds(placed).area;
    if (placed.length > best.length || (placed.length === best.length && area < bestArea)) {
      best = placed;
      bestArea = area;
    }
    if (best.length === wordCount && i >= attempts / 3) break;
  }
  return build(best);
}

function tryLayout(words: ClueWord[], wordCount: number, maxSize: number, random: () => number): Placed[] {
  const pool = shuffle(words, random);
  const placed: Placed[] = [];
  if (pool.length === 0 || wordCount < 1) return placed;

  const cells = new Map<string, CellState>();
  place(cells, placed, { info: pool[0], row: 0, col: 0, across: random() < 0.5 });
  let remaining = pool.slice(1);

  let progress = true;
  while (placed.length < wordCount && progress) {
    progress = false;
    for (const info of remaining) {
      const spots = findSpots(cells, placed, info.word, maxSize);
      if (spots.length === 0) continue;
      // Prefer spots that cross the most words; they make tighter puzzles.
      const most = Math.max(...spots.map((s) => s.crossings));
      const top = spots.filter((s) => s.crossings === most);
      const spot = top[Math.floor(random() * top.length)];
      place(cells, placed, { info, row: spot.row, col: spot.col, across: spot.across });
      remaining = remaining.filter((w) => w !== info);
      progress = true;
      break;
    }
  }
  return placed;
}

function findSpots(cells: Map<string, CellState>, placed: Placed[], word: string, maxSize: number) {
  const spots: { row: number; col: number; across: boolean; crossings: number }[] = [];
  const seen = new Set<string>();
  const b = bounds(placed);

  for (const [key, cell] of cells) {
    const [r, c] = key.split(',').map(Number);
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== cell.letter) continue;
      for (const across of [true, false]) {
        if (across ? cell.across : cell.down) continue;
        const row = across ? r : r - i;
        const col = across ? c - i : c;
        const id = `${row},${col},${across}`;
        if (seen.has(id)) continue;
        seen.add(id);

        const endRow = across ? row : row + word.length - 1;
        const endCol = across ? col + word.length - 1 : col;
        const height = Math.max(b.maxRow, endRow) - Math.min(b.minRow, row) + 1;
        const width = Math.max(b.maxCol, endCol) - Math.min(b.minCol, col) + 1;
        if (height > maxSize || width > maxSize) continue;

        const crossings = countCrossings(cells, word, row, col, across);
        if (crossings > 0) spots.push({ row, col, across, crossings });
      }
    }
  }
  return spots;
}

/** How many existing words `word` would cross here, or -1 if it can't go here. */
function countCrossings(cells: Map<string, CellState>, word: string, row: number, col: number, across: boolean): number {
  const dRow = across ? 0 : 1;
  const dCol = across ? 1 : 0;
  const at = (r: number, c: number) => cells.get(`${r},${c}`);

  // Nothing directly before or after the word.
  if (at(row - dRow, col - dCol) || at(row + dRow * word.length, col + dCol * word.length)) return -1;

  let crossings = 0;
  for (let i = 0; i < word.length; i++) {
    const r = row + dRow * i;
    const c = col + dCol * i;
    const cell = at(r, c);
    if (cell) {
      if (cell.letter !== word[i] || (across ? cell.across : cell.down)) return -1;
      crossings++;
    } else if (at(r + dCol, c + dRow) || at(r - dCol, c - dRow)) {
      // A new letter can't sit beside an existing one.
      return -1;
    }
  }
  return crossings;
}

function place(cells: Map<string, CellState>, placed: Placed[], p: Placed): void {
  for (let i = 0; i < p.info.word.length; i++) {
    const key = p.across ? `${p.row},${p.col + i}` : `${p.row + i},${p.col}`;
    const cell = cells.get(key) ?? { letter: p.info.word[i], across: false, down: false };
    if (p.across) cell.across = true;
    else cell.down = true;
    cells.set(key, cell);
  }
  placed.push(p);
}

function bounds(placed: Placed[]) {
  if (placed.length === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0, area: 0 };
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (const p of placed) {
    const last = p.info.word.length - 1;
    minRow = Math.min(minRow, p.row);
    minCol = Math.min(minCol, p.col);
    maxRow = Math.max(maxRow, p.across ? p.row : p.row + last);
    maxCol = Math.max(maxCol, p.across ? p.col + last : p.col);
  }
  return { minRow, maxRow, minCol, maxCol, area: (maxRow - minRow + 1) * (maxCol - minCol + 1) };
}

function build(placed: Placed[]): Crossword {
  if (placed.length === 0) return { rows: 0, cols: 0, grid: [], entries: [] };
  const b = bounds(placed);
  const rows = b.maxRow - b.minRow + 1;
  const cols = b.maxCol - b.minCol + 1;
  const grid: (string | null)[][] = Array.from({ length: rows }, () => new Array<string | null>(cols).fill(null));

  const shifted = placed.map((p) => ({ ...p, row: p.row - b.minRow, col: p.col - b.minCol }));
  for (const p of shifted) {
    for (let i = 0; i < p.info.word.length; i++) {
      grid[p.across ? p.row : p.row + i][p.across ? p.col + i : p.col] = p.info.word[i];
    }
  }

  // Number start cells in reading order; an across and a down word can share a number.
  const starts = [...new Set(shifted.map((p) => p.row * cols + p.col))].sort((a, z) => a - z);
  const entries = shifted
    .map((p) => ({ ...p.info, row: p.row, col: p.col, across: p.across, number: starts.indexOf(p.row * cols + p.col) + 1 }))
    .sort((a, z) => a.number - z.number || Number(z.across) - Number(a.across));
  return { rows, cols, grid, entries };
}
