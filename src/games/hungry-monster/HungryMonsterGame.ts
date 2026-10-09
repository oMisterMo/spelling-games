import { Container, Graphics, Text, Ticker } from 'pixi.js';
import { shuffle } from '../../core/random';
import { Scene } from '../../core/Scene';
import type { SceneManager } from '../../core/SceneManager';
import { canSpeak, speak, stopSpeaking } from '../../core/speech';
import { easeOutBack, easeOutCubic, Tweens } from '../../core/Tweens';
import { getWordInfos, getWords, type WordInfo } from '../../data/wordLists';
import { Button } from '../../ui/Button';
import { ClueCard } from '../../ui/ClueCard';
import { DARK, FONT_FAMILY } from '../../ui/theme';
import { Tile, TILE_COLOR } from '../../ui/Tile';
import { WinOverlay } from '../../ui/WinOverlay';
import type { GameInfo } from '../registry';
import { hungryMonsterLevelSelect } from './levelSelect';
import type { HungryMonsterLevel } from './levels';
import { makeChoices, type SpellingChoice } from './misspell';
import { Monster } from './Monster';
import { playMunch, playRight, playWin, playYuck } from './sounds';

const CORRECT_COLOR = 0x06d6a0;
const WRONG_COLOR = 0xef476f;
const PROMPT = 'Feed me the right spelling!';
const YUM = ['Yum!', 'Tasty!', 'Delicious!', 'Mmm!'];

interface Round {
  info: WordInfo;
  choices: SpellingChoice[];
}

/** One spelling on offer. */
class ChoiceCard extends Tile {
  /** Wrong cards stay where they are, crossed off; the right one is eaten. */
  state: 'open' | 'wrong' | 'eaten' = 'open';

  constructor(readonly choice: SpellingChoice) {
    super(choice.text);
    this.cursor = 'pointer';
  }
}

/**
 * Pick the right spelling out of a few look-alikes and feed it to the monster.
 * A wrong spelling is spat out and crossed off, so the right one is always
 * found in the end; the score counts the words found on the first try.
 */
export class HungryMonsterGame extends Scene {
  private tweens = new Tweens();
  private rounds: Round[];
  private roundIndex = 0;
  private cards: ChoiceCard[] = [];
  private homes: { x: number; y: number }[] = [];
  private missed = false;
  private firstTryCount = 0;
  /** True while the monster eats and the next word comes up; input is ignored. */
  private busy = false;
  private lastSize = { width: 0, height: 0 };

  private bg = new Graphics();
  private backButton: Button;
  private progress: Text;
  private clueCard = new ClueCard();
  private monster = new Monster();
  private hearButton: Button;
  private status: Text;
  private cardLayer = new Container();
  private overlay: WinOverlay;

  constructor(scenes: SceneManager, private info: GameInfo, private level: HungryMonsterLevel) {
    super();
    // A wrong spelling must never be a real word from any of the lists.
    const allWords = new Set((['easy', 'medium', 'hard'] as const).flatMap((list) => getWords(list)));
    this.rounds = shuffle(getWordInfos(level.words).filter((w) => w.word.length >= 3 && w.word.length <= 10))
      .map((info) => ({ info, choices: makeChoices(info.word, level.choices, allWords) }))
      .filter((round): round is Round => round.choices !== null)
      .slice(0, level.rounds);

    this.backButton = new Button({
      label: '← Levels',
      width: 170,
      height: 64,
      color: DARK,
      fontSize: 26,
      onClick: () => scenes.goTo(hungryMonsterLevelSelect(scenes, info)),
    });

    const textColor = info.textColor ?? 0xffffff;
    this.progress = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 36, fontWeight: 'bold', fill: textColor } });
    this.progress.anchor.set(1, 0.5);

    this.hearButton = new Button({ label: '🔊', width: 64, height: 64, color: 0xffd166, textColor: DARK, onClick: () => this.sayWord() });

    this.status = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 30, fontWeight: 'bold', fill: textColor, align: 'center' },
    });
    this.status.anchor.set(0.5);

    this.overlay = new WinOverlay({
      message: '',
      onPlayAgain: () => scenes.goTo(new HungryMonsterGame(scenes, info, level)),
      onLevels: () => scenes.goTo(hungryMonsterLevelSelect(scenes, info)),
    });

    const playable = this.rounds.length > 0;
    if (!playable) this.clueCard.setClue('', 'Not enough words!\nAdd some to src/data/wordLists.ts');
    this.monster.visible = playable;
    this.hearButton.visible = playable && canSpeak;

    this.addChild(this.bg, this.backButton, this.progress, this.clueCard, this.monster, this.hearButton, this.status, this.cardLayer, this.overlay);
    if (playable) this.startRound(0);
  }

  onExit(): void {
    stopSpeaking();
  }

  update(ticker: Ticker): void {
    this.tweens.update(ticker.deltaMS);
    this.monster.update(ticker.deltaMS);
  }

  private get word(): string {
    return this.rounds[this.roundIndex]?.info.word ?? '';
  }

  private startRound(index: number): void {
    this.roundIndex = index;
    this.busy = false;
    this.missed = false;
    for (const card of this.cards) card.destroy({ children: true });

    const round = this.rounds[index];
    this.cards = round.choices.map((choice) => {
      const card = new ChoiceCard(choice);
      card.on('pointertap', () => this.choose(card));
      this.cardLayer.addChild(card);
      return card;
    });

    this.status.text = PROMPT;
    this.progress.text = `${index + 1} / ${this.rounds.length}`;
    this.clueCard.setClue(
      this.level.showPictures ? (round.info.picture ?? '') : '',
      this.level.showClues && round.info.clue ? round.info.clue : 'Which one is spelled right?',
    );
    if (this.lastSize.width > 0) this.resize(this.lastSize.width, this.lastSize.height);

    this.cards.forEach((card, i) => {
      const delay = i * 70;
      const total = 250 + delay;
      card.scale.set(0);
      this.tweens.add(total, (t) => card.scale.set(easeOutBack(Math.max(0, (t * total - delay) / 250))));
    });
    this.tweens.delay(400, () => this.sayWord());
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

    // Landscape: the monster on the left, everything else on the right.
    // Portrait: clue, monster, what it says, then the spellings.
    const landscape = width >= 700 && width > height * 1.25;
    const sideW = landscape ? width * 0.36 : 0;
    const x = margin + sideW;
    const w = width - margin - x;
    const centerX = x + w / 2;
    const gap = 12;
    const clueH = Math.max(56, Math.min(140, availH * (landscape ? 0.24 : 0.16)));
    const statusH = Math.max(26, Math.min(44, availH * 0.07));
    const clueW = Math.min(w, 720);

    // The spellings go side by side when they fit, otherwise in one column,
    // or in two columns when a column would make them too thin to tap.
    const count = this.cards.length;
    const longest = Math.max(...this.cards.map((card) => card.choice.text.length));
    const rest = availH - clueH - statusH - gap * (landscape ? 2 : 3);
    const rowCardW = (Math.min(w, 900) - gap * (count - 1)) / count;
    const inRow = rowCardW >= longest * 26 + 40;
    const cardsRoom = landscape ? rest : rest * (inRow ? 0.3 : 0.55);
    const columnTooThin = (cardsRoom - gap * (count - 1)) / count < 44;
    const cols = inRow ? count : columnTooThin && count > 2 ? 2 : 1;
    const rows = Math.ceil(count / cols);
    const cardW = inRow ? Math.min(rowCardW, 300) : cols === 2 ? (Math.min(w, 720) - gap) / 2 : Math.min(w, 520);
    const cardH = Math.max(36, Math.min(88, (cardsRoom - gap * (rows - 1)) / rows));
    const cardsH = rows * cardH + gap * (rows - 1);
    const fontSize = Math.min(cardH * 0.5, (cardW - 24) / (longest * 0.72));

    const button = 64;
    let y = top;
    if (landscape) {
      // The monster with the hear button right under it, centered as a pair.
      const monsterW = sideW - margin;
      const monsterH = Math.min(availH - button - gap * 2, monsterW * 1.17, 300);
      const monsterY = top + (availH - (monsterH + gap + button)) / 2;
      this.monster.layout(margin, monsterY, monsterW, monsterH);
      this.hearButton.position.set(margin + monsterW / 2, monsterY + monsterH + gap + button / 2);
      y += Math.max(0, (rest - cardsH) / 2);
    }

    this.clueCard.layout(centerX - clueW / 2, y, clueW, clueH);
    y += clueH + gap;
    if (!landscape) {
      const monsterH = Math.max(0, rest - cardsH);
      this.monster.layout(x + button + gap, y, w - (button + gap) * 2, monsterH);
      this.hearButton.position.set(x + w - button / 2, y + monsterH / 2);
      y += monsterH + gap;
    }

    this.status.style.fontSize = statusH * 0.75;
    this.status.scale.set(1);
    this.status.scale.set(Math.min(1, w / this.status.width));
    this.status.position.set(centerX, y + statusH / 2);
    y += statusH + gap;

    this.homes = this.cards.map((_, i) => {
      const row = Math.floor(i / cols);
      // A short last row is centered.
      const inThisRow = Math.min(cols, count - row * cols);
      const left = centerX - (inThisRow * cardW + (inThisRow - 1) * gap) / 2;
      return { x: left + (i % cols) * (cardW + gap) + cardW / 2, y: y + row * (cardH + gap) + cardH / 2 };
    });
    this.cards.forEach((card, i) => {
      card.resizeTile(cardW, cardH, fontSize);
      if (card.state !== 'eaten') card.position.set(this.homes[i].x, this.homes[i].y);
    });
  }

  // ---- Game logic ----------------------------------------------------------

  private sayWord(): void {
    // Lowercase, because an all-caps word can be read out as separate letters.
    if (!this.overlay.visible) speak(this.word.toLowerCase());
  }

  private setStatus(text: string): void {
    this.status.text = text;
    this.resize(this.lastSize.width, this.lastSize.height);
  }

  private choose(card: ChoiceCard): void {
    if (this.busy || this.overlay.visible || card.state !== 'open') return;
    if (card.choice.correct) this.feed(card);
    else this.reject(card);
  }

  /** The right spelling flies into the monster's mouth. */
  private feed(card: ChoiceCard): void {
    this.busy = true;
    if (!this.missed) this.firstTryCount++;
    card.state = 'eaten';
    card.setColor(CORRECT_COLOR);
    this.cardLayer.addChild(card);
    for (const other of this.cards) if (other !== card) other.eventMode = 'none';
    this.setStatus(`${YUM[Math.floor(Math.random() * YUM.length)]} ${this.word}`);
    playRight();
    playMunch();
    this.sayWord();

    this.monster.openWide(this.tweens);
    const from = { x: card.x, y: card.y };
    this.tweens.add(
      380,
      (t) => {
        const k = easeOutCubic(t);
        const to = this.monster.mouthPoint;
        card.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
        card.scale.set(1 - 0.85 * k);
        for (const other of this.cards) if (other !== card) other.alpha = Math.min(other.alpha, 1 - 0.7 * k);
      },
      () => {
        card.visible = false;
        this.monster.chew(this.tweens);
      },
    );

    const isLast = this.roundIndex === this.rounds.length - 1;
    this.tweens.delay(1900, () => (isLast ? this.finish() : this.startRound(this.roundIndex + 1)));
  }

  /** A wrong spelling shakes, then stays crossed off. */
  private reject(card: ChoiceCard): void {
    this.missed = true;
    card.state = 'wrong';
    card.eventMode = 'none';
    card.setColor(WRONG_COLOR);
    this.setStatus('Yuck! Try again');
    this.monster.yuck(this.tweens);
    playYuck();

    const index = this.cards.indexOf(card);
    this.tweens.add(400, (t) => (card.x = this.homes[index].x + Math.sin(t * Math.PI * 6) * 8 * (1 - t)));
    this.tweens.delay(450, () => {
      card.setColor(TILE_COLOR);
      card.alpha = 0.3;
    });
  }

  private finish(): void {
    const total = this.rounds.length;
    this.overlay.setMessage(
      this.firstTryCount === total
        ? `Burp! All ${total} words\nright on the first try!`
        : `All full!\n${this.firstTryCount} of ${total} words\nright on the first try`,
    );
    this.overlay.layout(this.lastSize.width, this.lastSize.height);
    this.overlay.show(this.tweens);
    playWin();
  }
}
