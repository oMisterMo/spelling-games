import { shuffle } from '../../core/random';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

/** Each distinct letter of `word` plus `extra` other random letters, shuffled. */
export function bankLetters(word: string, extra: number, random: () => number = Math.random): string[] {
  const unique = [...new Set(word)];
  const others = shuffle(ALPHABET.filter((letter) => !unique.includes(letter)), random).slice(0, extra);
  return shuffle([...unique, ...others], random);
}
