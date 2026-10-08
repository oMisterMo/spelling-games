import { Container, FederatedPointerEvent, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { easeOutBack, easeOutCubic, Tweens, type Tween } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile, TILE_COLOR } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { wordScrambleLevelSelect } from './levelSelect';
import type { WordScrambleLevel } from './levels';
import { pickRounds, scrambleWord } from './scramble';

/** Darker than the usual green, which is this game's background color. */
const CORRECT_COLOR = 0x127a5a;
const WRONG_COLOR = 0xef476f;
/** Pointer travel (px) before a press becomes a drag instead of a tap. */
const DRAG_THRESHOLD = 8;

interface Point {
  x: number;
  y: number;
}

class LetterTile extends Tile {
  /** Answer slot the tile sits in, or null when it's in the pool. */
  slot: number | null = null;
  locked = false;
  move?: Tween;

  constructor(
    readonly letter: string,
    /** Position in the pool, which stays reserved while the tile is in a slot. */
    public poolIndex: number,
  ) {
    super(letter);
  }
}

/**
 * Rebuild each scrambled word: tap a letter to send it to the next empty slot
 * (tap it again to send it back), drag it to a slot, or type it. When the
 * slots are full, right letters lock in green and wrong ones return to the pool.
 */
export class WordScrambleGame extends Scene {
  private tweens = new Tweens();
  private rounds: WordInfo[];
  private roundIndex = 0;
  private tiles: LetterTile[] = [];
  private slotCenters: Point[] = [];
  private poolCenters: Point[] = [];
  private tileSize = 0;
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private slotsLayer = new Graphics();
  private tileLayer = new Container();
  private hintButton: Button;
  private shuffleButton: Button;
  private overlay: WinOverlay;

  private drag: { tile: LetterTile; offset: Point; start: Point; moved: boolean } | null = null;
  /** True while showing check results or moving to the next word; input is ignored. */
  private checking = false;

  constructor(scenes: SceneManager, private info: GameInfo, private level: WordScrambleLevel) {
    super();
    this.rounds = pickRounds(getWordInfos(level.words), level.rounds, level.maxLength);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(wordScrambleLevelSelect(scenes, info)),
    });

    const textColor = info.textColor ?? 0xffffff;
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: textColor } });
    this.progress.anchor.set(1, 0.5);

    if (this.rounds.length === 0) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');

    this.tileLayer.eventMode = 'static';
    this.tileLayer.on('globalpointermove', this.onPointerMove, this);

    this.hintButton = new Button({ label: 'Hint', width: 180, height: 64, color: 0xffd166, textColor: DARK, onClick: () => this.hint() });
    this.shuffleButton = new Button({ label: 'Shuffle', width: 180, height: 64, color: DARK, onClick: () => this.shufflePool() });
    this.hintButton.visible = this.shuffleButton.visible = this.rounds.length > 0;

    this.overlay = new WinOverlay({
      message: `Great job!\nYou unscrambled ${this.rounds.length} words!`,
      onPlayAgain: () => scenes.goTo(new WordScrambleGame(scenes, info, level)),
      onLevels: () => scenes.goTo(wordScrambleLevelSelect(scenes, info)),
    });

    this.addChild(this.bg, this.backButton, this.progress, this.clueCard, this.slotsLayer, this.tileLayer, this.hintButton, this.shuffleButton, this.overlay);
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

  private get word(): string {
    return this.rounds[this.roundIndex]?.word ?? '';
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.checking = false;
    this.drag = null;
    for (const tile of this.tiles) tile.destroy({ children: true });
    this.tileLayer.removeChildren();

    const round = this.rounds[index];
    this.tiles = scrambleWord(round.word).map((letter, i) => {
      const tile = new LetterTile(letter, i);
      tile.on('pointerdown', (e: FederatedPointerEvent) => this.onTileDown(tile, e));
      tile.on('pointerup', () => this.onTileUp(tile));
      tile.on('pointerupoutside', () => this.onTileUp(tile));
      this.tileLayer.addChild(tile);
      return tile;
    });

    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.clueCard.setClue(
      this.level.showPictures ? (round.picture ?? '') : '',
      this.level.showClues && round.clue ? round.clue : 'Unscramble the letters',
    );
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);

    // Pop the new tiles in one after another.
    this.tiles.forEach((tile, i) => {
      const delay = i * 40;
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
    const n = this.word.length;
    const gap = 16;
    const tileGap = Math.max(4, Math.min(12, w * 0.015));
    const buttonH = Math.max(44, Math.min(64, availH * 0.14));
    const clueH = Math.max(56, Math.min(150, availH * 0.25));

    if (n === 0) {
      this.clueCard.layout(margin, top, w, clueH);
      return;
    }

    // Stack: clue card, answer slots, letter pool, buttons — centered vertically.
    const byWidth = (Math.min(w, 900) - tileGap * (n - 1)) / n;
    const byHeight = (availH - clueH - buttonH - gap * 3) / 2.5;
    this.tileSize = Math.max(24, Math.min(88, byWidth, byHeight));
    const s = this.tileSize;
    const groupH = clueH + gap + s * 2.5 + gap + buttonH;
    let y = top + Math.max(0, (availH - groupH) / 2);

    const cardW = Math.min(w, 720);
    this.clueCard.layout((width - cardW) / 2, y, cardW, clueH);
    y += clueH + gap;

    const rowW = n * s + (n - 1) * tileGap;
    const left = (width - rowW) / 2;
    this.slotsLayer.clear();
    this.slotCenters = [];
    this.poolCenters = [];
    for (let i = 0; i < n; i++) {
      const x = left + i * (s + tileGap);
      this.slotCenters.push({ x: x + s / 2, y: y + s / 2 });
      this.poolCenters.push({ x: x + s / 2, y: y + s * 1.5 + s / 2 });
      this.slotsLayer
        .roundRect(x, y, s, s, s * 0.2)
        .fill({ color: 0xffffff, alpha: 0.4 })
        .roundRect(x, y + s * 1.5, s, s, s * 0.2)
        .fill({ color: 0x000000, alpha: 0.1 });
    }
    y += s * 2.5 + gap;

    const buttonW = Math.min(200, (w - gap) / 2);
    this.hintButton.setSize(buttonW, buttonH);
    this.shuffleButton.setSize(buttonW, buttonH);
    this.hintButton.position.set(width / 2 - buttonW / 2 - gap / 2, y + buttonH / 2);
    this.shuffleButton.position.set(width / 2 + buttonW / 2 + gap / 2, y + buttonH / 2);

    for (const tile of this.tiles) tile.resizeTile(s * 0.92, s * 0.92, s * 0.55);
    this.placeTiles(false);
  }

  // ---- Input ---------------------------------------------------------------

  private onTileDown(tile: LetterTile, e: FederatedPointerEvent): void {
    if (this.checking || tile.locked || this.drag || this.overlay.visible) return;
    this.tweens.cancel(tile.move);
    const p = this.tileLayer.toLocal(e.global);
    this.drag = { tile, offset: { x: tile.x - p.x, y: tile.y - p.y }, start: { x: p.x, y: p.y }, moved: false };
    this.tileLayer.addChild(tile); // Bring to front.
    tile.scale.set(1.08);
    tile.cursor = 'grabbing';
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.drag) return;
    const p = this.tileLayer.toLocal(e.global);
    const { tile, offset, start } = this.drag;
    if (!this.drag.moved && Math.hypot(p.x - start.x, p.y - start.y) > DRAG_THRESHOLD) this.drag.moved = true;
    if (this.drag.moved) tile.position.set(p.x + offset.x, p.y + offset.y);
  }

  private onTileUp(tile: LetterTile): void {
    if (this.drag?.tile !== tile) return;
    const { moved } = this.drag;
    this.drag = null;
    tile.scale.set(1);
    tile.cursor = 'grab';

    if (!moved) {
      // Tap: pool -> next empty slot, slot -> back to the pool.
      tile.slot = tile.slot === null ? this.firstEmptySlot() : null;
    } else {
      const target = this.slotAt(tile.position);
      if (target === null) {
        tile.slot = null;
      } else if (target !== tile.slot) {
        const other = this.tileInSlot(target);
        if (!other?.locked) {
          // Swap: whatever was in the target slot goes where this tile came from.
          if (other) other.slot = tile.slot;
          tile.slot = target;
        }
      }
    }
    this.afterMove();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) {
      this.typeLetter(e.key.toUpperCase());
    } else if (e.key === 'Backspace') {
      this.backspace();
    } else {
      return;
    }
    e.preventDefault();
  };

  private typeLetter(letter: string): void {
    if (!this.canAct()) return;
    const slot = this.firstEmptySlot();
    const tile = this.tiles
      .filter((t) => t.slot === null && t.letter === letter)
      .sort((a, b) => a.poolIndex - b.poolIndex)[0];
    if (slot === null || !tile) return;
    tile.slot = slot;
    this.afterMove();
  }

  /** Sends the right-most unlocked letter back to the pool. */
  private backspace(): void {
    if (!this.canAct()) return;
    const tile = this.tiles
      .filter((t) => t.slot !== null && !t.locked)
      .sort((a, b) => (b.slot ?? 0) - (a.slot ?? 0))[0];
    if (!tile) return;
    tile.slot = null;
    this.placeTiles(true);
  }

  /** Puts the correct letter into the first slot that isn't locked yet. */
  private hint(): void {
    if (!this.canAct()) return;
    const index = [...this.word].findIndex((_, i) => !this.tileInSlot(i)?.locked);
    if (index === -1) return;

    const occupant = this.tileInSlot(index);
    if (occupant && occupant.letter === this.word[index]) {
      this.lock(occupant);
    } else {
      if (occupant) occupant.slot = null;
      const candidates = this.tiles.filter((t) => !t.locked && t !== occupant && t.letter === this.word[index]);
      const tile = candidates.find((t) => t.slot === null) ?? candidates[0];
      if (!tile) return;
      tile.slot = index;
      this.lock(tile);
    }
    this.afterMove();
  }

  private shufflePool(): void {
    if (!this.canAct()) return;
    const order = shuffle(this.tiles.map((t) => t.poolIndex));
    this.tiles.forEach((tile, i) => (tile.poolIndex = order[i]));
    this.placeTiles(true);
  }

  private canAct(): boolean {
    return !this.checking && !this.drag && !this.overlay.visible && this.rounds.length > 0;
  }

  private firstEmptySlot(): number | null {
    for (let i = 0; i < this.word.length; i++) {
      if (!this.tileInSlot(i)) return i;
    }
    return null;
  }

  private tileInSlot(slot: number): LetterTile | undefined {
    return this.tiles.find((t) => t.slot === slot);
  }

  private slotAt(p: Point): number | null {
    const s = this.tileSize;
    const index = this.slotCenters.findIndex((c) => Math.abs(p.x - c.x) < s * 0.6 && Math.abs(p.y - c.y) < s * 0.75);
    return index === -1 ? null : index;
  }

  // ---- Game logic ----------------------------------------------------------

  private afterMove(): void {
    this.placeTiles(true);
    if (this.tiles.every((t) => t.slot !== null)) {
      this.checking = true;
      this.tweens.delay(250, () => this.check());
    }
  }

  private check(): void {
    const wrong = this.tiles.filter((t) => t.slot !== null && t.letter !== this.word[t.slot]);
    for (const tile of this.tiles) {
      if (!tile.locked && !wrong.includes(tile)) this.lock(tile);
    }

    if (wrong.length === 0) {
      this.completeRound();
      return;
    }

    for (const tile of wrong) {
      tile.setColor(WRONG_COLOR);
      const baseX = tile.x;
      this.tweens.add(450, (t) => (tile.x = baseX + Math.sin(t * Math.PI * 6) * 8 * (1 - t)));
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

  private lock(tile: LetterTile): void {
    tile.locked = true;
    tile.cursor = 'default';
    tile.setColor(CORRECT_COLOR);
  }

  private completeRound(): void {
    this.checking = true;
    // Wave through the finished word.
    [...this.tiles]
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
      .forEach((tile, i) => {
        const delay = i * 60;
        const total = 350 + delay;
        this.tweens.add(total, (t) => {
          const p = Math.max(0, (t * total - delay) / 350);
          tile.scale.set(1 + 0.25 * Math.sin(p * Math.PI));
        });
      });

    const isLast = this.roundIndex === this.rounds.length - 1;
    this.tweens.delay(1100, () => (isLast ? this.overlay.show(this.tweens) : this.startRound(this.roundIndex + 1)));
  }

  /** Moves every tile (except one being dragged) to its slot or pool spot. */
  private placeTiles(animate: boolean): void {
    for (const tile of this.tiles) {
      if (this.drag?.tile === tile) continue;
      const target = tile.slot === null ? this.poolCenters[tile.poolIndex] : this.slotCenters[tile.slot];
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
