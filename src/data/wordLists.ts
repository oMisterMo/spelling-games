/**
 * Words used by the spelling games. Edit these lists freely.
 *
 * Each entry is either a plain word or an object with a clue:
 *   'cat'
 *   { word: 'cat', clue: 'A pet that says meow', picture: '🐱' }
 *
 * - Every game can use every word. Crossword only uses words that have a `clue`.
 * - `picture` is optional (usually one emoji) and is shown next to the clue on easier levels.
 * - Case doesn't matter, and anything that isn't a letter (spaces, hyphens) is removed from the word.
 * - Duplicates are ignored, and a game skips words that don't fit it.
 *
 * Levels roughly match ages: easy 4–6, medium 7–9, hard 10–12.
 */
export const WORD_LISTS: Record<WordLevel, WordListEntry[]> = {
  easy: [
    { word: 'cat', clue: 'A pet that says meow', picture: '🐱' },
    { word: 'dog', clue: 'A pet that barks', picture: '🐶' },
    { word: 'sun', clue: 'It shines in the sky in the day', picture: '🌞' },
    { word: 'hat', clue: 'You wear it on your head', picture: '🎩' },
    { word: 'bus', clue: 'A big car that carries lots of people', picture: '🚌' },
    { word: 'pig', clue: 'A pink farm animal that oinks', picture: '🐷' },
    { word: 'cup', clue: 'You drink from it', picture: '☕' },
    { word: 'bed', clue: 'You sleep in it', picture: '🛏️' },
    { word: 'fox', clue: 'An orange animal with a bushy tail', picture: '🦊' },
    { word: 'egg', clue: 'A hen lays it', picture: '🥚' },
    { word: 'fish', clue: 'It swims in water', picture: '🐟' },
    { word: 'frog', clue: 'A green animal that hops and croaks', picture: '🐸' },
    { word: 'ball', clue: 'You kick or throw it', picture: '⚽' },
    { word: 'cake', clue: 'A sweet treat for a birthday', picture: '🎂' },
    { word: 'milk', clue: 'A white drink from a cow', picture: '🥛' },
    { word: 'star', clue: 'It twinkles in the night sky', picture: '⭐' },
    { word: 'tree', clue: 'It has leaves and branches', picture: '🌳' },
    { word: 'duck', clue: 'A bird that says quack', picture: '🦆' },
    { word: 'bird', clue: 'It has feathers and can fly', picture: '🐦' },
    { word: 'moon', clue: 'It shines in the sky at night', picture: '🌙' },
  ],
  medium: [
    { word: 'apple', clue: 'A red or green fruit', picture: '🍎' },
    { word: 'happy', clue: 'How you feel when you smile', picture: '😊' },
    { word: 'zebra', clue: 'A horse-like animal with black and white stripes', picture: '🦓' },
    { word: 'train', clue: 'It runs on tracks', picture: '🚂' },
    { word: 'house', clue: 'A building people live in', picture: '🏠' },
    { word: 'plant', clue: 'It grows in soil and needs water', picture: '🌱' },
    { word: 'cloud', clue: 'A white, fluffy thing in the sky', picture: '☁️' },
    { word: 'tiger', clue: 'A big orange cat with stripes', picture: '🐯' },
    { word: 'pizza', clue: 'A round food with cheese on top', picture: '🍕' },
    { word: 'smile', clue: 'What your mouth does when you are happy', picture: '😃' },
    { word: 'rabbit', clue: 'A furry animal with long ears', picture: '🐰' },
    { word: 'garden', clue: 'A place where flowers and vegetables grow', picture: '🌻' },
    { word: 'school', clue: 'Where you go to learn', picture: '🏫' },
    { word: 'orange', clue: 'A fruit and a color', picture: '🍊' },
    { word: 'monkey', clue: 'An animal that swings in trees', picture: '🐒' },
    { word: 'pencil', clue: 'You write and draw with it', picture: '✏️' },
    { word: 'yellow', clue: 'The color of a banana', picture: '🍌' },
    { word: 'window', clue: 'A glass opening in a wall', picture: '🪟' },
    { word: 'friend', clue: 'Someone you like to play with', picture: '🤝' },
    { word: 'summer', clue: 'The hottest season of the year', picture: '🏖️' },
  ],
  hard: [
    { word: 'elephant', clue: 'The largest land animal, with a long trunk', picture: '🐘' },
    { word: 'dinosaur', clue: 'A giant reptile that lived long ago', picture: '🦖' },
    { word: 'umbrella', clue: 'It keeps you dry in the rain', picture: '☂️' },
    { word: 'birthday', clue: 'The day you were born, celebrated every year', picture: '🎉' },
    { word: 'calendar', clue: 'It shows the days, weeks and months', picture: '📅' },
    { word: 'mountain', clue: 'A very tall hill', picture: '⛰️' },
    { word: 'treasure', clue: 'Gold and jewels hidden by pirates', picture: '💰' },
    { word: 'bicycle', clue: 'It has two wheels and pedals', picture: '🚲' },
    { word: 'kangaroo', clue: 'An Australian animal that hops and has a pouch', picture: '🦘' },
    { word: 'sandwich', clue: 'Food made with two slices of bread', picture: '🥪' },
    { word: 'dolphin', clue: 'A clever sea animal that clicks and whistles', picture: '🐬' },
    { word: 'library', clue: 'A place where you can borrow books', picture: '📚' },
    { word: 'volcano', clue: 'A mountain that can erupt with lava', picture: '🌋' },
    { word: 'penguin', clue: 'A bird that swims but cannot fly', picture: '🐧' },
    { word: 'rainbow', clue: 'A colorful arc in the sky after rain', picture: '🌈' },
    { word: 'butterfly', clue: 'An insect with big, colorful wings', picture: '🦋' },
    { word: 'chocolate', clue: 'A sweet brown treat made from cocoa', picture: '🍫' },
    { word: 'adventure', clue: 'An exciting journey or experience', picture: '🧭' },
  ],
};

export type WordLevel = 'easy' | 'medium' | 'hard';

export interface WordInfo {
  word: string;
  clue?: string;
  picture?: string;
}

export type WordListEntry = string | WordInfo;

/** The entries for a level with each word uppercased, non-letters removed, and duplicate words dropped. */
export function getWordInfos(level: WordLevel): WordInfo[] {
  const seen = new Set<string>();
  const result: WordInfo[] = [];
  for (const entry of WORD_LISTS[level]) {
    const info = typeof entry === 'string' ? { word: entry } : entry;
    const word = info.word.toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 2 || seen.has(word)) continue;
    seen.add(word);
    result.push({ ...info, word });
  }
  return result;
}

/** Just the cleaned-up words for a level. */
export function getWords(level: WordLevel): string[] {
  return getWordInfos(level).map((info) => info.word);
}
