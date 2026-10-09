import { shuffle } from '../../core/random';

const VOWELS = 'AEIOU';
const isVowel = (letter: string) => VOWELS.includes(letter);

/** Sound-alike swaps: each match of the pattern, one at a time, becomes the replacement. */
const SOUND_ALIKES: [RegExp, string][] = [
  [/PH/g, 'F'],
  [/F/g, 'PH'],
  [/CK/g, 'K'],
  [/C(?![HEIKY])/g, 'K'],
  [/C(?=[EIY])/g, 'S'],
  [/(?<!C)K(?![EIN])/g, 'C'],
  [/QU/g, 'KW'],
  [/X/g, 'KS'],
  [/EE/g, 'EA'],
  [/EA/g, 'EE'],
  [/OU/g, 'OW'],
  [/OW/g, 'OU'],
  [/OO/g, 'OU'],
  [/IE/g, 'EI'],
  [/EI/g, 'IE'],
  [/AI/g, 'AY'],
  [/AY(?=.)/g, 'AI'],
  [/TION/g, 'SHUN'],
  [/WH/g, 'W'],
  [/(?<=[AEIOU])S(?=[AEIOU])/g, 'Z'],
  [/LE$/g, 'EL'],
  [/ER$/g, 'UR'],
  [/(?<![AEIOU])Y$/g, 'IE'],
  [/MB$/g, 'M'],
];

function replaceAt(word: string, index: number, length: number, replacement: string): string {
  return word.slice(0, index) + replacement + word.slice(index + length);
}

/** The mistakes children really make: sound-alike letters, doubled or undoubled letters, and two letters swapped. */
function likelyMistakes(word: string): string[] {
  const result: string[] = [];
  for (const [pattern, replacement] of SOUND_ALIKES) {
    for (const match of word.matchAll(pattern)) result.push(replaceAt(word, match.index, match[0].length, replacement));
  }
  for (let i = 1; i < word.length; i++) {
    const letter = word[i];
    const previous = word[i - 1];
    if (letter === previous) {
      result.push(replaceAt(word, i, 1, '')); // BALL -> BAL
    } else {
      // Keep the first letter where it is, so the word still looks nearly right.
      if (i > 1) result.push(replaceAt(word, i - 1, 2, letter + previous)); // FROG -> FORG
      // Double a consonant only where a double could really be: after a vowel, and before one or at the end.
      const next = word[i + 1];
      if (!isVowel(letter) && !'WY'.includes(letter) && isVowel(previous) && (next === undefined || isVowel(next))) {
        result.push(replaceAt(word, i, 1, letter + letter)); // CAT -> CATT
      }
    }
  }
  return result;
}

/** A fallback for words with few likely mistakes: one vowel changed for another. */
function vowelMistakes(word: string): string[] {
  const result: string[] = [];
  [...word].forEach((letter, i) => {
    if (!isVowel(letter)) return;
    for (const vowel of VOWELS) if (vowel !== letter) result.push(replaceAt(word, i, 1, vowel));
  });
  return result;
}

/**
 * Up to `count` different wrong spellings of `word` (uppercase), likeliest
 * mistakes first. Anything in `avoid` is left out, so a "wrong" spelling is
 * never another word from the lists. May return fewer for very short words.
 */
export function misspellings(word: string, count: number, avoid: ReadonlySet<string> = new Set(), random: () => number = Math.random): string[] {
  const candidates = [...shuffle(likelyMistakes(word), random), ...shuffle(vowelMistakes(word), random)];
  const unique = [...new Set(candidates)].filter((text) => text !== word && !avoid.has(text));
  return unique.slice(0, count);
}

export interface SpellingChoice {
  text: string;
  correct: boolean;
}

/** The right spelling mixed in with `count - 1` wrong ones; null when the word has too few misspellings. */
export function makeChoices(word: string, count: number, avoid: ReadonlySet<string> = new Set(), random: () => number = Math.random): SpellingChoice[] | null {
  const wrong = misspellings(word, count - 1, avoid, random);
  if (wrong.length < count - 1) return null;
  return shuffle([{ text: word, correct: true }, ...wrong.map((text) => ({ text, correct: false }))], random);
}
