import { Container, FederatedPointerEvent, Graphics, Text, Ticker } from 'pixi.js';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { easeOutCubic, Tweens, type Tween } from '../../core/Tweens';
import { getWords } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile, TILE_COLOR } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { abcOrderLevelSelect } from './levelSelect';
import type { AbcOrderLevel } from './levels';
import { pickWords } from './pickWords';

const CORRECT_COLOR = 0x06d6a0;
const WRONG_COLOR = 0xef476f;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/** Pointer travel (px) before a press becomes a drag instead of a tap. */
const DRAG_THRESHOLD = 8;

interface Point {
  x: number;
  y: number;
}

class WordTile extends Tile {
  /** Slot index the tile sits in, or null when it's in the tray. */
  slot: number | null = null;
  locked = false;
  move?: Tween;

  constructor(
    readonly word: string,
    /** Position in the tray, which stays reserved while the tile is in a slot. */
    readonly trayIndex: number,
  ) {
    // Shown as "Apple" rather than "APPLE"; ordering uses the uppercase word.
    super(word[0] + word.slice(1).toLowerCase());
  }
}

/**
 * Put the words into ABC order: drag each word into a numbered slot, or tap a
 * word to send it to the next empty slot (tap again to send it back).
 * When every slot is full, correct words lock in green and wrong ones return to the tray.
 */
export class AbcOrderGame extends Scene {
  private tweens = new Tweens();
  private answer: string[];
  private tiles: WordTile[];
  private slotCenters: Point[] = [];
  private trayCenters: Point[] = [];
  private rowH = 0;
  private tileW = 0;

  private bg = new Graphics();
  private backButton: Button;
  private instruction: Text;
  private alphabet = new Container();
  private alphabetHighlights = new Graphics();
  private alphabetLetters: Text[] = [];
  private slotsLayer = new Graphics();
  private slotNumbers: Text[];
  private tileLayer = new Container();
  private overlay: WinOverlay;

  private drag: { tile: WordTile; offset: Point; start: Point; moved: boolean } | null = null;
  /** True while showing check results; input is ignored. */
  private checking = false;

  constructor(scenes: SceneManager, private info: GameInfo, private level: AbcOrderLevel) {
    super();
    const words = pickWords({
      words: getWords(level.words),
      count: level.wordCount,
      sharedFirstLetter: level.sharedFirstLetter,
    });
    this.answer = [...words].sort();

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(abcOrderLevelSelect(scenes, info)),
    });

    this.instruction = new Text({
      text: words.length >= 2 ? 'Put the words in ABC order' : 'Not enough words!\nAdd some to src/data/wordLists.ts',
      style: { fontFamily: FONT_FAMILY, fontSize: 40, fontWeight: 'bold', fill: info.textColor ?? 0xffffff, align: 'center' },
    });
    this.instruction.anchor.set(0.5);

    if (level.showAlphabet) {
      this.alphabet.addChild(this.alphabetHighlights);
      for (const letter of ALPHABET) {
        const text = new Text({ text: letter, style: { fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 'bold', fill: DARK } });
        text.anchor.set(0.5);
        this.alphabetLetters.push(text);
        this.alphabet.addChild(text);
      }
    }

    this.slotNumbers = this.answer.map((_, i) => {
      const text = new Text({ text: `${i + 1}`, style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: DARK } });
      text.anchor.set(0.5);
      return text;
    });

    this.tiles = words.map((word, i) => {
      const tile = new WordTile(word, i);
      tile.on('pointerdown', (e: FederatedPointerEvent) => this.onTileDown(tile, e));
      tile.on('pointerup', () => this.onTileUp(tile));
      tile.on('pointerupoutside', () => this.onTileUp(tile));
      this.tileLayer.addChild(tile);
      return tile;
    });
    this.tileLayer.eventMode = 'static';
    this.tileLayer.on('globalpointermove', this.onPointerMove, this);

    this.overlay = new WinOverlay({
      message: 'Great job!\nThe words are in ABC order!',
      onPlayAgain: () => scenes.goTo(new AbcOrderGame(scenes, info, level)),
      onLevels: () => scenes.goTo(abcOrderLevelSelect(scenes, info)),
    });

    this.addChild(this.bg, this.backButton, this.instruction, this.alphabet, this.slotsLayer, ...this.slotNumbers, this.tileLayer, this.overlay);
  }

  update(ticker: Ticker): void {
    this.tweens.update(ticker.deltaMS);
  }

  resize(width: number, height: number): void {
    const margin = 20;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 85, 16 + 32);
    let y = 96;

    this.instruction.scale.set(1);
    this.instruction.scale.set(Math.min(1, (width - margin * 2) / this.instruction.width));
    this.instruction.position.set(width / 2, y + this.instruction.height / 2);
    y += this.instruction.height + 12;

    if (this.level.showAlphabet) y += this.layoutAlphabet(width, y, margin) + 16;

    // Two columns: numbered slots on the left, the word tray on the right.
    const n = this.answer.length;
    const gap = 12;
    const colGap = width < 500 ? 12 : 24;
    const colW = Math.min(400, (width - margin * 2 - colGap) / 2);
    const left = (width - (colW * 2 + colGap)) / 2;
    const availH = height - y - margin;
    this.rowH = Math.max(36, Math.min(84, (availH - gap * (n - 1)) / n));
    const numberW = Math.min(44, this.rowH * 0.6, colW * 0.2);
    this.tileW = colW - numberW - 10;
    const tileH = this.rowH - 10;
    const longest = Math.max(1, ...this.answer.map((w) => w.length));
    const fontSize = Math.max(12, Math.min(40, tileH * 0.5, this.tileW / (longest * 0.55 + 0.6)));

    this.slotsLayer.clear();
    this.slotCenters = [];
    this.trayCenters = [];
    for (let i = 0; i < n; i++) {
      const cy = y + i * (this.rowH + gap) + this.rowH / 2;
      const slot = { x: left + numberW + this.tileW / 2 + 5, y: cy };
      const tray = { x: left + colW + colGap + colW / 2, y: cy };
      this.slotCenters.push(slot);
      this.trayCenters.push(tray);

      this.slotsLayer
        .roundRect(left, cy - this.rowH / 2, colW, this.rowH, 18)
        .fill({ color: 0xffffff, alpha: 0.45 })
        .roundRect(tray.x - this.tileW / 2, cy - tileH / 2, this.tileW, tileH, 16)
        .fill({ color: 0x000000, alpha: 0.08 });
      this.slotNumbers[i].style.fontSize = Math.min(32, this.rowH * 0.45);
      this.slotNumbers[i].position.set(left + numberW / 2 + 4, cy);
    }

    for (const tile of this.tiles) tile.resizeTile(this.tileW, tileH, fontSize);
    this.placeTiles(false);
    this.overlay.layout(width, height);
  }

  /** Lays out the A–Z strip starting at `top`; returns its height. */
  private layoutAlphabet(width: number, top: number, margin: number): number {
    const perRow = width >= 760 ? 26 : 13;
    const cell = Math.min(44, (width - margin * 2) / perRow);
    const startX = (width - perRow * cell) / 2;
    const firstLetters = new Set(this.answer.map((w) => w[0]));

    this.alphabetHighlights.clear();
    this.alphabetLetters.forEach((text, i) => {
      const x = startX + ((i % perRow) + 0.5) * cell;
      const y = top + (Math.floor(i / perRow) + 0.5) * cell;
      text.style.fontSize = cell * 0.6;
      text.position.set(x, y);
      if (firstLetters.has(ALPHABET[i])) {
        this.alphabetHighlights.circle(x, y, cell * 0.46).fill(0xffffff);
      }
    });
    return Math.ceil(ALPHABET.length / perRow) * cell;
  }

  // ---- Input ---------------------------------------------------------------

  private onTileDown(tile: WordTile, e: FederatedPointerEvent): void {
    if (this.checking || tile.locked || this.drag || this.overlay.visible) return;
    this.tweens.cancel(tile.move);
    const p = this.tileLayer.toLocal(e.global);
    this.drag = { tile, offset: { x: tile.x - p.x, y: tile.y - p.y }, start: { x: p.x, y: p.y }, moved: false };
    this.tileLayer.addChild(tile); // Bring to front.
    tile.scale.set(1.05);
    tile.cursor = 'grabbing';
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.drag) return;
    const p = this.tileLayer.toLocal(e.global);
    const { tile, offset, start } = this.drag;
    if (!this.drag.moved && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) this.drag.moved = true;
    if (this.drag.moved) tile.position.set(p.x + offset.x, p.y + offset.y);
  }

  private onTileUp(tile: WordTile): void {
    if (this.drag?.tile !== tile) return;
    const { moved } = this.drag;
    this.drag = null;
    tile.scale.set(1);
    tile.cursor = 'grab';

    if (!moved) {
      // Tap: tray -> next empty slot, slot -> back to the tray.
      tile.slot = tile.slot === null ? this.firstEmptySlot() : null;
    } else {
      const target = this.slotAt(tile.position);
      if (target === null) {
        tile.slot = null;
      } else if (target !== tile.slot) {
        const other = this.tiles.find((t) => t.slot === target);
        if (!other?.locked) {
          // Swap: whatever was in the target slot goes where this tile came from.
          if (other) other.slot = tile.slot;
          tile.slot = target;
        }
      }
    }

    this.placeTiles(true);
    if (this.tiles.every((t) => t.slot !== null)) {
      this.checking = true;
      this.tweens.delay(300, () => this.check());
    }
  }

  private firstEmptySlot(): number | null {
    for (let i = 0; i < this.answer.length; i++) {
      if (!this.tiles.some((t) => t.slot === i)) return i;
    }
    return null;
  }

  private slotAt(p: Point): number | null {
    const index = this.slotCenters.findIndex(
      (c) => Math.abs(p.x - c.x) < this.tileW / 2 + 30 && Math.abs(p.y - c.y) < this.rowH / 2 + 6,
    );
    return index === -1 ? null : index;
  }

  // ---- Game logic ----------------------------------------------------------

  private check(): void {
    const wrong = this.tiles.filter((tile) => tile.slot !== null && this.answer[tile.slot] !== tile.word);

    for (const tile of this.tiles) {
      if (tile.locked) continue;
      if (wrong.includes(tile)) {
        tile.setColor(WRONG_COLOR);
        const baseX = tile.x;
        this.tweens.add(450, (t) => (tile.x = baseX + Math.sin(t * Math.PI * 6) * 10 * (1 - t)));
      } else {
        tile.locked = true;
        tile.cursor = 'default';
        tile.setColor(CORRECT_COLOR);
        this.tweens.add(350, (t) => tile.scale.set(1 + 0.12 * Math.sin(t * Math.PI)));
      }
    }

    if (wrong.length === 0) {
      this.tweens.delay(600, () => this.overlay.show(this.tweens));
      return;
    }
    this.tweens.delay(900, () => {
      for (const tile of wrong) {
        tile.slot = null;
        tile.setColor(TILE_COLOR);
      }
      this.placeTiles(true);
      this.checking = false;
    });
  }

  /** Moves every tile (except one being dragged) to its slot or tray spot. */
  private placeTiles(animate: boolean): void {
    for (const tile of this.tiles) {
      if (this.drag?.tile === tile) continue;
      const target = tile.slot === null ? this.trayCenters[tile.trayIndex] : this.slotCenters[tile.slot];
      if (!target) continue;
      this.tweens.cancel(tile.move);
      if (!animate) {
        tile.position.set(target.x, target.y);
        continue;
      }
      const from = { x: tile.x, y: tile.y };
      tile.move = this.tweens.add(200, (t) => {
        const k = easeOutCubic(t);
        tile.position.set(from.x + (target.x - from.x) * k, from.y + (target.y - from.y) * k);
      });
    }
  }
}
