import { shuffle } from '../../core/random';

/** `copies` sets of the word's letters, mixed up. */
export function gridLetters(word: string, copies: number, random: () => number = Math.random): string[] {
  const letters: string[] = [];
  for (let c = 0; c < copies; c++) letters.push(...word);
  return shuffle(letters, random);
}

/** The column/row counts for `total` tiles that best match an area's width-to-height `ratio` with few empty cells. */
export function gridShape(total: number, ratio: number): { cols: number; rows: number } {
  let best = { cols: 1, rows: total };
  let bestScore = Infinity;
  for (let cols = 1; cols <= total; cols++) {
    const rows = Math.ceil(total / cols);
    const score = Math.abs(cols / rows - ratio) * 10 + (cols * rows - total) * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows };
    }
  }
  return best;
}

/** 1–3 stars for a finished word: time left, less a bit for every mistake and hint. */
export function starsFor(timeLeftFraction: number, mistakes: number, hints: number): number {
  const score = timeLeftFraction - Math.min(mistakes * 0.08, 0.6) - Math.min(hints * 0.1, 0.4);
  return score >= 0.55 ? 3 : score >= 0.25 ? 2 : 1;
}
