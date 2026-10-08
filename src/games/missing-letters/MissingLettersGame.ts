import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { easeOutBack, easeOutCubic, Tweens } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile, TILE_COLOR } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { missingLettersLevelSelect } from './levelSelect';
import type { MissingLettersLevel } from './levels';
import { makePuzzle, type MissingLettersPuzzle } from './makePuzzle';

const CORRECT_COLOR = 0x06d6a0;
const WRONG_COLOR = 0xef476f;
const SELECTED_COLOR = 0xffd166;

interface Point {
  x: number;
  y: number;
}

/** One letter of the word: shown from the start, or a blank to fill in. */
class WordCell extends Tile {
  filled = false;

  constructor(
    readonly letter: string,
    readonly isBlank: boolean,
  ) {
    super(isBlank ? '' : letter);
  }
}

class ChoiceTile extends Tile {
  used = false;

  constructor(
    readonly letter: string,
    /** Spot in the choices row, which stays empty once the tile is used. */
    readonly index: number,
  ) {
    super(letter);
    this.cursor = 'pointer';
  }
}

/**
 * Fill in the missing letters: tap (or type) a letter to put it in the
 * highlighted blank. Tap a different blank to fill that one instead.
 * Right letters fly into place; wrong ones shake.
 */
export class MissingLettersGame extends Scene {
  private tweens = new Tweens();
  private rounds: WordInfo[];
  private roundIndex = 0;
  private puzzle: MissingLettersPuzzle | null = null;
  private cells: WordCell[] = [];
  private choices: ChoiceTile[] = [];
  private choiceCenters: Point[] = [];
  private cellSize = 0;
  private choiceSize = 0;
  /** Index (into the word) of the blank the next letter goes into. */
  private selected: number | null = null;
  /** True while moving to the next word; input is ignored. */
  private busy = false;
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private cellLayer = new Container();
  private choiceLayer = new Container();
  private hintButton: Button;
  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: MissingLettersLevel) {
    super();
    const usable = getWordInfos(level.words).filter((w) => w.word.length >= 3 && w.word.length <= level.maxLength);
    this.rounds = shuffle(usable).slice(0, level.rounds);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(missingLettersLevelSelect(scenes, info)),
    });

    this.progress = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: info.textColor ?? 0xffffff },
    });
    this.progress.anchor.set(1, 0.5);

    if (this.rounds.length === 0) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');

    this.hintButton = new Button({ label: 'Hint', width: 200, height: 64, color: 0xffd166, textColor: DARK, onClick: () => this.hint() });
    this.hintButton.visible = this.rounds.length > 0;

    this.overlay = new WinOverlay({
      message: `Great job!\nYou filled in ${this.rounds.length} words!`,
      onPlayAgain: () => scenes.goTo(new MissingLettersGame(scenes, info, level)),
      onLevels: () => scenes.goTo(missingLettersLevelSelect(scenes, info)),
    });

    this.addChild(this.bg, this.backButton, this.progress, this.clueCard, this.cellLayer, this.choiceLayer, this.hintButton, this.overlay);
    if (this.rounds.length > 0) this.startRound(0);
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

  private startRound(index: number): void {
    this.roundIndex = index;
    this.busy = false;
    for (const tile of [...this.cells, ...this.choices]) tile.destroy({ children: true });

    const round = this.rounds[index];
    const puzzle = makePuzzle(round.word, this.level);
    this.puzzle = puzzle;

    this.cells = [...round.word].map((letter, i) => {
      const cell = new WordCell(letter, puzzle.blanks.includes(i));
      if (cell.isBlank) {
        cell.cursor = 'pointer';
        cell.on('pointertap', () => this.select(i));
      } else {
        cell.eventMode = 'none';
      }
      this.cellLayer.addChild(cell);
      return cell;
    });

    this.choices = puzzle.choices.map((letter, i) => {
      const tile = new ChoiceTile(letter, i);
      tile.on('pointertap', () => this.choose(tile));
      this.choiceLayer.addChild(tile);
      return tile;
    });

    this.selected = puzzle.blanks[0];
    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.clueCard.setClue(
      this.level.showPictures ? (round.picture ?? '') : '',
      this.level.showClues && round.clue ? round.clue : 'Fill in the missing letters',
    );
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);

    // Pop the word in, then the choices.
    [...this.cells, ...this.choices].forEach((tile, i) => {
      const delay = i * 35;
      const total = 250 + delay;
      tile.scale.set(0);
      this.tweens.add(total, (t) => tile.scale.set(easeOutBack(Math.max(0, (t * total - delay) / 250))));
    });
  }

  // ---- Layout --------------------------------------------------------------

  resize(width: number, height: number): void {
    this.lastSize = { width, height };
    const margin = 16;
    const top = 96;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 85, 16 + 32);
    this.progress.position.set(width - 24, 48);
    this.overlay.layout(width, height);

    const w = width - margin * 2;
    const availH = height - top - margin;
    const gap = 16;
    const tileGap = Math.max(4, Math.min(12, w * 0.015));
    const buttonH = Math.max(44, Math.min(64, availH * 0.14));
    const clueH = Math.max(56, Math.min(150, availH * 0.25));
    const cardW = Math.min(w, 720);

    if (!this.puzzle) {
      this.clueCard.layout((width - cardW) / 2, top, cardW, clueH);
      return;
    }

    // Stack: clue card, word, letter choices, hint button — centered vertically.
    const n = this.cells.length;
    const c = this.choices.length;
    this.cellSize = Math.max(24, Math.min(88, (Math.min(w, 900) - tileGap * (n - 1)) / n, (availH - clueH - buttonH - gap * 4.5) / 2.2));
    this.choiceSize = Math.max(28, Math.min(96, (Math.min(w, 720) - tileGap * (c - 1)) / c, this.cellSize * 1.2));
    const cs = this.cellSize;
    const chs = this.choiceSize;
    const groupH = clueH + gap + cs + gap * 2 + chs + gap * 1.5 + buttonH;
    let y = top + Math.max(0, (availH - groupH) / 2);

    this.clueCard.layout((width - cardW) / 2, y, cardW, clueH);
    y += clueH + gap;

    let left = (width - (n * cs + (n - 1) * tileGap)) / 2;
    this.cells.forEach((cell, i) => {
      cell.resizeTile(cs * 0.92, cs * 0.92, cs * 0.55);
      cell.position.set(left + i * (cs + tileGap) + cs / 2, y + cs / 2);
    });
    y += cs + gap * 2;

    left = (width - (c * chs + (c - 1) * tileGap)) / 2;
    this.choiceCenters = this.choices.map((_, i) => ({ x: left + i * (chs + tileGap) + chs / 2, y: y + chs / 2 }));
    this.choices.forEach((tile, i) => {
      tile.resizeTile(chs * 0.92, chs * 0.92, chs * 0.55);
      if (!tile.used) tile.position.set(this.choiceCenters[i].x, this.choiceCenters[i].y);
    });
    y += chs + gap * 1.5;

    this.hintButton.setSize(Math.min(220, w), buttonH);
    this.hintButton.position.set(width / 2, y + buttonH / 2);
    this.drawBlanks();
  }

  // ---- Input ---------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) {
      const tile = this.choices.find((t) => !t.used && t.letter === e.key.toUpperCase());
      if (tile) this.choose(tile);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      this.moveSelection(e.key === 'ArrowRight' ? 1 : -1);
    } else {
      return;
    }
    e.preventDefault();
  };

  private select(index: number): void {
    const cell = this.cells[index];
    if (this.busy || this.overlay.visible || !cell?.isBlank || cell.filled) return;
    this.selected = index;
    this.drawBlanks();
  }

  private moveSelection(direction: 1 | -1): void {
    const open = this.openBlanks();
    if (open.length === 0 || this.selected === null) return;
    const i = open.indexOf(this.selected);
    this.select(open[(i + direction + open.length) % open.length]);
  }

  private hint(): void {
    if (this.busy || this.overlay.visible || this.selected === null) return;
    const letter = this.cells[this.selected].letter;
    const tile = this.choices.find((t) => !t.used && t.letter === letter);
    if (tile) this.choose(tile);
  }

  // ---- Game logic ----------------------------------------------------------

  private choose(tile: ChoiceTile): void {
    if (this.busy || tile.used || this.overlay.visible || this.selected === null) return;
    const index = this.selected;
    const cell = this.cells[index];
    if (tile.letter !== cell.letter) {
      this.showWrong(tile);
      return;
    }

    tile.used = true;
    cell.filled = true;
    this.selected = this.nextBlank(index);
    this.drawBlanks();

    // Fly the tile into the blank, then show the letter there.
    this.choiceLayer.addChild(tile);
    const from = { x: tile.x, y: tile.y };
    const ratio = this.cellSize / this.choiceSize;
    this.tweens.add(
      220,
      (t) => {
        const k = easeOutCubic(t);
        tile.position.set(from.x + (cell.x - from.x) * k, from.y + (cell.y - from.y) * k);
        tile.scale.set(1 + (ratio - 1) * k);
      },
      () => {
        tile.visible = false;
        cell.setLabel(cell.letter);
        cell.setColor(CORRECT_COLOR);
        cell.alpha = 1;
        this.tweens.add(300, (t) => cell.scale.set(1 + 0.3 * Math.sin(t * Math.PI)));
      },
    );

    if (this.selected === null) {
      this.busy = true;
      this.tweens.delay(350, () => this.completeRound());
    }
  }

  private showWrong(tile: ChoiceTile): void {
    tile.setColor(WRONG_COLOR);
    const baseX = this.choiceCenters[tile.index]?.x ?? tile.x;
    this.tweens.add(400, (t) => (tile.x = baseX + Math.sin(t * Math.PI * 6) * 8 * (1 - t)));
    this.tweens.delay(450, () => {
      if (!tile.used) tile.setColor(TILE_COLOR);
    });
  }

  private completeRound(): void {
    // Wave through the finished word.
    this.cells.forEach((cell, i) => {
      const delay = i * 60;
      const total = 350 + delay;
      this.tweens.add(total, (t) => {
        const p = Math.max(0, (t * total - delay) / 350);
        cell.scale.set(1 + 0.25 * Math.sin(p * Math.PI));
      });
    });
    const isLast = this.roundIndex === this.rounds.length - 1;
    this.tweens.delay(1100, () => (isLast ? this.overlay.show(this.tweens) : this.startRound(this.roundIndex + 1)));
  }

  private openBlanks(): number[] {
    return (this.puzzle?.blanks ?? []).filter((i) => !this.cells[i].filled);
  }

  /** The next unfilled blank after `index`, wrapping around; null when all are filled. */
  private nextBlank(index: number): number | null {
    const open = this.openBlanks();
    return open.find((i) => i > index) ?? open[0] ?? null;
  }

  /** Unfilled blanks: the selected one is yellow, the rest faded white. */
  private drawBlanks(): void {
    this.cells.forEach((cell, i) => {
      if (!cell.isBlank || cell.filled) return;
      const isSelected = i === this.selected;
      cell.setColor(isSelected ? SELECTED_COLOR : TILE_COLOR);
      cell.alpha = isSelected ? 1 : 0.5;
    });
  }
}
