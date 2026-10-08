import { Container, Graphics, Text } from 'pixi.js';
import { easeOutBack, type Tweens } from '../../core/Tweens';
import { Button } from '../../ui/Button';
import { DARK, FONT_FAMILY } from '../../ui/theme';

const STAR_ON = 0xfdd835;
const STAR_OFF = 0xe0e0e0;
const ROW_H = 44;
const BUTTON_H = 68;

export interface ResultRow {
  word: string;
  stars: number;
  /** A short note such as "Fast!" or "2 hints". */
  tag?: string;
  /** Spelled with no mistakes or hints. */
  perfect: boolean;
}

export interface ResultAction {
  label: string;
  onClick: () => void;
}

export interface ResultContent {
  title: string;
  message: string;
  /** Stars lit, out of three. */
  stars: number;
  /** One line per word, for the end-of-game summary. */
  rows?: ResultRow[];
  primary: ResultAction;
  secondary: ResultAction;
}

/** Full-screen card with a three-star rating, shown after each word and at the end of the game. Hidden until `show()`. */
export class ResultCard extends Container {
  private dim = new Graphics();
  private card = new Container();
  /** Scaled down when the card is taller than the screen. */
  private fit = new Container();
  private cardBg = new Graphics();
  private title: Text;
  private message: Text;
  private stars: Graphics[] = [];
  private rows: Container[] = [];
  private buttons: Button[] = [];

  constructor() {
    super();
    this.title = new Text({ text: '', style: { fontFamily: FONT_FAMILY, fontSize: 44, fontWeight: 'bold', fill: DARK, align: 'center' } });
    this.title.anchor.set(0.5);
    this.message = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 'bold', fill: 0x6b6f70, align: 'center', wordWrap: true },
    });
    this.message.anchor.set(0.5);
    for (let i = 0; i < 3; i++) this.stars.push(new Graphics());

    this.fit.addChild(this.cardBg, this.title, ...this.stars, this.message);
    this.card.addChild(this.fit);
    this.addChild(this.dim, this.card);
    this.dim.eventMode = 'static'; // Swallow taps so the game underneath can't be played.
    this.visible = false;
  }

  /** Fills in the card and pops it up; call `layout()` afterwards. */
  show(content: ResultContent, tweens: Tweens): void {
    this.title.text = content.title;
    this.message.text = content.message;

    for (const old of [...this.rows, ...this.buttons]) old.destroy({ children: true });
    this.rows = (content.rows ?? []).map((row) => this.makeRow(row));
    this.buttons = [content.primary, content.secondary].map(
      (action, i) => new Button({ label: action.label, width: 200, height: BUTTON_H, color: i === 0 ? 0x06d6a0 : 0x118ab2, onClick: action.onClick }),
    );
    this.fit.addChild(...this.rows, ...this.buttons);

    this.stars.forEach((star, i) => {
      const lit = i < content.stars;
      star.clear().star(0, 0, 5, 30, 14).fill(lit ? STAR_ON : STAR_OFF);
      star.scale.set(lit ? 0 : 1);
      if (lit) tweens.delay(250 + i * 200, () => tweens.add(400, (t) => star.scale.set(easeOutBack(t))));
    });

    this.visible = true;
    this.alpha = 0;
    tweens.add(400, (t) => {
      this.alpha = Math.min(1, t * 2);
      this.card.scale.set(0.6 + 0.4 * easeOutBack(t));
    });
  }

  hide(): void {
    this.visible = false;
  }

  layout(width: number, height: number): void {
    this.dim.clear().rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.6 });

    const cardW = Math.min(520, width - 32);
    const pad = 20;
    const innerW = cardW - pad * 2;
    this.title.scale.set(1);
    this.title.scale.set(Math.min(1, innerW / this.title.width));
    this.message.style.wordWrapWidth = innerW;

    const rowsH = this.rows.length * ROW_H;
    const cardH = pad + this.title.height + 12 + 60 + 12 + this.message.height + (rowsH > 0 ? 12 + rowsH : 0) + pad + BUTTON_H + pad;
    this.cardBg.clear().roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 28).fill(0xffffff);

    let y = -cardH / 2 + pad;
    this.title.position.set(0, y + this.title.height / 2);
    y += this.title.height + 12;
    this.stars.forEach((star, i) => star.position.set((i - 1) * 72, y + 30));
    y += 60 + 12;
    this.message.position.set(0, y + this.message.height / 2);
    y += this.message.height + 12;
    this.rows.forEach((row, i) => {
      this.layoutRow(row, innerW);
      row.position.set(-innerW / 2, y + i * ROW_H);
    });

    const buttonW = (innerW - pad) / 2;
    this.buttons.forEach((button, i) => {
      button.setSize(buttonW, BUTTON_H);
      button.position.set((i === 0 ? -1 : 1) * (buttonW + pad) / 2, cardH / 2 - pad - BUTTON_H / 2);
    });

    this.fit.scale.set(Math.min(1, (height - 32) / cardH));
    this.card.position.set(width / 2, height / 2);
  }

  /** A row is [background, word, stars, tag], with its origin at the top left. */
  private makeRow(row: ResultRow): Container {
    const container = new Container();
    const bg = new Graphics();
    bg.tint = row.perfect ? 0xdff3df : 0xffecd6;
    const word = new Text({ text: row.word, style: { fontFamily: FONT_FAMILY, fontSize: 24, fontWeight: 'bold', fill: DARK } });
    word.anchor.set(0, 0.5);
    const stars = new Graphics();
    for (let i = 0; i < 3; i++) stars.star(i * 26, 0, 5, 11, 5).fill(i < row.stars ? STAR_ON : 0xc8c8c8);
    const tag = new Text({ text: row.tag ?? '', style: { fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: 'bold', fill: 0x8e24aa } });
    tag.anchor.set(1, 0.5);
    container.addChild(bg, word, stars, tag);
    return container;
  }

  private layoutRow(row: Container, width: number): void {
    const [bg, word, stars, tag] = row.children as [Graphics, Text, Graphics, Text];
    const h = ROW_H - 6;
    bg.clear().roundRect(0, 0, width, h, 10).fill(0xffffff);
    tag.position.set(width - 12, h / 2);
    const starsX = width - 12 - (tag.text ? tag.width + 12 : 0) - 63;
    stars.position.set(starsX, h / 2);
    word.scale.set(1);
    word.scale.set(Math.min(1, (starsX - 11 - 24) / word.width));
    word.position.set(12, h / 2);
  }
}
