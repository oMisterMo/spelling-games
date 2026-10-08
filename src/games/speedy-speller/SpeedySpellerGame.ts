import { Container, Graphics, Rectangle, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { speak, stopSpeaking } from '../../core/speech';
import { Tweens, type Tween } from '../../core/Tweens';
import { getWordInfos, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { DARK, EMOJI_FONT_FAMILY, FONT_FAMILY } from '../../ui/theme';
import type { GameInfo } from '../registry';
import { Backdrop } from './Backdrop';
import { speedySpellerLevelSelect } from './levelSelect';
import type { SpeedySpellerLevel } from './levels';
import { gridLetters, gridShape, starsFor } from './makeGrid';
import { ResultCard } from './ResultCard';
import { playCorrect, playHint, playIncorrect, playLose, playTick, playWin, playWordDone } from './sounds';
import { SpellerTile } from './SpellerTile';
import { THEMES, type SpellerTheme } from './themes';

/** The clock turns red and starts ticking with this many seconds left. */
const WARNING_SECONDS = 30;
/** A word finished this quickly, with no mistakes or hints, earns a speed bonus. */
const SPEED_BONUS_SECONDS = 20;
const MAX_WORD_LENGTH = 10;
const BLUE = 0x1e88e5;
const GREY = 0x6b6f70;
const GREEN = 0x43a047;
const RED = 0xe53935;
const CONFETTI_COLORS = [0xf5a623, 0x1e88e5, 0x4caf50, 0xe53935, 0xfff176, 0x90caf9, 0xf48fb1];
const STAR_MESSAGES = ['', 'Keep going!', 'Good work!', 'Perfect!'];

interface WordResult {
  word: string;
  stars: number;
  mistakes: number;
  hints: number;
  speedBonus: boolean;
}

/**
 * See a word, then spell it against the clock by tapping its letters in order
 * in a grid that holds several copies of them. The word is finished once every
 * copy has been spelled. Stars depend on time left, mistakes and hints.
 */
export class SpeedySpellerGame extends Scene {
  private tweens = new Tweens();
  private theme: SpellerTheme;
  private rounds: WordInfo[];
  private roundIndex = 0;
  /** 'intro': showing the word. 'playing': the clock is running. 'done': the word is finished or time ran out. */
  private phase: 'intro' | 'playing' | 'done' = 'intro';
  /** True for a moment after the last letter of a copy, until its tiles are cleared. */
  private busy = false;
  private tiles: SpellerTile[] = [];
  /** Tiles picked so far for the copy being spelled. */
  private attempt: SpellerTile[] = [];
  private completed = 0;
  private mistakes = 0;
  private hints = 0;
  /** Milliseconds. */
  private timeLeft = 0;
  private elapsed = 0;
  private shownSeconds = -1;
  private showWord = false;
  private results: WordResult[] = [];
  private time = 0;
  private toastTween?: Tween;
  private lastSize = { width: 0, height: 0 };
  private timerRect = new Rectangle();
  private attemptRect = new Rectangle();
  private dotsRect = new Rectangle();

  private backdrop: Backdrop;
  private backButton: Button;
  private progress: Text;
  private dots = new Graphics();
  private panel = new Graphics();
  private soundButton: Button;
  private hintButton: Button;
  private restartButton: Button;
  private timerBar = new Graphics();
  private timerLabel: Text;
  private toggle = new Container();
  private toggleSwitch = new Graphics();
  private attemptLines = new Graphics();
  private attemptLayer = new Container();
  private attemptTexts: Text[] = [];
  private gridLayer = new Container();
  private fxLayer = new Container();
  private toast = new Container();
  private toastBg = new Graphics();
  private toastText: Text;
  private intro = new Container();
  private introBg = new Graphics();
  private introBody = new Container();
  private introPrompt: Text;
  private introPicture: Text;
  private introWord: Text;
  private introHint: Text;
  private goButton: Button;
  private card = new ResultCard();
  private confettiLayer = new Container();

  constructor(private scenes: SceneManager, private info: GameInfo, private level: SpeedySpellerLevel) {
    super();
    this.theme = THEMES[level.theme];
    const usable = getWordInfos(level.words).filter((w) => w.word.length <= MAX_WORD_LENGTH);
    this.rounds = shuffle(usable).slice(0, level.rounds);

    this.backdrop = new Backdrop(this.theme);
    this.backButton = new Button({ label: '← Levels', width: 170, height: 64, color: DARK, fontSize: 26, onClick: () => this.toLevels() });
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: 0xffffff } });
    this.progress.anchor.set(1, 0.5);

    this.soundButton = new Button({ label: '🔊', width: 52, height: 52, color: 0x8e24aa, onClick: () => this.sayWord() });
    this.hintButton = new Button({ label: 'Hint', width: 90, height: 52, color: BLUE, fontSize: 24, onClick: () => this.useHint() });
    this.restartButton = new Button({ label: '↻', width: 52, height: 52, color: 0x8e24aa, fontSize: 32, onClick: () => this.startRound(this.roundIndex) });
    this.timerLabel = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 22, fontWeight: 'bold', fill: GREY } });
    this.timerLabel.anchor.set(1, 0.5);

    // "Show" switch: reveals the word in the answer row.
    const toggleText = new Text({ text: 'Show', style: { fontFamily: FONT_FAMILY, fontSize: 22, fontWeight: 'bold', fill: GREY } });
    toggleText.anchor.set(0, 0.5);
    this.toggleSwitch.x = 64;
    this.toggle.addChild(toggleText, this.toggleSwitch);
    this.toggle.hitArea = new Rectangle(-6, -26, 136, 52);
    this.toggle.eventMode = 'static';
    this.toggle.cursor = 'pointer';
    this.toggle.on('pointertap', () => {
      this.showWord = !this.showWord;
      this.drawToggle();
      this.drawAttempt();
    });

    this.toastText = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 'bold', fill: 0xffffff } });
    this.toastText.anchor.set(0.5);
    this.toast.addChild(this.toastBg, this.toastText);
    this.toast.visible = false;

    this.introPrompt = new Text({
      text: this.rounds.length > 0 ? 'SPELL THE WORD' : 'Not enough words!\nAdd some to src/data/wordLists.ts',
      style: { fontFamily: FONT_FAMILY, fontSize: 28, fontWeight: 'bold', fill: GREY, align: 'center', letterSpacing: 2 },
    });
    this.introPicture = new Text({ text: '', style: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 88 } });
    this.introWord = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 80, fontWeight: 'bold', fill: BLUE, letterSpacing: 6 } });
    this.introHint = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 26, fontStyle: 'italic', fill: GREY, align: 'center', wordWrap: true },
    });
    for (const text of [this.introPrompt, this.introPicture, this.introWord, this.introHint]) text.anchor.set(0.5);
    this.goButton = new Button({ label: "Let's Go!", width: 240, height: 80, color: BLUE, fontSize: 34, onClick: () => this.dismissIntro() });
    this.goButton.visible = this.rounds.length > 0;
    this.introBg.eventMode = 'static'; // Swallow taps so the grid underneath can't be played.
    this.introBody.addChild(this.introPrompt, this.introPicture, this.introWord, this.introHint, this.goButton);
    this.intro.addChild(this.introBg, this.introBody);

    this.addChild(
      this.backdrop,
      this.progress,
      this.dots,
      this.panel,
      this.soundButton,
      this.hintButton,
      this.restartButton,
      this.timerBar,
      this.timerLabel,
      this.toggle,
      this.attemptLines,
      this.attemptLayer,
      this.gridLayer,
      this.fxLayer,
      this.toast,
      this.intro,
      this.backButton,
      this.card,
      this.confettiLayer,
    );
    this.drawToggle();
    if (this.rounds.length > 0) this.startRound(0);
  }

  onExit(): void {
    stopSpeaking();
  }

  update(ticker: Ticker): void {
    this.time += ticker.deltaMS;
    this.tweens.update(ticker.deltaMS);
    this.backdrop.draw(this.lastSize.width, this.lastSize.height, this.time);

    if (this.theme.floats) {
      for (const tile of this.tiles) {
        if (!tile.used) tile.y = tile.home.y + Math.sin(this.time / 700 + tile.floatOffset) * 3;
      }
    }

    if (this.phase !== 'playing') return;
    this.timeLeft = Math.max(0, this.timeLeft - ticker.deltaMS);
    this.elapsed += ticker.deltaMS;
    this.drawTimer();
    if (this.timeLeft <= 0) this.endRound(false);
  }

  private get word(): string {
    return this.rounds[this.roundIndex]?.word ?? '';
  }

  private startRound(index: number): void {
    // A fresh runner drops any animations still playing on the old tiles.
    this.tweens = new Tweens();
    this.roundIndex = index;
    this.phase = 'intro';
    this.busy = false;
    this.attempt = [];
    this.completed = 0;
    this.mistakes = 0;
    this.hints = 0;
    this.timeLeft = this.level.seconds * 1000;
    this.elapsed = 0;
    this.shownSeconds = -1;
    this.showWord = false;
    const word = this.word;
    const round = this.rounds[index];

    for (const layer of [this.gridLayer, this.fxLayer, this.confettiLayer, this.attemptLayer]) {
      for (const child of layer.removeChildren()) child.destroy({ children: true });
    }
    this.tiles = gridLetters(word, this.level.copies).map((letter) => {
      const tile = new SpellerTile(letter, this.theme);
      tile.on('pointertap', () => this.pick(tile));
      this.gridLayer.addChild(tile);
      return tile;
    });
    this.attemptTexts = [...word].map(() => {
      const text = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 30, fontWeight: 'bold', fill: DARK } });
      text.anchor.set(0.5);
      this.attemptLayer.addChild(text);
      return text;
    });

    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.introPicture.text = round.picture ?? '';
    this.introWord.text = word;
    this.introHint.text = round.clue ?? `Word ${index + 1} of ${this.rounds.length}`;
    this.intro.visible = true;
    this.card.hide();
    this.toast.visible = false;
    this.drawToggle();
    this.sayWord();
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);
  }

  // ---- Layout --------------------------------------------------------------

  resize(width: number, height: number): void {
    this.lastSize = { width, height };
    const margin = 16;
    const gap = 12;
    this.backdrop.draw(width, height, this.time);
    this.backButton.position.set(margin + 85, margin + 32);
    this.progress.position.set(width - margin, margin + 32);
    const dotsLeft = margin + 170 + gap;
    this.dotsRect = new Rectangle(dotsLeft, margin, Math.max(0, width - margin - this.progress.width - gap - dotsLeft), 64);
    this.card.layout(width, height);
    this.layoutIntro(width, height);

    // The white panel: buttons and the "Show" switch, the clock, then the answer row.
    // When there's room, the clock sits between the buttons and the switch instead.
    // On a short, wide screen the panel moves to the left so the grid can use the full height.
    const sideBySide = width > height && height < 560;
    const pad = 10;
    const buttonH = 52;
    const panelW = sideBySide ? Math.min(360, width * 0.45) : Math.min(width - margin * 2, 760);
    const panelX = sideBySide ? margin : (width - panelW) / 2;
    const panelY = margin + 64 + gap;
    const wide = panelW >= 640;
    const answerH = 44;
    const clockH = 18;
    const panelH = pad + buttonH + (wide ? 0 : 8 + clockH) + 8 + answerH + pad;
    this.panel.clear().roundRect(panelX, panelY, panelW, panelH, 20).fill(0xffffff);

    const rowY = panelY + pad + buttonH / 2;
    this.soundButton.position.set(panelX + pad + 26, rowY);
    this.hintButton.position.set(panelX + pad + 52 + 8 + 45, rowY);
    this.restartButton.position.set(panelX + pad + 52 + 8 + 90 + 8 + 26, rowY);
    const buttonsRight = panelX + pad + 52 + 8 + 90 + 8 + 52;
    this.toggle.position.set(panelX + panelW - pad - 124, rowY);

    const labelW = 58;
    const clockLeft = wide ? buttonsRight + 16 : panelX + pad;
    const clockRight = wide ? this.toggle.x - 16 : panelX + panelW - pad;
    const clockY = wide ? rowY : panelY + pad + buttonH + 8 + clockH / 2;
    this.timerRect = new Rectangle(clockLeft, clockY - clockH / 2, clockRight - labelW - clockLeft, clockH);
    this.timerLabel.position.set(clockRight, clockY);
    this.attemptRect = new Rectangle(panelX + pad, panelY + panelH - pad - answerH, panelW - pad * 2, answerH);

    const gridLeft = sideBySide ? panelX + panelW + gap : margin;
    const gridTop = sideBySide ? panelY : panelY + panelH + gap;
    this.layoutTiles(gridLeft, gridTop, width - margin - gridLeft, Math.max(60, height - margin - gridTop));
    // Over the dots and word count, where it can't hide a tile.
    this.toast.position.set(width - margin, margin + 32);

    this.drawDots();
    this.drawTimer();
    this.drawAttempt();
  }

  private layoutIntro(width: number, height: number): void {
    this.introBg.clear().rect(0, 0, width, height).fill(0xffffff);
    const maxW = Math.min(600, width - 48);
    this.introHint.style.wordWrapWidth = maxW;
    for (const text of [this.introPrompt, this.introWord]) {
      text.scale.set(1);
      text.scale.set(Math.min(1, maxW / text.width));
    }

    const gap = 16;
    const items = [this.introPrompt, this.introPicture, this.introWord, this.introHint, this.goButton].filter(
      (item) => item.visible && (item instanceof Button || item.text !== ''),
    );
    const heights = items.map((item) => (item instanceof Button ? 80 + gap : item.height));
    const total = heights.reduce((sum, h) => sum + h, 0) + gap * (items.length - 1);
    let y = -total / 2;
    items.forEach((item, i) => {
      item.position.set(0, y + heights[i] / 2);
      y += heights[i] + gap;
    });

    // Keep clear of the back button at the top.
    const top = 96;
    this.introBody.scale.set(Math.min(1, (height - top - 16) / total));
    this.introBody.position.set(width / 2, top + (height - top) / 2);
  }

  private layoutTiles(x: number, y: number, w: number, h: number): void {
    const total = this.tiles.length;
    if (total === 0) return;
    const { cols, rows } = gridShape(total, w / h);
    const cellW = w / cols;
    const cellH = h / rows;
    const diameter = Math.floor(Math.min(cellW, cellH) * 0.86);
    const lastRowCount = total - cols * (rows - 1);

    this.tiles.forEach((tile, i) => {
      const row = Math.floor(i / cols);
      // Center the last row when it isn't full.
      const indent = row === rows - 1 ? ((cols - lastRowCount) * cellW) / 2 : 0;
      tile.home.set(x + indent + ((i % cols) + 0.5) * cellW, y + (row + 0.5) * cellH);
      tile.position.copyFrom(tile.home);
      tile.resizeTile(diameter);
    });
  }

  private drawDots(pop = 1): void {
    const { x, y, width, height } = this.dotsRect;
    const n = this.level.copies;
    const spacing = Math.min(34, width / n);
    const radius = spacing * 0.36;
    this.dots.clear();
    for (let i = 0; i < n; i++) {
      const done = i < this.completed;
      const scale = i === this.completed - 1 ? pop : 1;
      this.dots
        .circle(x + width / 2 + (i - (n - 1) / 2) * spacing, y + height / 2, radius * scale)
        .fill(done ? 0x7ee081 : { color: 0xffffff, alpha: 0.35 })
        .stroke({ color: 0xffffff, width: 2 });
    }
  }

  private drawTimer(): void {
    const seconds = Math.ceil(this.timeLeft / 1000);
    const warning = seconds <= WARNING_SECONDS;
    if (seconds !== this.shownSeconds) {
      this.shownSeconds = seconds;
      this.timerLabel.text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      this.timerLabel.style.fill = warning ? RED : GREY;
      if (warning && this.phase === 'playing') playTick();
    }

    const { x, y, width, height } = this.timerRect;
    const fraction = this.timeLeft / (this.level.seconds * 1000);
    this.timerBar.clear().roundRect(x, y, width, height, height / 2).fill(0xe0e0e0);
    if (fraction > 0) {
      this.timerBar.roundRect(x, y, Math.max(height, width * fraction), height, height / 2).fill(warning ? RED : GREEN);
    }
    // Pulse while time is short.
    this.timerBar.alpha = warning && this.phase === 'playing' ? 0.7 + 0.3 * Math.cos(this.time / 130) : 1;
  }

  /** The answer row: one underlined space per letter, filled in as tiles are picked. */
  private drawAttempt(): void {
    const { x, y, width, height } = this.attemptRect;
    const word = this.word;
    const slotW = Math.min(44, width / word.length);
    const left = x + (width - slotW * word.length) / 2;
    this.attemptLines.clear();

    this.attemptTexts.forEach((text, i) => {
      const filled = i < this.attempt.length;
      text.text = filled || this.showWord ? word[i] : '';
      text.style.fill = filled ? DARK : GREY;
      text.scale.set(Math.min(1, (slotW * 0.8) / 30));
      text.position.set(left + (i + 0.5) * slotW, y + height / 2 - 3);
      this.attemptLines.roundRect(left + i * slotW + slotW * 0.1, y + height - 5, slotW * 0.8, 5, 2).fill(filled ? BLUE : 0xd4d4d4);
    });
  }

  private drawToggle(): void {
    this.toggleSwitch
      .clear()
      .roundRect(0, -15, 60, 30, 15)
      .fill(this.showWord ? GREEN : 0x616161)
      .circle(this.showWord ? 45 : 15, 0, 13)
      .fill(0xffffff);
  }

  // ---- Input ---------------------------------------------------------------

  private toLevels(): void {
    this.scenes.goTo(speedySpellerLevelSelect(this.scenes, this.info));
  }

  private sayWord(): void {
    const round = this.rounds[this.roundIndex];
    if (!round) return;
    // Lowercase, because an all-caps word can be read out as separate letters.
    const word = round.word.toLowerCase();
    speak(round.clue ? `Spell ${word}. ${round.clue}` : `Spell ${word}`, { rate: 0.88 });
  }

  private dismissIntro(): void {
    this.intro.visible = false;
    this.phase = 'playing';
  }

  private pick(tile: SpellerTile): void {
    if (this.phase !== 'playing' || this.busy || tile.used || tile.picked) return;
    const position = this.attempt.length;

    if (tile.letter !== this.word[position]) {
      this.mistakes++;
      playIncorrect();
      tile.setLook('wrong');
      this.tweens.add(
        350,
        (t) => (tile.x = tile.home.x + Math.sin(t * Math.PI * 4) * 6 * (1 - t)),
        () => {
          if (tile.look === 'wrong') tile.setLook('idle');
        },
      );
      return;
    }

    tile.picked = true;
    this.attempt.push(tile);
    tile.setLook('picked');
    this.tweens.add(150, (t) => tile.scale.set(1.2 - 0.2 * t));
    playCorrect(position);
    speak(tile.letter, { rate: 1 });
    this.drawAttempt();

    if (this.attempt.length === this.word.length) {
      this.busy = true;
      this.tweens.delay(220, () => this.completeCopy());
    }
  }

  /** Points out a tile holding the next letter, at the cost of some time. */
  private useHint(): void {
    if (this.phase !== 'playing' || this.busy) return;
    const next = this.word[this.attempt.length];
    const candidates = this.tiles.filter((t) => !t.used && !t.picked && t.letter === next);
    if (candidates.length === 0) return;

    const tile = candidates[Math.floor(Math.random() * candidates.length)];
    tile.setLook('hint');
    this.tweens.add(
      2100,
      (t) => {
        if (tile.look === 'hint') tile.scale.set(1 + 0.15 * Math.abs(Math.sin(t * Math.PI * 3)));
      },
      () => {
        if (tile.look === 'hint') tile.setLook('idle');
      },
    );

    // Never let a hint run the clock out by itself.
    this.timeLeft = Math.max(1000, this.timeLeft - this.level.hintPenalty * 1000);
    this.hints++;
    playHint();
    this.showToast(`-${this.level.hintPenalty} seconds!`, RED);
  }

  // ---- Game logic ----------------------------------------------------------

  /** One copy of the word has been spelled: clear its tiles away. */
  private completeCopy(): void {
    playWordDone();
    this.attempt.forEach((tile, i) => this.dismiss(tile, i * 100));
    this.attempt = [];
    this.completed++;
    this.busy = false;
    this.drawAttempt();
    this.tweens.add(400, (t) => this.drawDots(1 + 0.6 * Math.sin(t * Math.PI)));

    if (this.completed === this.level.copies) {
      this.phase = 'done';
      this.drawTimer();
      this.tweens.delay(400, () => this.endRound(true));
    }
  }

  /** Turtles dive under a ripple, clouds drift up and fade, and meteors are zapped by a laser. */
  private dismiss(tile: SpellerTile, delay: number): void {
    tile.used = true;
    tile.eventMode = 'none';
    const duration = 500;
    const total = delay + duration;
    const theme = this.theme.id;
    let started = false;

    this.tweens.add(
      total,
      (t) => {
        const p = (t * total - delay) / duration;
        if (p <= 0) return;
        if (!started) {
          started = true;
          if (theme === 'tortoise') this.ripple(tile);
          if (theme === 'space') this.laser(tile);
        }
        tile.alpha = 1 - p;
        if (theme === 'cloud') {
          tile.scale.set(1 + 0.3 * p);
          tile.y = tile.home.y - 30 * p;
        } else {
          const swell = theme === 'space' ? 1.4 : 1.1;
          tile.scale.set(p < 0.3 ? 1 + (swell - 1) * (p / 0.3) : swell * (1 - (p - 0.3) / 0.7));
        }
      },
      () => (tile.visible = false),
    );
  }

  private ripple(tile: SpellerTile): void {
    const ring = new Graphics();
    const radius = tile.width / 2;
    this.fxLayer.addChild(ring);
    this.tweens.add(
      800,
      (t) =>
        ring
          .clear()
          .circle(tile.home.x, tile.home.y, radius * (0.4 + 1.6 * t))
          .stroke({ color: 0xbbdefb, width: 4, alpha: 0.7 * (1 - t) }),
      () => ring.destroy(),
    );
  }

  private laser(tile: SpellerTile): void {
    const beam = new Graphics();
    const fromX = Math.random() < 0.5 ? 0 : this.lastSize.width;
    const fromY = this.lastSize.height / 2;
    this.fxLayer.addChild(beam);
    this.tweens.add(
      500,
      (t) => {
        const reach = Math.min(1, t / 0.3);
        beam
          .clear()
          .moveTo(fromX, fromY)
          .lineTo(fromX + (tile.home.x - fromX) * reach, fromY + (tile.home.y - fromY) * reach)
          .stroke({ color: 0xff4dff, width: 4, alpha: t < 0.5 ? 1 : 2 * (1 - t) });
      },
      () => beam.destroy(),
    );
  }

  private endRound(won: boolean): void {
    this.phase = 'done';
    this.drawTimer();
    const isLast = this.roundIndex >= this.rounds.length - 1;

    if (!won) {
      playLose();
      this.showCard({
        title: "Time's Up!",
        message: `You got ${this.completed} of ${this.level.copies}. Keep practising!`,
        stars: 0,
        primary: { label: 'Try Again', onClick: () => this.startRound(this.roundIndex) },
        secondary: { label: 'Levels', onClick: () => this.toLevels() },
      });
      return;
    }

    const stars = starsFor(this.timeLeft / (this.level.seconds * 1000), this.mistakes, this.hints);
    const speedBonus = this.mistakes === 0 && this.hints === 0 && this.elapsed <= SPEED_BONUS_SECONDS * 1000;
    this.results.push({ word: this.word, stars, mistakes: this.mistakes, hints: this.hints, speedBonus });

    if (speedBonus) this.showToast('Speed Bonus!', 0xf9a825);
    if (stars === 3) this.tweens.delay(250, () => this.confetti(speedBonus ? 30 : 60));

    if (isLast) {
      this.tweens.delay(speedBonus ? 800 : 400, () => this.showResults());
      return;
    }

    playWin();
    const mistakes = this.mistakes === 0 ? 'No mistakes!' : this.mistakes === 1 ? '1 mistake' : `${this.mistakes} mistakes`;
    this.showCard({
      title: speedBonus ? 'Speed Bonus!' : 'Brilliant!',
      message: `${STAR_MESSAGES[stars]}  •  ${mistakes}`,
      stars,
      primary: { label: 'Next Word ›', onClick: () => this.startRound(this.roundIndex + 1) },
      secondary: { label: 'Levels', onClick: () => this.toLevels() },
    });
  }

  /** The end-of-game summary, with a line for every word. */
  private showResults(): void {
    const total = this.results.length;
    const perfect = this.results.filter((r) => r.mistakes === 0 && r.hints === 0).length;
    const speedy = this.results.filter((r) => r.speedBonus).length;
    const earned = this.results.reduce((sum, r) => sum + r.stars, 0);
    const best = total * 3;
    const stars = earned >= best ? 3 : earned >= best * 0.6 ? 2 : 1;

    const summary = [`${total} ${total === 1 ? 'word' : 'words'} spelled`];
    if (speedy > 0) summary.push(`${speedy} speed ${speedy === 1 ? 'bonus' : 'bonuses'}`);
    if (perfect > 0) summary.push(`${perfect} perfect`);

    playWin();
    this.showCard({
      title: stars === 3 ? 'List Complete!' : 'Well Done!',
      message: summary.join('  •  '),
      stars,
      rows: this.results.map((r) => ({
        word: r.word,
        stars: r.stars,
        tag: r.speedBonus ? 'Fast!' : r.hints > 0 ? `${r.hints} ${r.hints === 1 ? 'hint' : 'hints'}` : undefined,
        perfect: r.mistakes === 0 && r.hints === 0,
      })),
      primary: { label: 'Play Again', onClick: () => this.scenes.goTo(new SpeedySpellerGame(this.scenes, this.info, this.level)) },
      secondary: { label: 'Levels', onClick: () => this.toLevels() },
    });
    if (stars === 3) this.tweens.delay(600, () => this.confetti(80));
  }

  private showCard(content: Parameters<ResultCard['show']>[0]): void {
    this.card.show(content, this.tweens);
    this.card.layout(this.lastSize.width, this.lastSize.height);
  }

  private showToast(message: string, color: number): void {
    this.tweens.cancel(this.toastTween);
    this.toastText.text = message;
    const w = this.toastText.width + 40;
    this.toastBg.clear().roundRect(-w, -24, w, 48, 24).fill(color);
    this.toastText.x = -w / 2;
    this.toast.visible = true;
    this.toastTween = this.tweens.add(
      1500,
      (t) => (this.toast.alpha = Math.min(1, t / 0.15, (1 - t) / 0.2)),
      () => (this.toast.visible = false),
    );
  }

  private confetti(count: number): void {
    const x = this.lastSize.width / 2;
    const y = this.lastSize.height / 3;
    for (let i = 0; i < count; i++) {
      const piece = new Graphics().rect(-5, -7, 10, 14).fill(CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]);
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 200;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance + 120;
      piece.position.set(x, y);
      this.confettiLayer.addChild(piece);
      this.tweens.add(
        700 + Math.random() * 700,
        (t) => {
          piece.position.set(x + dx * t, y + dy * t * t + (Math.sin(angle) * distance * t * (1 - t)) / 2);
          piece.rotation = t * Math.PI * 4;
          piece.alpha = 1 - t * t;
        },
        () => piece.destroy(),
      );
    }
  }
}
