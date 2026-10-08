import { shuffle } from '../../core/random';

const ALPHABET = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const isVowel = (letter: string) => 'AEIOU'.includes(letter);

export interface PuzzleOptions {
  /** How many letters to hide. Always leaves at least one other letter showing. */
  missing: number;
  /** Total letter choices offered (the answers plus distractors). */
  choices: number;
  /** Never hide the first letter. */
  keepFirstLetter: boolean;
}

export interface MissingLettersPuzzle {
  word: string;
  /** Hidden letter positions, in order. */
  blanks: number[];
  /** Letters to choose from: every hidden letter plus distractors, shuffled. */
  choices: string[];
}

export function makePuzzle(word: string, options: PuzzleOptions, random: () => number = Math.random): MissingLettersPuzzle {
  const start = options.keepFirstLetter ? 1 : 0;
  const count = Math.max(1, Math.min(options.missing, word.length - start - 1));
  const positions = [...word].map((_, i) => i).slice(start);
  const blanks = shuffle(positions, random)
    .slice(0, count)
    .sort((a, b) => a - b);

  // Distractors look like the answers: other vowels for vowel blanks, other consonants otherwise.
  const answers = blanks.map((i) => word[i]);
  const others = ALPHABET.filter((letter) => !answers.includes(letter));
  const wantVowels = answers.filter(isVowel).length * 2 >= answers.length;
  const distractors = [
    ...shuffle(others.filter((l) => isVowel(l) === wantVowels), random),
    ...shuffle(others.filter((l) => isVowel(l) !== wantVowels), random),
  ].slice(0, Math.max(0, options.choices - answers.length));

  return { word, blanks, choices: shuffle([...answers, ...distractors], random) };
}
