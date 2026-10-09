import { shuffle } from '../../core/random';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const isVowel = (letter: string) => 'AEIOU'.includes(letter);

/**
 * The letters to fly around for `word`: each of its letters (repeats included)
 * plus `extra` letters that aren't in it, shuffled. With two or more extras one
 * is a vowel, so the wrong letters aren't all consonants.
 */
export function swarmLetters(word: string, extra: number, random: () => number = Math.random): string[] {
  const others = shuffle(ALPHABET.filter((letter) => !word.includes(letter)), random);
  const vowels = others.filter(isVowel);
  const consonants = others.filter((letter) => !isVowel(letter));
  const extras = extra >= 2 && vowels.length > 0 ? [vowels[0], ...consonants.slice(0, extra - 1)] : consonants.slice(0, extra);
  return shuffle([...word, ...extras], random);
}
