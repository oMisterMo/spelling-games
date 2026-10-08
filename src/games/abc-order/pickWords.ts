import { shuffle } from '../../core/random';

export interface PickOptions {
  /** Uppercase A–Z words to choose from. */
  words: string[];
  count: number;
  /**
   * false: every word starts with a different letter.
   * true: include at least one pair sharing a first letter (when the list has one),
   * so the player has to compare second letters.
   */
  sharedFirstLetter: boolean;
  random?: () => number;
}

/** Up to `count` words in a shuffled order that is never already alphabetical. */
export function pickWords({ words, count, sharedFirstLetter, random = Math.random }: PickOptions): string[] {
  const pool = shuffle(words, random);
  const chosen: string[] = [];

  if (sharedFirstLetter) {
    const byLetter = new Map<string, string[]>();
    for (const word of pool) byLetter.set(word[0], [...(byLetter.get(word[0]) ?? []), word]);
    const pairs = [...byLetter.values()].filter((group) => group.length >= 2);
    if (pairs.length > 0 && count >= 2) {
      chosen.push(...pairs[Math.floor(random() * pairs.length)].slice(0, 2));
    }
    for (const word of pool) {
      if (chosen.length >= count) break;
      if (!chosen.includes(word)) chosen.push(word);
    }
  } else {
    const usedLetters = new Set<string>();
    for (const word of pool) {
      if (chosen.length >= count) break;
      if (usedLetters.has(word[0])) continue;
      usedLetters.add(word[0]);
      chosen.push(word);
    }
  }

  if (chosen.length < 2) return chosen;
  let order = shuffle(chosen, random);
  while (isAlphabetical(order)) order = shuffle(chosen, random);
  return order;
}

export function isAlphabetical(words: readonly string[]): boolean {
  return words.every((word, i) => i === 0 || words[i - 1] <= word);
}
