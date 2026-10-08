import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { canSpeak, speak, stopSpeaking } from '../../core/speech';
import { easeOutBack, Tweens } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { BACKSPACE, LetterKeyboard } from '../../ui/LetterKeyboard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile, TILE_COLOR } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { bankLetters } from './bankLetters';
import { spellingBeeLevelSelect } from './levelSelect';
import type { SpellingBeeLevel } from './levels';

const CORRECT_COLOR = 0x06d6a0;
const WRONG_COLOR = 0xef476f;
const REVEAL_COLOR = 0xf78c6b;
const CARET_COLOR = 0xffd166;
const GIVEN_COLOR = 0xd7e3fc;
const PRAISE = ['Great spelling!', 'You got it!', 'Well done!', 'Super!'];

/**
 * Hear a word, then spell it. A full word is checked right away: right letters
 * lock in green and wrong ones are cleared for another try. After `maxTries`
 * wrong attempts the answer is shown and the game moves on.
 */
export class SpellingBeeGame extends Scene {
  private tweens = new Tweens();
  private rounds: WordInfo[];
  private roundIndex = 0;
  private letters: (string | null)[] = [];
  private locked: boolean[] = [];
  private given: boolean[] = [];
  private wrong = new Set<number>();
  private revealed = new Set<number>();
  private solved = false;
  private caret = 0;
  private tries = 0;
  private firstTryCount = 0;
  /** True while showing a result or moving to the next word; input is ignored. */
  private busy = false;
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private hearButton: Button;
  private slowButton: Button;
  private cellLayer = new Container();
  private cells: Tile[] = [];
  private status: Text;
  private keyboard: LetterKeyboard;
  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: SpellingBeeLevel) {
    super();
    // Without speech the clue is the only way to know the word, so require one.
    const usable = getWordInfos(level.words).filter((w) => w.word.length <= 10 && (canSpeak || w.clue));
    this.rounds = shuffle(usable).slice(0, level.rounds);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(spellingBeeLevelSelect(scenes, info)),
    });

    const textColor = info.textColor ?? 0xffffff;
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: textColor } });
    this.progress.anchor.set(1, 0.5);

    this.hearButton = new Button({ label: '🔊 Hear it', width: 200, height: 64, color: 0xffd166, textColor: DARK, onClick: () => this.sayWord(0.9) });
    this.slowButton = new Button({ label: '🐢 Slowly', width: 200, height: 64, color: DARK, onClick: () => this.sayWord(0.5) });
    this.hearButton.visible = this.slowButton.visible = canSpeak && this.rounds.length > 0;

    this.status = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: textColor, align: 'center' },
    });
    this.status.anchor.set(0.5);

    this.keyboard = new LetterKeyboard(
      (key) => (key === BACKSPACE ? this.backspace() : this.typeLetter(key)),
      level.keyboard === 'bank' ? 8 : 0,
    );

    this.overlay = new WinOverlay({
      message: '',
      onPlayAgain: () => scenes.goTo(new SpellingBeeGame(scenes, info, level)),
      onLevels: () => scenes.goTo(spellingBeeLevelSelect(scenes, info)),
    });

    if (this.rounds.length === 0) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');

    this.addChild(this.bg, this.backButton, this.progress, this.clueCard, this.hearButton, this.slowButton, this.cellLayer, this.status, this.keyboard, this.overlay);
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
  }

  private get word(): string {
    return this.rounds[this.roundIndex]?.word ?? '';
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.tries = 0;
    this.busy = false;
    this.solved = false;
    this.wrong.clear();
    this.revealed.clear();
    const word = this.word;
    const round = this.rounds[index];

    this.letters = [...word].map(() => null);
    this.locked = [...word].map(() => false);
    this.given = [...word].map(() => false);
    if (this.level.revealFirstLetter) {
      this.letters[0] = word[0];
      this.locked[0] = this.given[0] = true;
    }
    this.caret = this.firstEmpty() ?? 0;

    for (const cell of this.cells) cell.destroy({ children: true });
    this.cells = [...word].map((_, i) => {
      const cell = new Tile('');
      cell.cursor = 'pointer';
      cell.on('pointertap', () => this.moveCaretTo(i));
      this.cellLayer.addChild(cell);
      return cell;
    });

    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    const showPicture = this.level.showPictures || !canSpeak;
    const showClue = this.level.showClues || !canSpeak;
    this.clueCard.setClue(
      showPicture ? (round.picture ?? '') : '',
      showClue && round.clue ? round.clue : 'Listen, then spell the word',
    );
    this.status.text = canSpeak ? '' : 'Sound is off in this browser: use the clue';
    this.keyboard.setLetters(this.level.keyboard === 'bank' ? bankLetters(word, this.level.extraLetters) : null);
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);
    this.drawCells();

    this.cells.forEach((cell, i) => {
      const delay = i * 40;
      const total = 250 + delay;
      cell.scale.set(0);
      this.tweens.add(total, (t) => cell.scale.set(easeOutBack(Math.max(0, (t * total - delay) / 250))));
    });
    this.tweens.delay(400, () => this.sayWord(0.9));
  }

  // ---- Layout --------------------------------------------------------------

  resize(width: number, height: number): void {
    this.lastSize = { width, height };
    const margin = 16;
    const top = 96;
    const gap = 12;
    this.bg.clear().rect(0, 0, width, height).fill(this.info.color);
    this.backButton.position.set(16 + 85, 16 + 32);
    this.progress.position.set(width - 24, 48);
    this.overlay.layout(width, height);

    const availH = height - top - margin;
    if (this.rounds.length === 0) {
      this.clueCard.layout(margin, top, width - margin * 2, Math.min(140, availH));
      return;
    }

    // Wide: word area on the left, keyboard on the right. Otherwise keyboard along the bottom.
    const wide = width > height && width >= 700;
    const colW = wide ? (width - margin * 3) * 0.55 : width - margin * 2;
    let areaH = availH;
    if (wide) {
      const keysW = width - margin * 3 - colW;
      const { height: keysH } = this.keyboard.measure(keysW, availH);
      this.keyboard.layout(margin * 2 + colW, top + (availH - keysH) / 2, keysW, keysH);
    } else {
      const { height: keysH } = this.keyboard.measure(colW, availH * 0.38);
      this.keyboard.layout(margin, height - margin - keysH, colW, keysH);
      areaH = availH - keysH - gap;
    }

    const n = this.cells.length;
    const clueH = Math.max(56, Math.min(140, areaH * 0.3));
    const audioH = canSpeak ? Math.max(44, Math.min(64, areaH * 0.15)) : 0;
    const statusH = Math.max(24, Math.min(40, areaH * 0.09));
    const tileGap = Math.max(4, Math.min(10, colW * 0.015));
    const s = Math.max(24, Math.min(80, (Math.min(colW, 800) - tileGap * (n - 1)) / n, areaH - clueH - audioH - statusH - gap * 3));
    const groupH = clueH + gap + (audioH ? audioH + gap : 0) + s + gap + statusH;
    let y = top + Math.max(0, (areaH - groupH) / 2);
    const centerX = margin + colW / 2;

    const cardW = Math.min(colW, 680);
    this.clueCard.layout(centerX - cardW / 2, y, cardW, clueH);
    y += clueH + gap;

    if (audioH) {
      const buttonW = Math.min(200, (colW - gap) / 2);
      this.hearButton.setSize(buttonW, audioH);
      this.slowButton.setSize(buttonW, audioH);
      this.hearButton.position.set(centerX - buttonW / 2 - gap / 2, y + audioH / 2);
      this.slowButton.position.set(centerX + buttonW / 2 + gap / 2, y + audioH / 2);
      y += audioH + gap;
    }

    const rowW = n * s + (n - 1) * tileGap;
    this.cells.forEach((cell, i) => {
      cell.resizeTile(s * 0.92, s * 0.92, s * 0.55);
      cell.position.set(centerX - rowW / 2 + i * (s + tileGap) + s / 2, y + s / 2);
    });
    y += s + gap;

    this.status.style.fontSize = statusH * 0.75;
    this.status.scale.set(1);
    this.status.scale.set(Math.min(1, colW / Math.max(1, this.status.width)));
    this.status.position.set(centerX, y + statusH / 2);
  }

  // ---- Input ---------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-z]$/i.test(e.key)) {
      this.typeLetter(e.key.toUpperCase());
    } else if (e.key === 'Backspace') {
      this.backspace();
    } else if (e.key === 'Enter') {
      this.sayWord(0.9);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      this.moveCaret(e.key === 'ArrowRight' ? 1 : -1);
    } else {
      return;
    }
    e.preventDefault();
  };

  private canType(): boolean {
    return !this.busy && !this.overlay.visible && this.rounds.length > 0;
  }

  private sayWord(rate: number): void {
    if (this.rounds.length === 0) return;
    speak(this.word.toLowerCase(), { rate });
  }

  private typeLetter(letter: string): void {
    if (!this.canType()) return;
    let index: number | null = this.caret;
    if (this.locked[index]) index = this.nextUnlocked(index);
    if (index === null) return;

    if (this.level.speakLetters) speak(letter, { rate: 1 });
    this.letters[index] = letter;
    const cell = this.cells[index];
    this.tweens.add(150, (t) => cell.scale.set(1.2 - 0.2 * t));
    this.caret = this.nextUnlocked(index) ?? this.firstEmpty() ?? index;
    this.drawCells();

    if (this.letters.every((l) => l !== null)) {
      this.busy = true;
      this.tweens.delay(250, () => this.check());
    }
  }

  private backspace(): void {
    if (!this.canType()) return;
    if (!this.locked[this.caret] && this.letters[this.caret] !== null) {
      this.letters[this.caret] = null;
    } else {
      for (let i = this.caret - 1; i >= 0; i--) {
        if (this.locked[i]) continue;
        this.letters[i] = null;
        this.caret = i;
        break;
      }
    }
    this.drawCells();
  }

  private moveCaretTo(index: number): void {
    if (!this.canType() || this.locked[index]) return;
    this.caret = index;
    this.drawCells();
  }

  private moveCaret(direction: 1 | -1): void {
    for (let i = this.caret + direction; i >= 0 && i < this.letters.length; i += direction) {
      if (!this.locked[i]) {
        this.moveCaretTo(i);
        return;
      }
    }
  }

  private nextUnlocked(index: number): number | null {
    for (let i = index + 1; i < this.letters.length; i++) if (!this.locked[i]) return i;
    return null;
  }

  private firstEmpty(): number | null {
    const i = this.letters.findIndex((l, j) => l === null && !this.locked[j]);
    return i === -1 ? null : i;
  }

  // ---- Game logic ----------------------------------------------------------

  private check(): void {
    const word = this.word;
    const wrong = this.letters.map((l, i) => (l === word[i] ? -1 : i)).filter((i) => i !== -1);

    if (wrong.length === 0) {
      this.succeed();
      return;
    }

    this.tries++;
    this.letters.forEach((_, i) => {
      if (!wrong.includes(i)) this.locked[i] = true;
    });

    if (this.tries >= this.level.maxTries) {
      this.reveal(wrong);
      return;
    }

    const left = this.level.maxTries - this.tries;
    this.setStatus(`Not quite! ${left} ${left === 1 ? 'try' : 'tries'} left`);
    for (const i of wrong) this.wrong.add(i);
    this.drawCells();
    this.tweens.add(400, (t) => (this.cellLayer.pivot.x = Math.sin(t * Math.PI * 6) * 8 * (1 - t)));
    this.tweens.delay(900, () => {
      for (const i of wrong) this.letters[i] = null;
      this.wrong.clear();
      this.caret = this.firstEmpty() ?? 0;
      this.busy = false;
      this.drawCells();
    });
  }

  private succeed(): void {
    if (this.tries === 0) this.firstTryCount++;
    this.solved = true;
    this.locked = this.locked.map(() => true);
    this.setStatus(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    this.drawCells();
    this.sayWord(0.9);
    this.cells.forEach((cell, i) => {
      const delay = i * 60;
      const total = 350 + delay;
      this.tweens.add(total, (t) => cell.scale.set(1 + 0.25 * Math.sin(Math.max(0, (t * total - delay) / 350) * Math.PI)));
    });
    this.tweens.delay(1500, () => this.nextRound());
  }

  /** Out of tries: show the right spelling, highlighting the letters that were wrong. */
  private reveal(wrong: number[]): void {
    for (const i of wrong) this.revealed.add(i);
    this.letters = [...this.word];
    this.locked = this.locked.map(() => true);
    this.setStatus(`The word is ${this.word}`);
    this.drawCells();
    this.sayWord(0.7);
    this.tweens.delay(2500, () => this.nextRound());
  }

  private nextRound(): void {
    if (this.roundIndex < this.rounds.length - 1) {
      this.startRound(this.roundIndex + 1);
      return;
    }
    const total = this.rounds.length;
    this.overlay.setMessage(
      this.firstTryCount === total
        ? `Perfect!\nYou spelled all ${total} words\non the first try!`
        : `Great job!\nYou spelled ${this.firstTryCount} of ${total} words\non the first try!`,
    );
    this.resize(this.lastSize.width, this.lastSize.height);
    this.overlay.show(this.tweens);
  }

  private setStatus(text: string): void {
    this.status.text = text;
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);
  }

  private drawCells(): void {
    this.cells.forEach((cell, i) => {
      cell.setLabel(this.letters[i] ?? '');
      if (this.wrong.has(i)) cell.setColor(WRONG_COLOR);
      else if (this.revealed.has(i)) cell.setColor(REVEAL_COLOR);
      else if (this.solved || (this.locked[i] && !this.given[i])) cell.setColor(CORRECT_COLOR);
      else if (this.given[i]) cell.setColor(GIVEN_COLOR, DARK);
      else if (i === this.caret && !this.busy) cell.setColor(CARET_COLOR, DARK);
      else cell.setColor(TILE_COLOR);
    });
  }
}
