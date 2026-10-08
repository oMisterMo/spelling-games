import { Container, FederatedPointerEvent, Graphics, Rectangle, Text, Ticker } from 'pixi.js';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { Tweens } from '../../core/Tweens';
import { getWords } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { generatePuzzle, type Puzzle } from './generatePuzzle';
import { wordSearchLevelSelect } from './levelSelect';
import type { WordSearchLevel } from './levels';

interface Cell {
  row: number;
  col: number;
}

interface FoundLine {
  start: Cell;
  end: Cell;
  color: number;
}

interface WordEntry {
  word: string;
  text: Text;
  strike: Graphics;
}

const HIGHLIGHT_COLORS = [0x06d6a0, 0x118ab2, 0x9b5de5, 0xef476f, 0xffd166, 0xf78c6b];
const SELECT_COLOR = 0xffd166;
const MISS_COLOR = 0xef476f;
const FOUND_WORD_COLOR = 0x8d99ae;
const BOARD_PADDING = 12;

const sameCell = (a: Cell, b: Cell) => a.row === b.row && a.col === b.col;

/**
 * Find the hidden words by dragging from the first letter to the last,
 * or by tapping the first letter and then the last.
 */
export class WordSearchGame extends Scene {
  private puzzle: Puzzle;
  private found = new Set<string>();
  private foundLines: FoundLine[] = [];
  private tweens = new Tweens();

  private bg = new Graphics();
  private backButton: Button;

  private board = new Container();
  private boardBg = new Graphics();
  private foundLayer = new Graphics();
  private selectionLayer = new Graphics();
  private letters: Text[][];
  private cellSize = 0;

  private panel = new Container();
  private panelBg = new Graphics();
  private panelTitle: Text;
  private entries: WordEntry[];

  private overlay: WinOverlay;

  /** Cell where the current drag began. */
  private dragStart: Cell | null = null;
  private dragEnd: Cell | null = null;
  /** First letter chosen by a tap, waiting for a tap on the last letter. */
  private pending: Cell | null = null;
  /** True when this press started on the pending cell, so releasing it deselects. */
  private pressedPending = false;
  private miss: { start: Cell; end: Cell; alpha: number } | null = null;

  constructor(scenes: SceneManager, private info: GameInfo, level: WordSearchLevel) {
    super();
    this.puzzle = generatePuzzle({
      words: getWords(level.words),
      size: level.size,
      wordCount: level.wordCount,
      directions: level.directions,
    });

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(wordSearchLevelSelect(scenes, info)),
    });

    // Board: background, found highlights, current selection, then letters on top.
    this.letters = this.puzzle.grid.map((row) =>
      row.map((letter) => {
        const text = new Text({
          text: letter,
          style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: DARK },
        });
        text.anchor.set(0.5);
        return text;
      }),
    );
    this.board.addChild(this.boardBg, this.foundLayer, this.selectionLayer, ...this.letters.flat());
    this.board.eventMode = 'static';
    this.board.cursor = 'pointer';
    this.board.on('pointerdown', this.onPointerDown, this);
    this.board.on('globalpointermove', this.onPointerMove, this);
    this.board.on('pointerup', this.onPointerUp, this);
    this.board.on('pointerupoutside', this.onPointerUp, this);

    // Word list panel.
    const words = this.puzzle.placements.map((p) => p.word).sort();
    this.panelTitle = new Text({
      text: words.length > 0 ? 'Find these words:' : 'No words fit!\nAdd some to src/data/wordLists.ts',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: DARK, align: 'center' },
    });
    this.panelTitle.anchor.set(0.5, 0);
    this.entries = words.map((word) => {
      const text = new Text({
        text: word,
        style: { fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: 'bold', fill: DARK },
      });
      text.anchor.set(0.5);
      const strike = new Graphics();
      strike.visible = false;
      return { word, text, strike };
    });
    this.panel.addChild(this.panelBg, this.panelTitle, ...this.entries.flatMap((e) => [e.text, e.strike]));

    this.overlay = new WinOverlay({
      message: `Great job!\nYou found all ${words.length} words!`,
      onPlayAgain: () => scenes.goTo(new WordSearchGame(scenes, info, level)),
      onLevels: () => scenes.goTo(wordSearchLevelSelect(scenes, info)),
    });

    this.addChild(this.bg, this.backButton, this.board, this.panel, this.overlay);
  }

  update(ticker: Ticker): void {
    this.tweens.update(ticker.deltaMS);
  }

  resize(width: number, height: number): void {
    const margin = 20;
    const top = 96;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 85, 16 + 32);

    const availH = height - top - margin;
    if (width > height) {
      // Landscape: board on the left, word list on the right.
      const boardSize = Math.max(120, Math.min(availH, (width - margin * 3) * 0.62));
      const panelW = Math.min(360, width - margin * 3 - boardSize);
      const left = (width - (boardSize + margin + panelW)) / 2;
      this.layoutBoard(left, top + (availH - boardSize) / 2, boardSize);
      this.layoutPanel(left + boardSize + margin, top, panelW, availH);
    } else {
      // Portrait: board on top, word list underneath.
      const boardSize = Math.max(120, Math.min(width - margin * 2, availH * 0.62));
      this.layoutBoard((width - boardSize) / 2, top, boardSize);
      const panelTop = top + boardSize + margin;
      this.layoutPanel(margin, panelTop, width - margin * 2, height - panelTop - margin);
    }

    this.overlay.layout(width, height);
  }

  private layoutBoard(x: number, y: number, outerSize: number): void {
    const gridSize = outerSize - BOARD_PADDING * 2;
    this.cellSize = gridSize / this.puzzle.size;
    this.board.position.set(x + BOARD_PADDING, y + BOARD_PADDING);
    this.board.hitArea = new Rectangle(-BOARD_PADDING, -BOARD_PADDING, outerSize, outerSize);

    this.boardBg
      .clear()
      .roundRect(-BOARD_PADDING, -BOARD_PADDING + 6, outerSize, outerSize, 24)
      .fill({ color: 0x000000, alpha: 0.2 })
      .roundRect(-BOARD_PADDING, -BOARD_PADDING, outerSize, outerSize, 24)
      .fill(0xffffff);

    this.letters.forEach((row, r) =>
      row.forEach((text, c) => {
        text.style.fontSize = Math.max(12, this.cellSize * 0.55);
        text.position.set((c + 0.5) * this.cellSize, (r + 0.5) * this.cellSize);
      }),
    );

    this.drawFound();
    this.drawSelection();
  }

  private layoutPanel(x: number, y: number, w: number, h: number): void {
    const pad = 16;
    this.panel.position.set(x, y);

    this.panelTitle.scale.set(1);
    this.panelTitle.scale.set(Math.min(1, (w - pad * 2) / this.panelTitle.width));
    this.panelTitle.position.set(w / 2, pad);
    const listTop = pad + this.panelTitle.height + 8;

    // Try every column count and keep the one that allows the biggest font.
    const n = this.entries.length;
    const longest = Math.max(1, ...this.entries.map((e) => e.word.length));
    const listH = Math.max(0, h - listTop - pad);
    let best = { cols: 1, rows: n, fontSize: 0 };
    for (let cols = 1; cols <= Math.max(1, n); cols++) {
      const rows = Math.ceil(n / cols);
      const itemH = Math.min(60, listH / rows);
      const colW = (w - pad * 2) / cols;
      const fontSize = Math.min(36, itemH * 0.65, colW / (longest * 0.75 + 0.5));
      if (fontSize > best.fontSize) best = { cols, rows, fontSize };
    }
    const itemH = best.fontSize / 0.65;
    const colW = (w - pad * 2) / best.cols;

    this.entries.forEach((entry, i) => {
      // Fill columns top to bottom so the list reads like a list.
      const col = Math.floor(i / best.rows);
      const row = i % best.rows;
      entry.text.style.fontSize = Math.max(10, best.fontSize);
      entry.text.position.set(pad + (col + 0.5) * colW, listTop + (row + 0.5) * itemH);
      entry.strike.position.copyFrom(entry.text.position);
      this.drawStrike(entry);
    });

    const panelH = Math.min(h, listTop + best.rows * itemH + pad);
    this.panelBg.clear().roundRect(0, 0, w, panelH, 20).fill({ color: 0xffffff, alpha: 0.9 });
  }

  // ---- Input ---------------------------------------------------------------

  private onPointerDown(e: FederatedPointerEvent): void {
    if (this.overlay.visible) return;
    const cell = this.cellAt(e);

    if (this.pending && !sameCell(this.pending, cell)) {
      // Second tap: select from the pending letter to this one.
      const start = this.pending;
      this.pending = null;
      this.submit(start, this.snapEnd(start, e));
      return;
    }

    this.pressedPending = this.pending !== null;
    this.pending = null;
    this.dragStart = cell;
    this.dragEnd = cell;
    this.drawSelection();
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.dragStart) return;
    this.dragEnd = this.snapEnd(this.dragStart, e);
    this.drawSelection();
  }

  private onPointerUp(): void {
    if (!this.dragStart || !this.dragEnd) return;
    const start = this.dragStart;
    const end = this.dragEnd;
    this.dragStart = this.dragEnd = null;

    if (sameCell(start, end)) {
      // A tap: remember the letter, or deselect it if it was already chosen.
      this.pending = this.pressedPending ? null : start;
      this.drawSelection();
    } else {
      this.submit(start, end);
    }
  }

  private cellAt(e: FederatedPointerEvent): Cell {
    const p = this.board.toLocal(e.global);
    const clamp = (v: number) => Math.max(0, Math.min(this.puzzle.size - 1, Math.floor(v / this.cellSize)));
    return { row: clamp(p.y), col: clamp(p.x) };
  }

  /** The cell under the pointer, snapped to the nearest straight or diagonal line from `start`. */
  private snapEnd(start: Cell, e: FederatedPointerEvent): Cell {
    const p = this.board.toLocal(e.global);
    const dx = p.x / this.cellSize - 0.5 - start.col;
    const dy = p.y / this.cellSize - 0.5 - start.row;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return start;

    const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const dCol = Math.round(Math.cos((octant * Math.PI) / 4));
    const dRow = Math.round(Math.sin((octant * Math.PI) / 4));
    let length = Math.round(dRow === 0 ? Math.abs(dx) : dCol === 0 ? Math.abs(dy) : (Math.abs(dx) + Math.abs(dy)) / 2);

    const size = this.puzzle.size;
    const inside = (n: number) => {
      const row = start.row + dRow * n;
      const col = start.col + dCol * n;
      return row >= 0 && row < size && col >= 0 && col < size;
    };
    while (length > 0 && !inside(length)) length--;
    return { row: start.row + dRow * length, col: start.col + dCol * length };
  }

  // ---- Game logic ----------------------------------------------------------

  private submit(start: Cell, end: Cell): void {
    const dRow = Math.sign(end.row - start.row);
    const dCol = Math.sign(end.col - start.col);
    const length = Math.max(Math.abs(end.row - start.row), Math.abs(end.col - start.col)) + 1;
    if (length < 2) {
      this.drawSelection();
      return;
    }

    let letters = '';
    for (let i = 0; i < length; i++) {
      letters += this.puzzle.grid[start.row + dRow * i][start.col + dCol * i];
    }
    const reversed = [...letters].reverse().join('');
    // Match by letters, so a copy that appears by chance in the filler letters also counts.
    const entry = this.entries.find((e) => !this.found.has(e.word) && (e.word === letters || e.word === reversed));

    if (entry) {
      this.markFound(entry, start, end, dRow, dCol, length);
    } else {
      this.showMiss(start, end);
    }
    this.drawSelection();
  }

  private markFound(entry: WordEntry, start: Cell, end: Cell, dRow: number, dCol: number, length: number): void {
    this.found.add(entry.word);
    const color = HIGHLIGHT_COLORS[(this.found.size - 1) % HIGHLIGHT_COLORS.length];
    this.foundLines.push({ start, end, color });
    this.drawFound();

    entry.text.style.fill = FOUND_WORD_COLOR;
    entry.strike.visible = true;
    entry.strike.tint = color;
    this.tweens.add(300, (t) => entry.strike.scale.set(t, 1));

    // Bounce the letters that were found.
    const bounceMs = 300;
    const staggerMs = 40;
    const totalMs = bounceMs + staggerMs * length;
    for (let i = 0; i < length; i++) {
      const letter = this.letters[start.row + dRow * i][start.col + dCol * i];
      this.tweens.add(totalMs, (t) => {
        const p = Math.max(0, Math.min(1, (t * totalMs - i * staggerMs) / bounceMs));
        letter.scale.set(1 + 0.4 * Math.sin(p * Math.PI));
      });
    }

    if (this.found.size === this.entries.length) {
      this.tweens.delay(700, () => this.overlay.show(this.tweens));
    }
  }

  private showMiss(start: Cell, end: Cell): void {
    this.miss = { start, end, alpha: 0.5 };
    this.tweens.add(
      350,
      (t) => {
        if (this.miss) this.miss.alpha = 0.5 * (1 - t);
        this.drawSelection();
      },
      () => {
        this.miss = null;
        this.drawSelection();
      },
    );
  }

  // ---- Drawing -------------------------------------------------------------

  private drawFound(): void {
    this.foundLayer.clear();
    for (const line of this.foundLines) {
      this.drawCapsule(this.foundLayer, line.start, line.end, line.color, 0.55);
    }
  }

  private drawSelection(): void {
    const g = this.selectionLayer.clear();
    if (this.miss) this.drawCapsule(g, this.miss.start, this.miss.end, MISS_COLOR, this.miss.alpha);
    if (this.dragStart && this.dragEnd) this.drawCapsule(g, this.dragStart, this.dragEnd, SELECT_COLOR, 0.7);
    if (this.pending) this.drawCapsule(g, this.pending, this.pending, SELECT_COLOR, 0.7);
  }

  private drawCapsule(g: Graphics, a: Cell, b: Cell, color: number, alpha: number): void {
    const cs = this.cellSize;
    const ax = (a.col + 0.5) * cs;
    const ay = (a.row + 0.5) * cs;
    const thickness = cs * 0.8;
    if (sameCell(a, b)) {
      g.circle(ax, ay, thickness / 2).fill({ color, alpha });
    } else {
      g.moveTo(ax, ay)
        .lineTo((b.col + 0.5) * cs, (b.row + 0.5) * cs)
        .stroke({ width: thickness, color, alpha, cap: 'round' });
    }
  }

  /** A line through the word, drawn white and tinted with its highlight color. */
  private drawStrike(entry: WordEntry): void {
    const half = entry.text.width / 2 + 4;
    entry.strike
      .clear()
      .moveTo(-half, 0)
      .lineTo(half, 0)
      .stroke({ width: Math.max(3, entry.text.style.fontSize * 0.12), color: 0xffffff, cap: 'round' });
  }
}
