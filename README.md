# Spelling Games

Spelling games for kids ages 4–12, built with [PixiJS](https://pixijs.com/) v8, TypeScript and Vite.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
```

## Games

| Game | Status |
| --- | --- |
| Word Search | Playable |
| Crossword | Playable |
| ABC Order | Playable |
| Word Scramble | Playable |
| Missing Letters | Playable |
| Spelling Bee | Playable |
| Speedy Speller | Playable |
| Balloon Pop | Playable |

## Updating the words

All games get their words from **`src/data/wordLists.ts`**. There are three lists:

| List | Ages |
| --- | --- |
| `easy` | 4–6 |
| `medium` | 7–9 |
| `hard` | 10–12 |

Each entry is either a plain word or a word with a clue:

```ts
'cat',
{ word: 'cat', clue: 'A pet that says meow', picture: '🐱' },
```

- **Crossword** only uses words that have a `clue`. The other games use every word.
- **`picture`** is optional, usually one emoji. It's shown next to the clue on the easier Crossword, Word Scramble and Missing Letters levels, so children who can't read yet can still play.

You don't need to tidy the words up: capitals don't matter, spaces and punctuation are removed, and duplicates are ignored. A game skips any word that doesn't fit it, such as a word longer than a word search grid.

## Word Search

### Levels

| Level | Grid | Words | Directions |
| --- | --- | --- | --- |
| Easy | 6 × 6 | 4 | Left to right and top to bottom |
| Medium | 8 × 8 | 6 | Adds diagonals |
| Hard | 10 × 10 | 8 | Any direction, including backwards |

To change the grid size, word count or directions for a level, edit `src/games/word-search/levels.ts`.

### How to play

- **Select a word:** drag from its first letter to its last, or tap the first letter and then the last. Selections snap to straight and diagonal lines. Selecting a word backwards counts too.
- **Deselect:** tap a chosen letter again.
- **Found words** get a colored highlight, their letters bounce, and they're crossed off the list in the same color. A wrong selection flashes red.
- **Winning:** once every word is found, a "Great job!" screen offers **Play Again** or **Levels**.
- **Screen sizes:** the grid sits beside the word list on wide screens and above it on tall ones.

### Things to know

- **Hard can come up one word short:** it occasionally hides 7 words instead of 8, because its list is small. Adding more words to `hard` makes this rarer.
- **Accidental repeats:** if the random filler letters happen to spell a word from the list again, finding that copy also counts.

## ABC Order

### Levels

| Level | Words | Letter strip hint | Words that start with the same letter |
| --- | --- | --- | --- |
| Easy | 3 | Yes | Never |
| Medium | 5 | Yes | Never |
| Hard | 6 | No | At least one pair, so second letters matter |

To change these settings, edit `src/games/abc-order/levels.ts`.

### How to play

- **Placing words:** drag a word into a numbered slot, or tap it to send it to the next empty slot. Tap a placed word to send it back. Dropping a word on a filled slot swaps the two.
- **Letter strip:** on Easy and Medium, an A–Z strip at the top circles each word's first letter.
- **Checking:** once every slot is full, correct words turn green and lock in place. Wrong words flash red, shake, and go back to the tray for another try.
- **Winning:** when all the words are in order, a "Great job!" screen offers **Play Again** or **Levels**.

## Crossword

### Levels

| Level | Words | Max grid | First letters filled in | Keyboard | Pictures |
| --- | --- | --- | --- | --- | --- |
| Easy | 4 | 7 × 7 | Yes | Only the current word's letters | Yes |
| Medium | 6 | 10 × 10 | No | A–Z | Yes |
| Hard | 8 | 13 × 13 | No | A–Z | No |

To change these settings, edit `src/games/crossword/levels.ts`. A new crossword is generated every game.

### How to play

- **Choosing a word:** tap a square, or use the ◀ ▶ buttons next to the clue. Tap the highlighted square again to switch between across and down.
- **Typing:** use the on-screen keyboard or a real keyboard. Backspace deletes, and Enter or Tab jumps to the next word.
- **Checking:** each word is checked as soon as it's filled in. A correct word turns green and the game moves on to the next one. Wrong letters flash red and are cleared so the player can try again.
- **Winning:** solving every word shows the "Great job!" screen.

## Word Scramble

### Levels

| Level | Words per game | Longest word | Picture | Clue |
| --- | --- | --- | --- | --- |
| Easy | 5 | 5 letters | Yes | Yes |
| Medium | 5 | 7 letters | Yes | Yes |
| Hard | 6 | 10 letters | No | Yes |

To change these settings, edit `src/games/word-scramble/levels.ts`. Words without a clue show "Unscramble the letters" instead.

### How to play

- **Placing letters:** tap a letter to send it to the next empty slot, drag it to any slot, or type it on a keyboard. Tap a placed letter, or press Backspace, to send it back.
- **Hint** fills in the next correct letter. **Shuffle** mixes up the remaining letters.
- **Checking:** when every slot is full, correct letters turn green and lock. Wrong letters flash red and go back for another try.
- **Winning:** after the last word, a "Great job!" screen offers **Play Again** or **Levels**.

## Missing Letters

### Levels

| Level | Words per game | Missing letters | Letter choices | First letter always shown | Picture |
| --- | --- | --- | --- | --- | --- |
| Easy | 6 | 1 | 3 | Yes | Yes |
| Medium | 6 | 2 | 5 | Yes | Yes |
| Hard | 6 | 3 | 6 | No | No |

To change these settings, edit `src/games/missing-letters/levels.ts`. Wrong choices are chosen to look like the answer: other vowels when a vowel is missing, other consonants when a consonant is.

### How to play

- **Filling in letters:** tap a letter choice, or type it, to put it in the highlighted (yellow) blank. Tap a different blank, or use the arrow keys, to fill that one instead.
- **Feedback:** a right letter flies into place and turns green. A wrong one flashes red and shakes.
- **Hint** fills the highlighted blank.
- **Winning:** after the last word, a "Great job!" screen offers **Play Again** or **Levels**.

## Spelling Bee

### Levels

| Level | Words per game | Keyboard | First letter filled in | Letters spoken as typed | Picture | Clue |
| --- | --- | --- | --- | --- | --- | --- |
| Easy | 5 | The word's letters plus 3 others | Yes | Yes | Yes | Yes |
| Medium | 6 | A–Z | No | No | Yes | No |
| Hard | 6 | A–Z | No | No | No | No |

To change these settings, edit `src/games/spelling-bee/levels.ts`. Each word gets 3 tries.

### How to play

- **Hearing the word:** it's spoken aloud when the round starts. Tap **🔊 Hear it** (or press Enter) to hear it again, or **🐢 Slowly** to hear it slowly.
- **Spelling:** type the word with the on-screen keyboard or a real keyboard. Tap a box, or use the arrow keys, to move where letters go. Backspace deletes.
- **Checking:** the word is checked as soon as every box is filled. Right letters turn green and stay. Wrong letters flash red and are cleared for another try.
- **Out of tries:** after 3 wrong tries, the answer is shown (the missed letters in orange) and spoken, then the next word starts.
- **Winning:** the end screen shows how many words were spelled on the first try.

### Sound

Speech uses the browser's built-in voices, so the voice depends on the device. Some browsers have no speech support. In that case the Hear it buttons are hidden, the picture and clue are always shown, and only words that have a clue are used.

## Balloon Pop

### Levels

| Level | Words per game | Balloons | Longest word | First letter shown | Picture |
| --- | --- | --- | --- | --- | --- |
| Easy | 5 | 7 | 5 letters | Yes | Yes |
| Medium | 6 | 6 | 8 letters | No | Yes |
| Hard | 6 | 5 | 10 letters | No | No |

To change these settings, edit `src/games/balloon-pop/levels.ts`. Words without a clue show "Guess the hidden word" instead.

### How to play

- **Guessing:** tap a letter on the on-screen keyboard, or type it. A letter that's in the word turns green and appears everywhere it belongs.
- **Wrong letters** fade out and pop one balloon. Each letter can only be tried once.
- **Out of balloons:** the animal drops gently onto the hill, the word is shown (the missed letters in orange) and spoken, then the next word starts.
- **Winning:** the end screen shows how many words were guessed before the balloons ran out.

## Project structure

```
src/
  main.ts                 Creates the Pixi app and opens the menu
  core/                   Scene base class, SceneManager, Tweens (animations), shuffle, speech
  scenes/                 Game selection menu and the shared level select screen
  games/registry.ts       The list of games shown on the menu
  games/word-search/      Word Search: game scene, puzzle generator, level settings
  games/abc-order/        ABC Order: game scene, word picker, level settings
  games/crossword/        Crossword: game scene, crossword generator, level settings
  games/word-scramble/    Word Scramble: game scene, scrambler, level settings
  games/missing-letters/  Missing Letters: game scene, puzzle maker, level settings
  games/spelling-bee/     Spelling Bee: game scene, letter bank, level settings
  games/balloon-pop/      Balloon Pop: game scene, balloon drawing, sounds, level settings
  data/wordLists.ts       Words used by all games
  ui/                     Shared Button, Tile, ClueCard, LetterKeyboard, win screen and theme (fonts, colors)
```

## Adding a game

1. Create a `Scene` subclass in its own folder, e.g. `src/games/crossword/CrosswordGame.ts`. Build its display objects in the constructor and position them in `resize(width, height)`.
2. For levels, add a `levels.ts` and a `levelSelect.ts` that builds a `LevelSelectScene`. Word Search and ABC Order both follow this pattern.
3. In `src/games/registry.ts`, point that game's `create` at your level select (or scene) instead of `PlaceholderGame`.
4. Get words with `getWords(level)` from `src/data/wordLists.ts`. Use `Tweens` for animation and `WinOverlay` for the end screen.

## Debugging

In dev mode the app is available as `globalThis.__PIXI_APP__`, so the [PixiJS DevTools](https://pixijs.io/devtools/) browser extension can inspect the scene graph.
