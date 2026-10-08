import { Container, Graphics, Text } from 'pixi.js';
import { easeOutBack, type Tweens } from '../core/Tweens';
import { Button } from './Button';
import { DARK, FONT_FAMILY } from './theme';

export interface WinOverlayOptions {
  message: string;
  onPlayAgain: () => void;
  onLevels: () => void;
}

/** Full-screen "you won" card with Play Again and Levels buttons. Hidden until `show()`. */
export class WinOverlay extends Container {
  readonly playAgainButton: Button;
  readonly levelsButton: Button;
  private dim = new Graphics();
  private card = new Container();
  private cardBg = new Graphics();
  private text: Text;

  constructor(opts: WinOverlayOptions) {
    super();
    this.text = new Text({
      text: opts.message,
      style: { fontFamily: FONT_FAMILY, fontSize: 44, fontWeight: 'bold', fill: DARK, align: 'center' },
    });
    this.text.anchor.set(0.5);
    this.playAgainButton = new Button({ label: 'Play Again', width: 200, height: 72, color: 0x06d6a0, onClick: opts.onPlayAgain });
    this.levelsButton = new Button({ label: 'Levels', width: 200, height: 72, color: 0x118ab2, onClick: opts.onLevels });

    this.card.addChild(this.cardBg, this.text, this.playAgainButton, this.levelsButton);
    this.addChild(this.dim, this.card);
    this.dim.eventMode = 'static'; // Swallow taps so the game underneath can't be played.
    this.visible = false;
  }

  /** Changes the message; call `layout()` afterwards so the card fits it. */
  setMessage(message: string): void {
    this.text.text = message;
  }

  layout(width: number, height: number): void {
    this.dim.clear().rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0.5 });

    const cardW = Math.min(560, width - 32);
    const gap = 20;
    const buttonW = Math.min(200, (cardW - gap * 3) / 2);
    this.text.scale.set(1);
    this.text.scale.set(Math.min(1, (cardW - gap * 2) / this.text.width));
    const cardH = gap * 2 + this.text.height + gap + 72;

    this.cardBg.clear().roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 28).fill(0xffffff);
    this.text.position.set(0, -cardH / 2 + gap + this.text.height / 2);
    this.playAgainButton.setSize(buttonW, 72);
    this.levelsButton.setSize(buttonW, 72);
    const buttonY = cardH / 2 - gap - 36;
    this.playAgainButton.position.set(-(buttonW + gap) / 2, buttonY);
    this.levelsButton.position.set((buttonW + gap) / 2, buttonY);
    this.card.position.set(width / 2, height / 2);
  }

  show(tweens: Tweens): void {
    this.visible = true;
    this.alpha = 0;
    tweens.add(400, (t) => {
      this.alpha = Math.min(1, t * 2);
      this.card.scale.set(0.6 + 0.4 * easeOutBack(t));
    });
  }
}
