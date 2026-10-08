import { Container, Graphics, Text } from 'pixi.js';
import { DARK, EMOJI_FONT_FAMILY, FONT_FAMILY } from './theme';

/** A white card with an optional picture (usually an emoji) and a clue that shrinks to fit. */
export class ClueCard extends Container {
  private bg = new Graphics();
  private picture: Text;
  private text: Text;

  constructor() {
    super();
    this.picture = new Text({ text: '', style: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 64 } });
    this.picture.anchor.set(0.5);
    this.text = new Text({
      text: '',
      style: { fontFamily: FONT_FAMILY, fontSize: 30, fontWeight: 'bold', fill: DARK, wordWrap: true, wordWrapWidth: 300 },
    });
    this.addChild(this.bg, this.picture, this.text);
  }

  /** Pass '' for no picture. Call `layout()` afterwards so the text is re-fitted. */
  setClue(picture: string, text: string): void {
    this.picture.text = picture;
    this.text.text = text;
  }

  layout(x: number, y: number, w: number, h: number): void {
    const pad = 12;
    this.position.set(x, y);
    this.bg.clear().roundRect(0, 0, w, h, 20).fill({ color: 0xffffff, alpha: 0.95 });

    let textX = pad * 2;
    if (this.picture.text) {
      const size = Math.min(h * 0.8, w * 0.25);
      this.picture.style.fontSize = size * 0.8;
      this.picture.position.set(pad + size / 2, h / 2);
      textX = pad * 2 + size;
      this.text.anchor.set(0, 0.5);
      this.text.style.align = 'left';
      this.text.position.set(textX, h / 2);
    } else {
      this.text.anchor.set(0.5);
      this.text.style.align = 'center';
      this.text.position.set(w / 2, h / 2);
    }

    this.text.style.wordWrapWidth = Math.max(40, w - textX - pad * 2);
    let fontSize = Math.min(34, h * 0.32);
    this.text.style.fontSize = fontSize;
    while (this.text.height > h - pad * 2 && fontSize > 11) {
      fontSize *= 0.9;
      this.text.style.fontSize = fontSize;
    }
  }
}
