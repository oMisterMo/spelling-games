import { shuffle } from '../../core/random';

/** The word's letters in a random order that doesn't spell the word (when that's possible). */
export function scrambleWord(word: string, random: () => number = Math.random): string[] {
  const letters = [...word];
  if (new Set(letters).size < 2) return letters;
  let result = shuffle(letters, random);
  while (result.join('') === word) result = shuffle(letters, random);
  return result;
}

/** Up to `count` random words that fit and can actually be scrambled. */
export function pickRounds<T extends { word: string }>(
  words: readonly T[],
  count: number,
  maxLength: number,
  random: () => number = Math.random,
): T[] {
  const usable = words.filter((w) => w.word.length <= maxLength && new Set(w.word).size >= 2);
  return shuffle(usable, random).slice(0, count);
}
