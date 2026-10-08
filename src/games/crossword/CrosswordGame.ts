import { Container, FederatedPointerEvent, Graphics, Rectangle, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { Tweens } from '../../core/Tweens';
import { getWordInfos } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { BACKSPACE, LetterKeyboard } from '../../ui/LetterKeyboard';
import { DARK, EMOJI_FONT_FAMILY, FONT_FAMILY } from '../../ui/theme';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { generateCrossword, type ClueWord, type Crossword, type CrosswordEntry } from './generateCrossword';
import { crosswordLevelSelect } from './levelSelect';
import type { CrosswordLevel } from './levels';

interface Cell {
  row: number;
  col: number;
}

const CELL_COLOR = 0xffffff;
const WORD_COLOR = 0xfff1c1;
const CURSOR_COLOR = 0xffd166;
const GIVEN_COLOR = 0xd7e3fc;
const SOLVED_COLOR = 0xb8f2d5;
const WRONG_COLOR = 0xffb3c1;

const keyOf = (c: Cell) => `${c.row},${c.col}`;
const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;

/**
 * Tap a square (or use ◀ ▶) to choose a word, then type it with the on-screen
 * keyboard or a real one. A finished word is checked right away: correct words
 * turn green, and wrong letters flash red and are cleared.
 */
export class CrosswordGame extends Scene {
  private puzzle: Crossword;
  private letters: (string | null)[][];
  private locked: boolean[][];
  private given = new Set<string>();
  private solved = new Set<number>();
  private wrong = new Set<string>();
  /** Indexes of the entries passing through each cell. */
  private cellEntries = new Map<string, number[]>();
  private current = 0;
  /** The square that typing goes into. (Not `cursor`, which Pixi's Container already has.) */
  private caret: Cell = { row: 0, col: 0 };
  /** True while wrong letters are shown; input is ignored. */
  private checking = false;
  private tweens = new Tweens();
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;

  private board = new Container();
  private cellsLayer = new Graphics();
  private letterTexts = new Map<string, Text>();
  private numberTexts: { text: Text; cell: Cell }[] = [];
  private cellSize = 0;

  private banner = new Container();
  private bannerBg = new Graphics();
  private bannerPicture: Text;
  private bannerLabel: Text;
  private bannerClue: Text;
  private prevButton: Button;
  private nextButton: Button;

  private keyboard: LetterKeyboard;

  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: CrosswordLevel) {
    super();
    const words = getWordInfos(level.words).filter((w): w is ClueWord => w.clue !== undefined);
    this.puzzle = generateCrossword({ words, wordCount: level.wordCount, maxSize: level.maxSize });
    const { grid, entries } = this.puzzle;
    this.letters = grid.map((row) => row.map(() => null));
    this.locked = grid.map((row) => row.map(() => false));

    entries.forEach((entry, i) => {
      for (const cell of this.cellsOf(entry)) {
        const key = keyOf(cell);
        this.cellEntries.set(key, [...(this.cellEntries.get(key) ?? []), i]);
      }
      if (level.revealFirstLetter) {
        this.letters[entry.row][entry.col] = entry.word[0];
        this.locked[entry.row][entry.col] = true;
        this.given.add(keyOf(entry));
      }
    });

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(crosswordLevelSelect(scenes, info)),
    });

    // Board.
    this.board.addChild(this.cellsLayer);
    grid.forEach((row, r) =>
      row.forEach((letter, c) => {
        if (letter === null) return;
        const text = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: DARK } });
        text.anchor.set(0.5);
        this.letterTexts.set(keyOf({ row: r, col: c }), text);
        this.board.addChild(text);
      }),
    );
    const numbered = new Set<string>();
    for (const entry of entries) {
      if (numbered.has(keyOf(entry))) continue;
      numbered.add(keyOf(entry));
      const text = new Text({ text: `${entry.number}`, style: { fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: 'bold', fill: DARK } });
      this.numberTexts.push({ text, cell: { row: entry.row, col: entry.col } });
      this.board.addChild(text);
    }
    this.board.eventMode = 'static';
    this.board.cursor = 'pointer';
    this.board.on('pointertap', this.onBoardTap, this);

    // Clue banner.
    this.bannerPicture = new Text({ text: '', style: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 48 } });
    this.bannerPicture.anchor.set(0.5);
    this.bannerLabel = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 20, fontWeight: 'bold', fill: 0x6c757d } });
    this.bannerClue = new Text({
      text: entries.length > 0 ? '' : 'Not enough words with clues!\nAdd clues in src/data/wordLists.ts',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: DARK, wordWrap: true, wordWrapWidth: 300 },
    });
    this.prevButton = new Button({ label: '◀', width: 56, height: 56, color: DARK, onClick: () => this.cycleEntry(-1) });
    this.nextButton = new Button({ label: '▶', width: 56, height: 56, color: DARK, onClick: () => this.cycleEntry(1) });
    this.banner.addChild(this.bannerBg, this.bannerPicture, this.bannerLabel, this.bannerClue, this.prevButton, this.nextButton);

    // In letter-bank mode, size keys for 8 so the board doesn't jump between words.
    this.keyboard = new LetterKeyboard(
      (key) => (key === BACKSPACE ? this.backspace() : this.typeLetter(key)),
      level.letterBank ? 8 : 0,
    );

    this.overlay = new WinOverlay({
      message: 'Great job!\nYou solved the crossword!',
      onPlayAgain: () => scenes.goTo(new CrosswordGame(scenes, info, level)),
      onLevels: () => scenes.goTo(crosswordLevelSelect(scenes, info)),
    });

    this.addChild(this.bg, this.backButton, this.board, this.banner, this.keyboard, this.overlay);
    if (entries.length > 0) this.selectEntry(0);
  }

  onEnter(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  onExit(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }

  update(ticker: Ticker): void {
    this.tweens.update(ticker.deltaMS);
  }

  // ---- Layout --------------------------------------------------------------

  resize(width: number, height: number): void {
    this.lastSize = { width, height };
    const margin = 16;
    const top = 96;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 85, 16 + 32);
    this.overlay.layout(width, height);

    if (this.puzzle.entries.length === 0) {
      this.layoutBanner(margin, top, width - margin * 2, 140);
      return;
    }

    const availH = height - top - margin;
    if (width > height && width >= 700) {
      // Landscape: board on the left under the back button; clue and keyboard on the right from the top.
      const leftW = (width - margin * 3) * 0.55;
      const rightX = margin * 2 + leftW;
      const rightW = width - rightX - margin;
      const bannerH = Math.min(150, (height - margin * 2) * 0.35);
      this.layoutBoard(margin, top, leftW, availH);
      this.layoutBanner(rightX, margin, rightW, bannerH);
      this.keyboard.layout(rightX, margin * 2 + bannerH, rightW, height - margin * 3 - bannerH);
    } else {
      // Portrait: clue, board, then keyboard at the bottom.
      const w = width - margin * 2;
      const bannerH = Math.max(84, Math.min(120, height * 0.14));
      this.layoutBanner(margin, top, w, bannerH);
      const keyboardH = this.keyboard.measure(w, Infinity).height;
      this.keyboard.layout(margin, height - margin - keyboardH, w, keyboardH);
      const boardTop = top + bannerH + margin;
      this.layoutBoard(margin, boardTop, w, height - margin - keyboardH - margin - boardTop);
    }
  }

  private layoutBoard(x: number, y: number, w: number, h: number): void {
    const { rows, cols } = this.puzzle;
    this.cellSize = Math.max(8, Math.min(88, w / cols, h / rows));
    const cs = this.cellSize;
    this.board.position.set(x + (w - cols * cs) / 2, y + (h - rows * cs) / 2);
    this.board.hitArea = new Rectangle(0, 0, cols * cs, rows * cs);

    for (const [key, text] of this.letterTexts) {
      const [row, col] = key.split(',').map(Number);
      text.style.fontSize = cs * 0.55;
      text.position.set((col + 0.5) * cs, (row + 0.56) * cs);
    }
    for (const { text, cell } of this.numberTexts) {
      text.style.fontSize = Math.max(8, cs * 0.24);
      text.position.set(cell.col * cs + cs * 0.12, cell.row * cs + cs * 0.06);
    }
    this.drawBoard();
  }

  private layoutBanner(x: number, y: number, w: number, h: number): void {
    const pad = 12;
    this.banner.position.set(x, y);
    this.bannerBg.clear().roundRect(0, 0, w, h, 20).fill({ color: 0xffffff, alpha: 0.95 });

    const hasEntries = this.puzzle.entries.length > 0;
    const buttonSize = Math.min(56, h * 0.55);
    this.prevButton.visible = this.nextButton.visible = hasEntries;
    this.prevButton.setSize(buttonSize, buttonSize);
    this.nextButton.setSize(buttonSize, buttonSize);
    this.prevButton.position.set(pad + buttonSize / 2, h / 2);
    this.nextButton.position.set(w - pad - buttonSize / 2, h / 2);

    let textX = hasEntries ? pad * 2 + buttonSize : pad * 2;
    const textRight = hasEntries ? w - pad * 2 - buttonSize : w - pad * 2;
    if (this.bannerPicture.text) {
      const size = Math.min(h * 0.75, (textRight - textX) * 0.3);
      this.bannerPicture.style.fontSize = size * 0.8;
      this.bannerPicture.position.set(textX + size / 2, h / 2);
      textX += size + pad;
    }

    this.bannerLabel.style.fontSize = Math.max(12, Math.min(20, h * 0.18));
    this.bannerLabel.scale.set(1);
    this.bannerLabel.scale.set(Math.min(1, Math.max(40, textRight - textX) / this.bannerLabel.width));
    this.bannerLabel.position.set(textX, pad);
    const clueTop = pad + (hasEntries ? this.bannerLabel.height + 4 : 0);
    const clueMaxH = h - clueTop - pad;
    this.bannerClue.style.wordWrapWidth = Math.max(40, textRight - textX);
    // Shrink the clue until it fits.
    let fontSize = Math.min(30, h * 0.3);
    this.bannerClue.style.fontSize = fontSize;
    while (this.bannerClue.height > clueMaxH && fontSize > 11) {
      fontSize *= 0.9;
      this.bannerClue.style.fontSize = fontSize;
    }
    this.bannerClue.position.set(textX, clueTop);
  }

  // ---- Selection -----------------------------------------------------------

  private selectEntry(index: number, cell?: Cell): void {
    this.current = index;
    const entry = this.puzzle.entries[index];
    this.caret = cell ?? this.firstOpenCell(entry) ?? { row: entry.row, col: entry.col };

    this.bannerLabel.text = `${entry.number} ${entry.across ? 'Across' : 'Down'}  ·  ${entry.word.length} letters`;
    this.bannerClue.text = entry.clue;
    this.bannerPicture.text = this.level.showPictures && entry.picture ? entry.picture : '';

    if (this.level.letterBank) this.keyboard.setLetters(shuffle([...new Set(entry.word)]));
    else if (this.keyboard.keys.length === 0) this.keyboard.setLetters(null);
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);
    else this.drawBoard();
  }

  /** Moves to the next (or previous) unsolved word. */
  private cycleEntry(direction: 1 | -1): void {
    const n = this.puzzle.entries.length;
    if (n === 0 || this.overlay.visible) return;
    for (let step = 1; step <= n; step++) {
      const i = (((this.current + direction * step) % n) + n) % n;
      if (!this.solved.has(i)) {
        this.selectEntry(i);
        return;
      }
    }
  }

  private onBoardTap(e: FederatedPointerEvent): void {
    if (this.overlay.visible || this.cellSize === 0) return;
    const p = this.board.toLocal(e.global);
    const cell = { row: Math.floor(p.y / this.cellSize), col: Math.floor(p.x / this.cellSize) };
    const list = this.cellEntries.get(keyOf(cell));
    if (!list) return;

    if (list.includes(this.current)) {
      // Tapping the cursor square again switches between across and down.
      if (sameCell(cell, this.caret) && list.length > 1) {
        this.selectEntry(list.find((i) => i !== this.current)!, cell);
      } else {
        this.caret = cell;
        this.drawBoard();
      }
    } else {
      this.selectEntry(list.find((i) => !this.solved.has(i)) ?? list[0], cell);
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) {
      this.typeLetter(e.key.toUpperCase());
    } else if (e.key === 'Backspace') {
      this.backspace();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      this.cycleEntry(e.shiftKey ? -1 : 1);
    } else {
      return;
    }
    e.preventDefault();
  };

  // ---- Typing --------------------------------------------------------------

  private typeLetter(letter: string): void {
    if (this.checking || this.overlay.visible || this.puzzle.entries.length === 0) return;
    const entry = this.puzzle.entries[this.current];
    const cells = this.cellsOf(entry);
    let index = this.indexIn(entry, this.caret);

    if (this.isLocked(this.caret)) {
      // Typing a locked square's own letter just steps past it.
      if (this.letterAt(this.caret) === letter) {
        this.caret = this.nextUnlocked(entry, index) ?? this.caret;
        this.drawBoard();
        return;
      }
      const next = this.nextUnlocked(entry, index);
      if (!next) return;
      index = this.indexIn(entry, next);
    }

    const cell = cells[index];
    this.letters[cell.row][cell.col] = letter;
    const text = this.letterTexts.get(keyOf(cell));
    if (text) this.tweens.add(150, (t) => text.scale.set(1.3 - 0.3 * t));
    this.caret = this.nextUnlocked(entry, index) ?? this.firstOpenCell(entry) ?? cell;
    this.evaluate(cell);
    this.drawBoard();
  }

  private backspace(): void {
    if (this.checking || this.overlay.visible || this.puzzle.entries.length === 0) return;
    const entry = this.puzzle.entries[this.current];
    if (!this.isLocked(this.caret) && this.letterAt(this.caret) !== null) {
      this.letters[this.caret.row][this.caret.col] = null;
    } else {
      const index = this.indexIn(entry, this.caret);
      const prev = this.cellsOf(entry).slice(0, index).reverse().find((c) => !this.isLocked(c));
      if (!prev) return;
      this.letters[prev.row][prev.col] = null;
      this.caret = prev;
    }
    this.drawBoard();
  }

  // ---- Checking ------------------------------------------------------------

  /** Checks every unsolved word through `cell` that is now completely filled in. */
  private evaluate(cell: Cell): void {
    const wrongCells: Cell[] = [];
    for (const i of this.cellEntries.get(keyOf(cell)) ?? []) {
      if (this.solved.has(i)) continue;
      const entry = this.puzzle.entries[i];
      const cells = this.cellsOf(entry);
      if (cells.some((c) => this.letterAt(c) === null)) continue;
      const bad = cells.filter((c, j) => this.letterAt(c) !== entry.word[j]);
      if (bad.length === 0) this.solve(i);
      else wrongCells.push(...bad);
    }
    if (wrongCells.length > 0) this.showWrong(wrongCells);
  }

  private solve(index: number): void {
    this.solved.add(index);
    const entry = this.puzzle.entries[index];
    const cells = this.cellsOf(entry);
    cells.forEach((c, j) => {
      this.locked[c.row][c.col] = true;
      const text = this.letterTexts.get(keyOf(c));
      if (!text) return;
      const delay = j * 50;
      const total = 300 + delay;
      this.tweens.add(total, (t) => {
        const p = Math.max(0, (t * total - delay) / 300);
        text.scale.set(1 + 0.35 * Math.sin(p * Math.PI));
      });
    });

    // Newly locked letters can finish a crossing word too.
    for (const c of cells) {
      for (const other of this.cellEntries.get(keyOf(c)) ?? []) {
        if (!this.solved.has(other) && this.isCorrect(other)) this.solve(other);
      }
    }

    if (this.solved.size === this.puzzle.entries.length) {
      if (!this.overlay.visible && !this.checking) {
        this.checking = true; // Stop input while the win screen comes up.
        this.tweens.delay(800, () => this.overlay.show(this.tweens));
      }
      return;
    }
    if (index === this.current) {
      this.tweens.delay(450, () => {
        if (this.solved.has(this.current)) this.cycleEntry(1);
      });
    }
  }

  private showWrong(cells: Cell[]): void {
    this.checking = true;
    for (const c of cells) this.wrong.add(keyOf(c));
    this.tweens.add(400, (t) => (this.board.pivot.x = Math.sin(t * Math.PI * 6) * 8 * (1 - t)));
    this.tweens.delay(750, () => {
      for (const c of cells) this.letters[c.row][c.col] = null;
      this.wrong.clear();
      this.checking = false;
      const entry = this.puzzle.entries[this.current];
      this.caret = this.firstOpenCell(entry) ?? this.caret;
      this.drawBoard();
    });
  }

  // ---- Helpers -------------------------------------------------------------

  private cellsOf(entry: CrosswordEntry): Cell[] {
    return [...entry.word].map((_, i) =>
      entry.across ? { row: entry.row, col: entry.col + i } : { row: entry.row + i, col: entry.col },
    );
  }

  private indexIn(entry: CrosswordEntry, cell: Cell): number {
    return entry.across ? cell.col - entry.col : cell.row - entry.row;
  }

  private letterAt(cell: Cell): string | null {
    return this.letters[cell.row][cell.col];
  }

  private isLocked(cell: Cell): boolean {
    return this.locked[cell.row][cell.col];
  }

  private isCorrect(index: number): boolean {
    const entry = this.puzzle.entries[index];
    return this.cellsOf(entry).every((c, j) => this.letterAt(c) === entry.word[j]);
  }

  /** First unlocked square after `index` in the word. */
  private nextUnlocked(entry: CrosswordEntry, index: number): Cell | undefined {
    return this.cellsOf(entry).slice(index + 1).find((c) => !this.isLocked(c));
  }

  /** First empty, unlocked square in the word. */
  private firstOpenCell(entry: CrosswordEntry): Cell | undefined {
    return this.cellsOf(entry).find((c) => !this.isLocked(c) && this.letterAt(c) === null);
  }

  // ---- Drawing -------------------------------------------------------------

  private drawBoard(): void {
    const g = this.cellsLayer.clear();
    const cs = this.cellSize;
    if (cs === 0) return;
    const entry = this.puzzle.entries[this.current];
    const currentUnsolved = entry !== undefined && !this.solved.has(this.current);
    const currentCells = new Set(entry ? this.cellsOf(entry).map(keyOf) : []);

    this.puzzle.grid.forEach((row, r) =>
      row.forEach((answer, c) => {
        if (answer === null) return;
        const cell = { row: r, col: c };
        const key = keyOf(cell);
        const inSolved = (this.cellEntries.get(key) ?? []).some((i) => this.solved.has(i));

        let color = CELL_COLOR;
        if (this.wrong.has(key)) color = WRONG_COLOR;
        else if (currentUnsolved && sameCell(cell, this.caret)) color = CURSOR_COLOR;
        else if (inSolved) color = SOLVED_COLOR;
        else if (currentCells.has(key)) color = WORD_COLOR;
        else if (this.given.has(key)) color = GIVEN_COLOR;

        const inset = Math.max(1, cs * 0.04);
        g.roundRect(c * cs + inset, r * cs + inset, cs - inset * 2, cs - inset * 2, cs * 0.14)
          .fill(color)
          .stroke({ width: Math.max(2, cs * 0.06), color: DARK });

        const text = this.letterTexts.get(key);
        if (text) text.text = this.letters[r][c] ?? '';
      }),
    );
  }
}
