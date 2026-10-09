import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { canSpeak, speak, stopSpeaking } from '../../core/speech';
import { easeOutBack, easeOutCubic, Tweens } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { Firefly, GLOW_COLOR } from './Firefly';
import { fireflyCatchLevelSelect } from './levelSelect';
import type { FireflyCatchLevel } from './levels';
import { playCatch, playMiss, playWin, playWordDone } from './sounds';
import { swarmLetters } from './swarmLetters';

const PROMPT = 'Catch the letters in order!';
const PRAISE = ['Great catching!', 'You got it!', 'Well done!', 'Super!'];
const STAR_COUNT = 40;

/**
 * Fireflies carrying letters drift around a night sky. Tap them in the order
 * that spells the word; each one caught flies down into its box. A wrong
 * firefly just shakes, and after a few misses the right one starts to pulse.
 */
export class FireflyCatchGame extends Scene {
  private tweens = new Tweens();
  private rounds: WordInfo[];
  private roundIndex = 0;
  private fireflies: Firefly[] = [];
  /** Index of the next letter of the word to catch. */
  private next = 0;
  private missesOnLetter = 0;
  private mistakes = false;
  private perfectCount = 0;
  /** True while a finished word is shown; input is ignored. */
  private busy = false;
  private time = 0;
  private field = { x: 0, y: 0, w: 0, h: 0 };
  private radius = 30;
  private stars = Array.from({ length: STAR_COUNT }, () => ({ x: Math.random(), y: Math.random(), size: 0.8 + Math.random() * 1.6 }));
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private hearButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private fieldBg = new Graphics();
  private cellLayer = new Container();
  private cells: Tile[] = [];
  private fireflyLayer = new Container();
  private status: Text;
  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: FireflyCatchLevel) {
    super();
    // When the word isn't shown there must be another way to know it: hearing it, or a clue.
    const usable = getWordInfos(level.words).filter(
      (w) => w.word.length >= 3 && w.word.length <= level.maxLength && (level.showWord || canSpeak || w.clue),
    );
    this.rounds = shuffle(usable).slice(0, level.rounds);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(fireflyCatchLevelSelect(scenes, info)),
    });
    this.hearButton = new Button({ label: '🔊', width: 64, height: 64, color: 0xffd166, textColor: DARK, onClick: () => this.sayWord() });

    const textColor = info.textColor ?? 0xffffff;
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: textColor } });
    this.progress.anchor.set(1, 0.5);

    this.status = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: textColor, align: 'center' },
    });
    this.status.anchor.set(0.5);

    this.overlay = new WinOverlay({
      message: '',
      onPlayAgain: () => scenes.goTo(new FireflyCatchGame(scenes, info, level)),
      onLevels: () => scenes.goTo(fireflyCatchLevelSelect(scenes, info)),
    });

    const playable = this.rounds.length > 0;
    if (!playable) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');
    this.hearButton.visible = playable && canSpeak;
    this.fieldBg.visible = playable;

    this.addChild(this.bg, this.backButton, this.hearButton, this.progress, this.clueCard, this.fieldBg, this.cellLayer, this.status, this.fireflyLayer, this.overlay);
    if (playable) this.startRound(0);
  }

  onEnter(): void {
    window.addEventListener('keydown', this.onKeyDown);
  }

  onExit(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    stopSpeaking();
  }

  update(ticker: Ticker): void {
    this.tweens.update(ticker.deltaMS);
    // A long pause (a hidden tab) shouldn't fling the fireflies across the field.
    const deltaMS = Math.min(ticker.deltaMS, 50);
    this.time += deltaMS;
    this.moveFireflies(deltaMS / 1000);
  }

  private get word(): string {
    return this.rounds[this.roundIndex]?.word ?? '';
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.busy = false;
    this.next = 0;
    this.missesOnLetter = 0;
    this.mistakes = false;
    for (const item of [...this.cells, ...this.fireflies]) item.destroy({ children: true });

    const round = this.rounds[index];
    this.cells = [...round.word].map((letter) => {
      const cell = new Tile(this.level.showWord ? letter : '');
      cell.eventMode = 'none';
      cell.alpha = 0.45;
      this.cellLayer.addChild(cell);
      return cell;
    });

    const placed: Firefly[] = [];
    const letters = swarmLetters(round.word, this.level.extraLetters);
    const apart = 0.8 / Math.sqrt(letters.length);
    this.fireflies = letters.map((letter, i) => {
      const firefly = new Firefly(letter);
      // Start apart from the others where there's room.
      for (let attempt = 0; attempt < 60; attempt++) {
        firefly.u = Math.random();
        firefly.v = Math.random();
        if (placed.every((other) => Math.hypot(other.u - firefly.u, other.v - firefly.v) > apart)) break;
      }
      const angle = Math.random() * Math.PI * 2;
      firefly.dx = Math.cos(angle);
      firefly.dy = Math.sin(angle);
      // pointerdown, not pointertap: a moving target can slip away before the finger lifts.
      firefly.on('pointerdown', () => this.tap(firefly));
      this.fireflyLayer.addChild(firefly);
      placed.push(firefly);
      const delay = i * 50;
      const total = 300 + delay;
      this.tweens.add(total, (t) => (firefly.appear = easeOutBack(Math.max(0, (t * total - delay) / 300))));
      return firefly;
    });

    this.status.text = PROMPT;
    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.clueCard.setClue(
      this.level.showPictures ? (round.picture ?? '') : '',
      this.level.showClues && round.clue ? round.clue : 'Spell the word',
    );
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);
    this.tweens.delay(400, () => this.sayWord());
  }

  // ---- Layout --------------------------------------------------------------

  resize(width: number, height: number): void {
    this.lastSize = { width, height };
    const margin = 16;
    const top = 96;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    for (const star of this.stars) this.bg.circle(star.x * width, star.y * height, star.size).fill({ color: 0xffffff, alpha: 0.5 });
    this.backButton.position.set(16 + 85, 16 + 32);
    this.hearButton.position.set(16 + 170 + 12 + 32, 16 + 32);
    this.progress.position.set(width - 24, 48);
    this.overlay.layout(width, height);

    const availH = height - top - margin;
    if (this.rounds.length === 0) {
      const cardW = Math.min(width - margin * 2, 720);
      this.clueCard.layout((width - cardW) / 2, top, cardW, Math.max(56, Math.min(150, availH * 0.25)));
      return;
    }

    // Landscape: the sky on the left; clue and word on the right.
    // Portrait: clue, sky, then the word at the bottom.
    const landscape = width >= 700 && width > height * 1.25;
    const fieldW = landscape ? width * 0.56 - margin : width - margin * 2;
    const x = landscape ? margin + fieldW + margin : margin;
    const w = width - margin - x;
    const centerX = x + w / 2;
    const gap = 12;
    const n = this.cells.length;
    const tileGap = Math.max(4, Math.min(10, w * 0.015));
    const clueH = Math.max(56, Math.min(140, availH * (landscape ? 0.3 : 0.15)));
    const statusH = Math.max(22, Math.min(36, availH * 0.055));
    const cs = Math.max(22, Math.min(80, (Math.min(w, 800) - tileGap * (n - 1)) / n, availH * (landscape ? 0.2 : 0.1)));
    const clueW = Math.min(w, 720);

    let y = top;
    if (landscape) {
      this.field = { x: margin, y: top, w: fieldW, h: availH };
      y += Math.max(0, (availH - (clueH + cs + statusH + gap * 2)) / 2);
    }
    this.clueCard.layout(centerX - clueW / 2, y, clueW, clueH);
    y += clueH + gap;
    if (!landscape) {
      const fieldH = Math.max(80, availH - (clueH + cs + statusH + gap * 3));
      this.field = { x: margin, y, w: fieldW, h: fieldH };
      y += fieldH + gap;
    }

    const left = centerX - (n * cs + (n - 1) * tileGap) / 2;
    this.cells.forEach((cell, i) => {
      cell.resizeTile(cs * 0.92, cs * 0.92, cs * 0.55);
      cell.position.set(left + i * (cs + tileGap) + cs / 2, y + cs / 2);
    });
    y += cs + gap;

    this.status.style.fontSize = statusH * 0.8;
    this.status.scale.set(1);
    this.status.scale.set(Math.min(1, w / this.status.width));
    this.status.position.set(centerX, y + statusH / 2);

    const f = this.field;
    this.fieldBg.clear().roundRect(f.x, f.y, f.w, f.h, 24).fill({ color: 0x000000, alpha: 0.22 });
    // Big enough to tap, small enough that they aren't always bumping into each other.
    this.radius = Math.max(20, Math.min(46, Math.sqrt((f.w * f.h) / Math.max(1, this.fireflies.length)) * 0.3));
    for (const firefly of this.fireflies) firefly.draw(this.radius);
    this.moveFireflies(0);
  }

  // ---- Fireflies -----------------------------------------------------------

  /** The part of the field a firefly's center can be in. */
  private get roam(): { x: number; y: number; w: number; h: number } {
    const pad = this.radius * 1.3;
    const f = this.field;
    return { x: f.x + pad, y: f.y + pad, w: Math.max(1, f.w - pad * 2), h: Math.max(1, f.h - pad * 2) };
  }

  private moveFireflies(seconds: number): void {
    const roam = this.roam;
    const flying = this.fireflies.filter((firefly) => !firefly.caught);
    const step = this.level.speed * Math.min(this.field.w, this.field.h) * seconds;

    for (const firefly of flying) {
      firefly.u += (firefly.dx * step) / roam.w;
      firefly.v += (firefly.dy * step) / roam.h;
      // Bounce off the edges.
      if (firefly.u < 0 || firefly.u > 1) firefly.dx = Math.abs(firefly.dx) * (firefly.u < 0 ? 1 : -1);
      if (firefly.v < 0 || firefly.v > 1) firefly.dy = Math.abs(firefly.dy) * (firefly.v < 0 ? 1 : -1);
      firefly.u = Math.max(0, Math.min(1, firefly.u));
      firefly.v = Math.max(0, Math.min(1, firefly.v));
    }

    // Two that touch turn away from each other, so letters don't end up hidden behind others.
    const minGap = this.radius * 2.2;
    for (let i = 0; i < flying.length; i++) {
      for (let j = i + 1; j < flying.length; j++) {
        const a = flying[i];
        const b = flying[j];
        const px = (b.u - a.u) * roam.w;
        const py = (b.v - a.v) * roam.h;
        const distance = Math.hypot(px, py);
        if (distance >= minGap || distance === 0) continue;
        const nx = px / distance;
        const ny = py / distance;
        this.steer(a, -nx, -ny);
        this.steer(b, nx, ny);
      }
    }

    for (const firefly of flying) {
      const bob = Math.sin(this.time / 400 + firefly.u * 9) * this.radius * 0.08;
      firefly.position.set(roam.x + firefly.u * roam.w + firefly.shake * this.radius, roam.y + firefly.v * roam.h + bob);
    }
    for (const firefly of this.fireflies) firefly.animate(this.time);
  }

  /** Turns a firefly's direction towards (x, y), keeping its speed. */
  private steer(firefly: Firefly, x: number, y: number): void {
    const dx = firefly.dx + x;
    const dy = firefly.dy + y;
    const length = Math.hypot(dx, dy) || 1;
    firefly.dx = dx / length;
    firefly.dy = dy / length;
  }

  // ---- Input ---------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
    const firefly = this.fireflies.find((f) => !f.caught && f.letter === e.key.toUpperCase());
    if (firefly) this.tap(firefly);
    e.preventDefault();
  };

  private sayWord(): void {
    // Lowercase, because an all-caps word can be read out as separate letters.
    if (!this.overlay.visible) speak(this.word.toLowerCase());
  }

  private setStatus(text: string): void {
    this.status.text = text;
    this.status.scale.set(1);
    this.status.scale.set(Math.min(1, (this.lastSize.width - 32) / this.status.width));
  }

  // ---- Game logic ----------------------------------------------------------

  private tap(firefly: Firefly): void {
    if (this.busy || this.overlay.visible || firefly.caught) return;
    if (firefly.letter === this.word[this.next]) this.catch(firefly);
    else this.miss(firefly);
  }

  /** The right firefly flies down into the next box. */
  private catch(firefly: Firefly): void {
    const index = this.next++;
    const cell = this.cells[index];
    firefly.caught = true;
    firefly.eventMode = 'none';
    this.missesOnLetter = 0;
    for (const other of this.fireflies) other.hinted = false;
    this.setStatus(PROMPT);
    playCatch(index);

    const from = { x: firefly.x, y: firefly.y };
    this.tweens.add(
      320,
      (t) => {
        const k = easeOutCubic(t);
        firefly.position.set(from.x + (cell.x - from.x) * k, from.y + (cell.y - from.y) * k);
        firefly.scale.set(1 - 0.5 * k);
      },
      () => {
        firefly.visible = false;
        cell.setLabel(firefly.letter);
        cell.setColor(GLOW_COLOR, DARK);
        cell.alpha = 1;
        this.tweens.add(300, (t) => cell.scale.set(1 + 0.3 * Math.sin(t * Math.PI)));
      },
    );

    if (this.next === this.word.length) {
      this.busy = true;
      this.tweens.delay(400, () => this.completeRound());
    }
  }

  /** A wrong firefly turns red and shakes; enough misses and the right one pulses. */
  private miss(firefly: Firefly): void {
    this.mistakes = true;
    this.missesOnLetter++;
    this.setStatus('Not that one. Try again!');
    playMiss();
    firefly.setMissed(true);
    this.tweens.add(
      450,
      (t) => (firefly.shake = Math.sin(t * Math.PI * 6) * 0.25 * (1 - t)),
      () => firefly.setMissed(false),
    );
    if (this.missesOnLetter >= this.level.hintAfter) {
      const target = this.fireflies.find((f) => !f.caught && f.letter === this.word[this.next]);
      if (target) target.hinted = true;
    }
  }

  private completeRound(): void {
    if (!this.mistakes) this.perfectCount++;
    this.setStatus(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    playWordDone();
    this.sayWord();

    // The fireflies left over drift away.
    for (const firefly of this.fireflies) {
      if (firefly.caught) continue;
      firefly.eventMode = 'none';
      this.tweens.add(400, (t) => {
        firefly.appear = 1 - t;
        firefly.alpha = 1 - t;
      });
    }
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
    this.tweens.delay(1700, () => (isLast ? this.finish() : this.startRound(this.roundIndex + 1)));
  }

  private finish(): void {
    const total = this.rounds.length;
    this.overlay.setMessage(
      this.perfectCount === total
        ? `Glowing!\nAll ${total} words\nwith no mistakes!`
        : `Well done!\n${this.perfectCount} of ${total} words\nwith no mistakes`,
    );
    this.overlay.layout(this.lastSize.width, this.lastSize.height);
    this.overlay.show(this.tweens);
    playWin();
  }
}
