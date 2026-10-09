import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { speak, stopSpeaking } from '../../core/speech';
import { easeOutBack, Tweens } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { LetterKeyboard } from '../../ui/LetterKeyboard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { BalloonBunch } from './BalloonBunch';
import { balloonPopLevelSelect } from './levelSelect';
import type { BalloonPopLevel } from './levels';
import { playCorrect, playLanded, playPop, playWin, playWordDone } from './sounds';

const CORRECT_COLOR = 0x06d6a0;
const REVEAL_COLOR = 0xf78c6b;
const GIVEN_COLOR = 0xd7e3fc;
const PRAISE = ['Great guessing!', 'You got it!', 'Well done!', 'Super!'];
const RIDERS = ['🧸', '🐧', '🐥', '🐒', '🐇', '🐈'];

/**
 * Guess the hidden word one letter at a time. A right letter shows up
 * everywhere it belongs; a wrong one pops a balloon. When the balloons run
 * out the word is shown and the game moves on.
 */
export class BalloonPopGame extends Scene {
  private tweens = new Tweens();
  private rounds: WordInfo[];
  private roundIndex = 0;
  private guessed = new Set<string>();
  private solvedCount = 0;
  /** True while showing a result or moving to the next word; input is ignored. */
  private busy = false;
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private bunch = new BalloonBunch();
  private cellLayer = new Container();
  private cells: Tile[] = [];
  private status: Text;
  private keyboard: LetterKeyboard;
  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: BalloonPopLevel) {
    super();
    const usable = getWordInfos(level.words).filter((w) => w.word.length >= 3 && w.word.length <= level.maxLength);
    this.rounds = shuffle(usable).slice(0, level.rounds);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(balloonPopLevelSelect(scenes, info)),
    });

    const textColor = info.textColor ?? 0xffffff;
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: textColor } });
    this.progress.anchor.set(1, 0.5);

    this.status = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: textColor, align: 'center' },
    });
    this.status.anchor.set(0.5);

    this.keyboard = new LetterKeyboard((key) => this.guess(key), 0, false);

    this.overlay = new WinOverlay({
      message: '',
      onPlayAgain: () => scenes.goTo(new BalloonPopGame(scenes, info, level)),
      onLevels: () => scenes.goTo(balloonPopLevelSelect(scenes, info)),
    });

    if (this.rounds.length === 0) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');
    this.bunch.visible = this.rounds.length > 0;

    this.addChild(this.bg, this.backButton, this.progress, this.clueCard, this.bunch, this.cellLayer, this.status, this.keyboard, this.overlay);
    if (this.rounds.length > 0) this.startRound(0);
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
    this.bunch.update(ticker.deltaMS);
  }

  private get word(): string {
    return this.rounds[this.roundIndex]?.word ?? '';
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.busy = false;
    this.guessed.clear();
    for (const cell of this.cells) cell.destroy({ children: true });

    const round = this.rounds[index];
    this.cells = [...round.word].map(() => {
      const cell = new Tile('');
      cell.eventMode = 'none';
      this.cellLayer.addChild(cell);
      return cell;
    });

    this.bunch.reset(this.level.balloons, RIDERS[Math.floor(Math.random() * RIDERS.length)]);
    this.keyboard.setLetters(null);
    this.status.text = '';
    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.clueCard.setClue(
      this.level.showPictures ? (round.picture ?? '') : '',
      this.level.showClues && round.clue ? round.clue : 'Guess the hidden word',
    );

    if (this.level.revealFirstLetter) {
      const first = round.word[0];
      this.guessed.add(first);
      this.markKey(first, true);
      this.reveal(first, GIVEN_COLOR);
    }
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);

    this.cells.forEach((cell, i) => {
      const delay = i * 35;
      const total = 250 + delay;
      cell.scale.set(0);
      this.tweens.add(total, (t) => cell.scale.set(easeOutBack(Math.max(0, (t * total - delay) / 250))));
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

    const availH = height - top - margin;
    if (this.rounds.length === 0) {
      const cardW = Math.min(width - margin * 2, 720);
      this.clueCard.layout((width - cardW) / 2, top, cardW, Math.max(56, Math.min(150, availH * 0.25)));
      return;
    }

    // Landscape: balloons on the left, everything else on the right.
    // Portrait: clue, balloons, word, then the keyboard at the bottom.
    const landscape = width >= 700 && width > height * 1.25;
    const bunchW = landscape ? width * 0.36 : 0;
    const x = margin + bunchW;
    const w = width - margin - x;
    const gap = 12;
    const n = this.cells.length;
    const tileGap = Math.max(4, Math.min(10, w * 0.015));
    const clueH = Math.max(56, Math.min(140, availH * (landscape ? 0.24 : 0.16)));
    const statusH = Math.max(24, Math.min(36, availH * 0.06));
    const cs = Math.max(22, Math.min(84, (Math.min(w, 800) - tileGap * (n - 1)) / n, availH * (landscape ? 0.18 : 0.11)));
    const keyboardW = Math.min(w, 720);
    // The keyboard gets what's left, so it never runs off a short screen.
    const keyboardRoom = Math.max(60, availH - (clueH + cs + statusH + gap * 3));
    const keyboardH = this.keyboard.measure(keyboardW, landscape ? keyboardRoom : Math.min(keyboardRoom, availH * 0.42)).height;
    const cardW = Math.min(w, 720);
    const centerX = x + w / 2;

    let bunchH = 0;
    let y = top;
    if (landscape) {
      this.bunch.layout(margin, top, bunchW - margin, availH);
      y += Math.max(0, (availH - (clueH + cs + statusH + keyboardH + gap * 3)) / 2);
    } else {
      bunchH = Math.max(0, availH - (clueH + cs + statusH + keyboardH + gap * 4));
    }

    this.clueCard.layout(centerX - cardW / 2, y, cardW, clueH);
    y += clueH + gap;
    if (!landscape) {
      this.bunch.layout(x, y, w, bunchH);
      y += bunchH + gap;
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
    y += statusH + gap;

    this.keyboard.layout(centerX - keyboardW / 2, y, keyboardW, keyboardH);
  }

  // ---- Input ---------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
    this.guess(e.key.toUpperCase());
    e.preventDefault();
  };

  // ---- Game logic ----------------------------------------------------------

  private guess(letter: string): void {
    if (this.busy || this.overlay.visible || this.guessed.has(letter) || this.rounds.length === 0) return;
    this.guessed.add(letter);
    const word = this.word;
    const correct = word.includes(letter);
    this.markKey(letter, correct);

    if (correct) {
      this.reveal(letter, CORRECT_COLOR);
      if ([...word].every((l) => this.guessed.has(l))) this.finishRound(true);
      else playCorrect();
    } else {
      this.bunch.pop(this.tweens);
      playPop();
      if (this.bunch.remaining === 0) this.finishRound(false);
    }
  }

  /** Turns a used key off: green if the letter is in the word, faded if not. */
  private markKey(letter: string, correct: boolean): void {
    // The full keyboard's keys are in A–Z order.
    const key = this.keyboard.keys[letter.charCodeAt(0) - 65];
    if (!key) return;
    key.eventMode = 'none';
    key.scale.set(1);
    if (correct) key.tint = CORRECT_COLOR;
    else key.alpha = 0.3;
  }

  /** Shows `letter` in every cell it belongs to. */
  private reveal(letter: string, color: number): void {
    [...this.word].forEach((l, i) => {
      if (l !== letter) return;
      const cell = this.cells[i];
      cell.setLabel(letter);
      cell.setColor(color, color === GIVEN_COLOR ? DARK : undefined);
      this.tweens.add(300, (t) => cell.scale.set(1 + 0.3 * Math.sin(t * Math.PI)));
    });
  }

  private finishRound(solved: boolean): void {
    this.busy = true;
    const word = this.word;
    if (solved) {
      this.solvedCount++;
      this.status.text = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      this.bunch.celebrate(this.tweens);
      playWordDone();
      // Wave through the finished word.
      this.cells.forEach((cell, i) => {
        const delay = 300 + i * 60;
        const total = 350 + delay;
        this.tweens.add(total, (t) => {
          const p = Math.max(0, (t * total - delay) / 350);
          cell.scale.set(1 + 0.25 * Math.sin(p * Math.PI));
        });
      });
    } else {
      this.status.text = `The word was ${word}`;
      for (const letter of new Set(word)) if (!this.guessed.has(letter)) this.reveal(letter, REVEAL_COLOR);
      playLanded();
    }
    this.resize(this.lastSize.width, this.lastSize.height);
    // Lowercase, because an all-caps word can be read out as separate letters.
    speak(word.toLowerCase());

    const isLast = this.roundIndex === this.rounds.length - 1;
    this.tweens.delay(solved ? 1600 : 2800, () => (isLast ? this.finish() : this.startRound(this.roundIndex + 1)));
  }

  private finish(): void {
    const total = this.rounds.length;
    this.overlay.setMessage(
      this.solvedCount === total
        ? `Amazing!\nYou guessed all ${total} words!`
        : `Good try!\nYou guessed ${this.solvedCount} of ${total} words!`,
    );
    this.overlay.layout(this.lastSize.width, this.lastSize.height);
    this.overlay.show(this.tweens);
    playWin();
  }
}
